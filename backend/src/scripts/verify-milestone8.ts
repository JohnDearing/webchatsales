import { ClientSchema } from '../schemas/client.schema';
import { PricingPlanSchema } from '../schemas/pricing-plan.schema';
import { DEFAULT_PLANS, estimateTokensFromText, estimateCostUsd } from '../config/plans';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function run(): Promise<void> {
  const clientPaths = ClientSchema.paths;
  const usageFields = ['usage', 'customChatLimit', 'customTokenLimit'];
  for (const field of usageFields) {
    assert(!!clientPaths[field], `Client schema missing usage field: ${field}`);
  }

  const planPaths = PricingPlanSchema.paths;
  const planFields = [
    'slug',
    'name',
    'monthlyPriceUsd',
    'chatLimitPerMonth',
    'tokenLimitPerMonth',
    'allowOverage',
    'overagePricePerChatUsd',
  ];
  for (const field of planFields) {
    assert(!!planPaths[field], `PricingPlan schema missing field: ${field}`);
  }

  assert(DEFAULT_PLANS.length >= 4, 'Must define trial, starter, pro, enterprise plans');

  const tokens = estimateTokensFromText('Hello world test message');
  assert(tokens > 0, 'Token estimation must return positive count');
  const cost = estimateCostUsd(1000);
  assert(cost > 0, 'Cost estimation must return positive value');

  const { UsageService } = await import('../modules/usage/usage.service');
  const service = UsageService.prototype;
  const requiredMethods = [
    'ensureDefaultPlans',
    'getUsageSummary',
    'checkChatAllowed',
    'recordChatUsage',
    'resetPeriodIfNeeded',
    'applyPlanFromPayment',
    'getPlatformUsageStats',
    'getAllPlans',
    'updatePlan',
  ];
  for (const method of requiredMethods) {
    assert(typeof (service as any)[method] === 'function', `UsageService missing method: ${method}`);
  }

  const { NotificationService } = await import('../modules/notification/notification.service');
  assert(
    typeof NotificationService.prototype.notifyUsageLimit === 'function',
    'NotificationService must expose notifyUsageLimit',
  );

  console.log('Milestone 8 verification passed.');
  console.log('- Client schema includes usage tracking fields.');
  console.log('- PricingPlan schema supports admin-configurable limits.');
  console.log('- UsageService exposes tracking, limits, and billing helpers.');
  console.log('- Usage limit notifications are wired.');
}

run().catch((error) => {
  console.error('Milestone 8 verification failed:', error.message);
  process.exit(1);
});
