import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Client, ClientDocument } from '../../schemas/client.schema';
import {
  Conversation,
  ConversationDocument,
} from '../../schemas/conversation.schema';
import {
  PricingPlan,
  PricingPlanDocument,
} from '../../schemas/pricing-plan.schema';
import {
  DEFAULT_PLANS,
  PAYMENT_PLAN_TYPE_MAP,
  PLAN_UPGRADE_ORDER,
  estimateTokensFromText,
  estimateCostUsd,
} from '../../config/plans';

export interface UsageLimits {
  chatLimit: number;
  tokenLimit: number;
  allowOverage: boolean;
  overagePricePerChatUsd: number;
}

export interface UsageSummary {
  clientId: string;
  plan: string;
  planName: string;
  periodStart: Date;
  periodEnd: Date;
  chatsUsed: number;
  chatLimit: number;
  chatPercent: number;
  tokensUsed: number;
  tokenLimit: number;
  tokenPercent: number;
  estimatedCostUsd: number;
  overageChats: number;
  pendingOverageAmountUsd: number;
  planExpiresAt?: Date;
  isOverChatLimit: boolean;
  isOverTokenLimit: boolean;
  isPlatformTenant: boolean;
}

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  isOverage?: boolean;
  summary: UsageSummary;
}

@Injectable()
export class UsageService {
  constructor(
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
    @InjectModel(PricingPlan.name)
    private pricingPlanModel: Model<PricingPlanDocument>,
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
  ) {}

  /** Seed default plans if collection is empty */
  async ensureDefaultPlans(): Promise<void> {
    const count = await this.pricingPlanModel.countDocuments().exec();
    if (count > 0) return;

    await this.pricingPlanModel.insertMany([...DEFAULT_PLANS]);
    console.log('[UsageService] ✅ Seeded default pricing plans');
  }

  async getAllPlans(includeInactive = false): Promise<PricingPlanDocument[]> {
    await this.ensureDefaultPlans();
    const filter = includeInactive ? {} : { isActive: true };
    return this.pricingPlanModel.find(filter).sort({ sortOrder: 1 }).exec();
  }

  async getPlanBySlug(slug: string): Promise<PricingPlanDocument | null> {
    await this.ensureDefaultPlans();
    return this.pricingPlanModel.findOne({ slug }).exec();
  }

  async createPlan(data: Partial<PricingPlan>): Promise<PricingPlanDocument> {
    const plan = new this.pricingPlanModel(data);
    return plan.save();
  }

  async updatePlan(
    slug: string,
    data: Partial<PricingPlan>,
  ): Promise<PricingPlanDocument> {
    const plan = await this.pricingPlanModel
      .findOneAndUpdate({ slug }, { $set: data }, { new: true })
      .exec();
    if (!plan) throw new NotFoundException(`Plan not found: ${slug}`);
    return plan;
  }

  private getPeriodEnd(periodStart: Date): Date {
    const end = new Date(periodStart);
    end.setMonth(end.getMonth() + 1);
    return end;
  }

  /** Calendar-month billing — period starts on the 1st of each month */
  private getCurrentMonthStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  private async ensureCalendarMonthPeriod(clientId: string): Promise<void> {
    const client = await this.clientModel.findById(clientId).exec();
    if (!client) return;

    const monthStart = this.getCurrentMonthStart();
    const usage = client.usage || ({} as any);
    const periodStart = usage.periodStart
      ? new Date(usage.periodStart)
      : null;

    if (!periodStart || periodStart > monthStart) {
      await this.clientModel
        .findByIdAndUpdate(clientId, {
          $set: { 'usage.periodStart': monthStart },
        })
        .exec();
    }
  }

  private async resolveLimits(client: ClientDocument): Promise<UsageLimits> {
    const plan = await this.getPlanBySlug(client.plan || 'trial');
    return {
      chatLimit: client.customChatLimit ?? plan?.chatLimitPerMonth ?? 100,
      tokenLimit: client.customTokenLimit ?? plan?.tokenLimitPerMonth ?? 100_000,
      allowOverage: plan?.allowOverage ?? false,
      overagePricePerChatUsd: plan?.overagePricePerChatUsd ?? 0,
    };
  }

  /** Reset usage if billing period has elapsed */
  async resetPeriodIfNeeded(clientId: string): Promise<ClientDocument | null> {
    const client = await this.clientModel.findById(clientId).exec();
    if (!client) return null;

    const usage = client.usage || ({} as any);
    const periodStart = usage.periodStart ? new Date(usage.periodStart) : new Date();
    const periodEnd = this.getPeriodEnd(periodStart);
    const now = new Date();

    if (now < periodEnd) return client;

    // Bill pending overage before reset
    const overageChats = usage.overageChats || 0;
    const pendingOverage = usage.pendingOverageAmountUsd || 0;

    client.usage = {
      periodStart: now,
      chatsUsed: 0,
      tokensUsed: 0,
      estimatedCostUsd: 0,
      overageChats: 0,
      lastResetAt: now,
      limitWarningSent: false,
      limitReachedSent: false,
      pendingOverageAmountUsd: 0,
    };
    await client.save();

    if (overageChats > 0 || pendingOverage > 0) {
      console.log(
        `[UsageService] Monthly reset for ${clientId}: overage ${overageChats} chats ($${pendingOverage.toFixed(2)})`,
      );
    }

    return client;
  }

  /**
   * Derive usage from stored conversation messages for the current billing period.
   * Throttled — full scan at most once every 15 minutes per client.
   */
  async reconcileUsageFromConversations(clientId: string): Promise<void> {
    const client = await this.clientModel.findById(clientId).exec();
    if (!client) return;

    const usage = client.usage || ({} as any);
    const now = Date.now();
    if (usage.lastReconciledAt) {
      const ageMs = now - new Date(usage.lastReconciledAt).getTime();
      if (ageMs < 15 * 60 * 1000) {
        return;
      }
    }

    const periodStart = usage.periodStart
      ? new Date(usage.periodStart)
      : this.getCurrentMonthStart();

    const conversations = await this.conversationModel
      .find({ clientId: client._id })
      .select('messages createdAt')
      .exec();

    let chatsFromHistory = 0;
    let tokensFromHistory = 0;

    for (const conversation of conversations) {
      const conv = conversation as ConversationDocument & { createdAt?: Date };
      const fallbackTs = conv.createdAt ? new Date(conv.createdAt) : periodStart;

      for (const message of conversation.messages || []) {
        const ts = message.timestamp
          ? new Date(message.timestamp)
          : fallbackTs;
        if (ts < periodStart) continue;

        if (message.role === 'user') {
          chatsFromHistory += 1;
        }
        if (message.role === 'user' || message.role === 'assistant') {
          tokensFromHistory += estimateTokensFromText(message.content || '');
        }
      }
    }

    const storedChats = usage.chatsUsed || 0;
    const storedTokens = usage.tokensUsed || 0;
    const nextChats = Math.max(storedChats, chatsFromHistory);
    const nextTokens = Math.max(storedTokens, tokensFromHistory);

    const update: Record<string, unknown> = {
      'usage.lastReconciledAt': new Date(),
    };

    if (nextChats !== storedChats || nextTokens !== storedTokens) {
      update['usage.chatsUsed'] = nextChats;
      update['usage.tokensUsed'] = nextTokens;
      update['usage.estimatedCostUsd'] = estimateCostUsd(nextTokens);
    }

    await this.clientModel
      .findByIdAndUpdate(clientId, { $set: update })
      .exec();
  }

  async getUsageSummary(clientId: string): Promise<UsageSummary> {
    await this.resetPeriodIfNeeded(clientId);
    await this.ensureCalendarMonthPeriod(clientId);
    await this.reconcileUsageFromConversations(clientId);

    const client = await this.clientModel.findById(clientId).exec();
    if (!client) throw new NotFoundException(`Client not found: ${clientId}`);

    const limits = await this.resolveLimits(client);
    const plan = await this.getPlanBySlug(client.plan || 'trial');
    const usage = client.usage || ({} as any);
    const periodStart = usage.periodStart
      ? new Date(usage.periodStart)
      : new Date();
    const chatsUsed = usage.chatsUsed || 0;
    const tokensUsed = usage.tokensUsed || 0;

    const chatPercent =
      limits.chatLimit > 0
        ? Math.min(100, Math.round((chatsUsed / limits.chatLimit) * 100))
        : 0;
    const tokenPercent =
      limits.tokenLimit > 0
        ? Math.min(100, Math.round((tokensUsed / limits.tokenLimit) * 100))
        : 0;

    return {
      clientId: client._id.toString(),
      plan: client.plan || 'trial',
      planName: plan?.name || client.plan || 'trial',
      periodStart,
      periodEnd: this.getPeriodEnd(periodStart),
      chatsUsed,
      chatLimit: limits.chatLimit,
      chatPercent,
      tokensUsed,
      tokenLimit: limits.tokenLimit,
      tokenPercent,
      estimatedCostUsd: usage.estimatedCostUsd || 0,
      overageChats: usage.overageChats || 0,
      pendingOverageAmountUsd: usage.pendingOverageAmountUsd || 0,
      planExpiresAt: client.planExpiresAt,
      isOverChatLimit: chatsUsed >= limits.chatLimit,
      isOverTokenLimit: tokensUsed >= limits.tokenLimit,
      isPlatformTenant: !!client.isPlatformTenant,
    };
  }

  async checkChatAllowed(clientId: string): Promise<LimitCheckResult> {
    const client = await this.clientModel.findById(clientId).exec();
    if (!client) throw new NotFoundException(`Client not found: ${clientId}`);

    if (client.isPlatformTenant) {
      const summary = await this.getUsageSummary(clientId);
      return { allowed: true, summary };
    }

    await this.resetPeriodIfNeeded(clientId);
    const summary = await this.getUsageSummary(clientId);

    if (client.planExpiresAt && new Date() > new Date(client.planExpiresAt)) {
      return {
        allowed: false,
        reason:
          'Your plan has expired. Please upgrade to continue using Abby.',
        summary,
      };
    }

    const limits = await this.resolveLimits(client);

    if (summary.tokensUsed >= limits.tokenLimit) {
      return {
        allowed: false,
        reason:
          'Monthly token limit reached. Please upgrade your plan or wait until the next billing period.',
        summary,
      };
    }

    if (summary.chatsUsed >= limits.chatLimit) {
      if (limits.allowOverage) {
        return { allowed: true, isOverage: true, summary };
      }
      return {
        allowed: false,
        reason:
          'Monthly chat limit reached. Please upgrade your plan to continue chatting with Abby.',
        summary,
      };
    }

    return { allowed: true, summary };
  }

  async recordChatUsage(
    clientId: string,
    inputText: string,
    outputText: string,
    isOverage = false,
  ): Promise<UsageSummary> {
    const inputTokens = estimateTokensFromText(inputText);
    const outputTokens = estimateTokensFromText(outputText);
    const totalTokens = inputTokens + outputTokens;
    const costDelta = estimateCostUsd(totalTokens);

    const client = await this.clientModel.findById(clientId).exec();
    if (!client) {
      throw new NotFoundException(`Client not found: ${clientId}`);
    }

    // Platform tenant: track usage/cost but never bill overage
    const limits = await this.resolveLimits(client);
    const update: Record<string, any> = {
      $inc: {
        'usage.chatsUsed': 1,
        'usage.tokensUsed': totalTokens,
        'usage.estimatedCostUsd': costDelta,
      },
    };

    if (isOverage && !client.isPlatformTenant) {
      update.$inc['usage.overageChats'] = 1;
      update.$inc['usage.pendingOverageAmountUsd'] =
        limits.overagePricePerChatUsd;
    }

    await this.clientModel.findByIdAndUpdate(clientId, update).exec();
    return this.getUsageSummary(clientId);
  }

  async applyPlanFromPayment(
    clientId: string,
    planType: string,
  ): Promise<ClientDocument | null> {
    const planSlug = PAYMENT_PLAN_TYPE_MAP[planType] || planType || 'starter';
    const plan = await this.getPlanBySlug(planSlug);
    if (!plan) {
      console.warn(`[UsageService] Unknown plan type: ${planType}`);
      return null;
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const client = await this.clientModel
      .findByIdAndUpdate(
        clientId,
        {
          $set: {
            plan: planSlug,
            planExpiresAt: expiresAt,
            'usage.periodStart': now,
            'usage.chatsUsed': 0,
            'usage.tokensUsed': 0,
            'usage.estimatedCostUsd': 0,
            'usage.overageChats': 0,
            'usage.pendingOverageAmountUsd': 0,
            'usage.lastResetAt': now,
            'usage.limitWarningSent': false,
            'usage.limitReachedSent': false,
          },
        },
        { new: true },
      )
      .exec();

    console.log(
      `[UsageService] ✅ Applied plan "${planSlug}" to client ${clientId}`,
    );
    return client;
  }

  async upgradePlan(clientId: string, newPlanSlug: string): Promise<ClientDocument> {
    const plan = await this.getPlanBySlug(newPlanSlug);
    if (!plan) throw new NotFoundException(`Plan not found: ${newPlanSlug}`);

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const client = await this.clientModel
      .findByIdAndUpdate(
        clientId,
        {
          $set: {
            plan: newPlanSlug,
            planExpiresAt: expiresAt,
          },
        },
        { new: true },
      )
      .exec();

    if (!client) throw new NotFoundException(`Client not found: ${clientId}`);
    return client;
  }

  /** Suggest next plan tier for auto-upgrade */
  getNextPlanSlug(currentSlug: string): string | null {
    const idx = PLAN_UPGRADE_ORDER.indexOf(currentSlug);
    if (idx < 0 || idx >= PLAN_UPGRADE_ORDER.length - 1) return null;
    return PLAN_UPGRADE_ORDER[idx + 1];
  }

  async getPlatformUsageStats(): Promise<{
    totalClients: number;
    totalChatsThisMonth: number;
    totalTokensThisMonth: number;
    totalEstimatedCostUsd: number;
    clientsOverLimit: number;
    byPlan: Array<{ plan: string; count: number; chatsUsed: number }>;
  }> {
    const [clients, plans] = await Promise.all([
      this.clientModel
        .find({ isPlatformTenant: { $ne: true } })
        .select('plan usage customChatLimit customTokenLimit')
        .lean()
        .exec(),
      this.getAllPlans(),
    ]);

    const planMap = new Map(plans.map((p) => [p.slug, p]));

    let totalChats = 0;
    let totalTokens = 0;
    let totalCost = 0;
    let clientsOverLimit = 0;
    const byPlanMap = new Map<string, { count: number; chatsUsed: number }>();

    for (const client of clients) {
      const usage = (client as any).usage || {};
      const chats = usage.chatsUsed || 0;
      const tokens = usage.tokensUsed || 0;
      totalChats += chats;
      totalTokens += tokens;
      totalCost += usage.estimatedCostUsd || 0;

      const planSlug = client.plan || 'trial';
      const plan = planMap.get(planSlug);
      const chatLimit =
        client.customChatLimit ?? plan?.chatLimitPerMonth ?? 100;
      const tokenLimit =
        client.customTokenLimit ?? plan?.tokenLimitPerMonth ?? 100_000;
      if (chats >= chatLimit || tokens >= tokenLimit) {
        clientsOverLimit += 1;
      }

      const entry = byPlanMap.get(planSlug) || { count: 0, chatsUsed: 0 };
      entry.count += 1;
      entry.chatsUsed += chats;
      byPlanMap.set(planSlug, entry);
    }

    return {
      totalClients: clients.length,
      totalChatsThisMonth: totalChats,
      totalTokensThisMonth: totalTokens,
      totalEstimatedCostUsd: Math.round(totalCost * 100) / 100,
      clientsOverLimit,
      byPlan: Array.from(byPlanMap.entries()).map(([plan, data]) => ({
        plan,
        ...data,
      })),
    };
  }

  async markLimitNotificationSent(
    clientId: string,
    type: 'warning' | 'reached',
  ): Promise<void> {
    const field =
      type === 'warning' ? 'usage.limitWarningSent' : 'usage.limitReachedSent';
    await this.clientModel
      .findByIdAndUpdate(clientId, { $set: { [field]: true } })
      .exec();
  }

  shouldSendLimitWarning(client: ClientDocument, chatPercent: number): boolean {
    const usage = client.usage || ({} as any);
    return chatPercent >= 80 && chatPercent < 100 && !usage.limitWarningSent;
  }

  shouldSendLimitReached(client: ClientDocument, chatPercent: number): boolean {
    const usage = client.usage || ({} as any);
    return chatPercent >= 100 && !usage.limitReachedSent;
  }
}
