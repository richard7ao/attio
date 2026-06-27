import type { AccountBrief, AccountContext } from '@attio/shared';

const DRIVER_LABEL: Record<string, string> = {
  stripe_cancellation: 'Stripe subscription cancelled',
  usage_drop: 'Significant usage drop',
  support_ticket: 'Open support ticket(s)',
};

const DRIVER_PLAY: Record<string, string> = {
  stripe_cancellation:
    'Immediate retention call from the CSM; offer a win-back incentive before access lapses.',
  usage_drop: 'Book a usage review / enablement session to re-drive adoption.',
  support_ticket: 'Resolve open tickets and follow up within 24h to rebuild trust.',
};

const money = (n: number | null) => (n == null ? 'n/a' : `$${Math.round(n).toLocaleString()}`);

/**
 * Deterministic brief assembled from account data. Used when the Mubit +
 * Superlink LLM path is not configured/verified, so the escalation columns are
 * always populated.
 */
export function fallbackBrief(ctx: AccountContext): AccountBrief {
  const name = ctx.name ?? ctx.companyId.slice(0, 8);
  const drivers = ctx.activeSignals.map((s) => DRIVER_LABEL[s.type] ?? s.type);
  const topDriver = ctx.activeSignals[0]?.type;
  const arrAtRisk = ctx.arr ?? ctx.contractValue;

  return {
    summary:
      `${name} is ${ctx.churnStatus.toUpperCase()} (churn score ${Math.round(ctx.churnScore)}). ` +
      `${ctx.churnReason ?? 'No active risk signals'}. ` +
      `CS stage: ${ctx.csStage ?? 'n/a'}, health: ${ctx.csHealth ?? 'n/a'}, ARR: ${money(ctx.arr)}.`,
    churnDrivers: drivers.length > 0 ? drivers.join('; ') : 'No active risk signals',
    recommendedPlay: topDriver
      ? (DRIVER_PLAY[topDriver] ?? 'Review the account and decide on a retention play.')
      : 'Monitor; no action required.',
    arrAtRisk,
    source: 'fallback',
  };
}
