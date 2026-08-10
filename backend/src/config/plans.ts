/** Default plan definitions — seeded into DB; admin can override via dashboard. */
export const DEFAULT_PLANS = [
  {
    slug: 'trial',
    name: 'Trial',
    monthlyPriceUsd: 0,
    chatLimitPerMonth: 100,
    tokenLimitPerMonth: 100_000,
    allowOverage: false,
    overagePricePerChatUsd: 0,
    sortOrder: 0,
    description: '14-day trial with limited chats',
  },
  {
    slug: 'starter',
    name: 'Starter',
    monthlyPriceUsd: 97,
    chatLimitPerMonth: 2000,
    tokenLimitPerMonth: 2_000_000,
    allowOverage: true,
    overagePricePerChatUsd: 0.25,
    sortOrder: 1,
    description: 'Abby Solo — ideal for small businesses',
  },
  {
    slug: 'pro',
    name: 'Pro',
    monthlyPriceUsd: 197,
    chatLimitPerMonth: 8000,
    tokenLimitPerMonth: 8_000_000,
    allowOverage: true,
    overagePricePerChatUsd: 0.15,
    sortOrder: 2,
    description: 'Higher volume with priority support',
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    monthlyPriceUsd: 497,
    chatLimitPerMonth: 50000,
    tokenLimitPerMonth: 50_000_000,
    allowOverage: true,
    overagePricePerChatUsd: 0.1,
    sortOrder: 3,
    description: 'Unlimited scale for agencies and high-traffic sites',
  },
] as const;

/** gpt-4o-mini approximate blended cost per 1K tokens (input + output average) */
export const OPENAI_COST_PER_1K_TOKENS = 0.0004;

/** Map payment planType strings to plan slugs */
export const PAYMENT_PLAN_TYPE_MAP: Record<string, string> = {
  trial: 'trial',
  starter: 'starter',
  founder_special: 'starter',
  monthly: 'starter',
  annual: 'starter',
  pro: 'pro',
  enterprise: 'enterprise',
};

/** Plan upgrade order for automatic upgrades */
export const PLAN_UPGRADE_ORDER = ['trial', 'starter', 'pro', 'enterprise'];

export function estimateTokensFromText(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

export function estimateCostUsd(tokens: number): number {
  return Math.round((tokens / 1000) * OPENAI_COST_PER_1K_TOKENS * 10000) / 10000;
}
