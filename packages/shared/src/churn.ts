import { z } from 'zod';

/** Where a churn signal originated. */
export const signalSourceSchema = z.enum(['stripe', 'usage', 'support', 'mubit', 'manual']);
export type SignalSource = z.infer<typeof signalSourceSchema>;

/** Known churn signal types (extend as new sources are integrated). */
export const churnSignalTypeSchema = z.enum([
  'stripe_cancellation', // Stripe subscription cancelled -> instant red
  'usage_drop', // low usage on the (mock B2B) app, value = drop %
  'support_ticket', // customer opened a support ticket
]);
export type ChurnSignalType = z.infer<typeof churnSignalTypeSchema>;

export const churnStatusSchema = z.enum(['red', 'amber', 'green']);
export type ChurnStatus = z.infer<typeof churnStatusSchema>;

/** A single signal fed into the churn engine. */
export interface ChurnSignalInput {
  type: ChurnSignalType;
  /** Whether the signal is currently in effect (e.g. cancellation not reversed). */
  active: boolean;
  /** Optional magnitude, e.g. usage drop percentage (0-100). */
  value?: number | null;
}

export interface ChurnResult {
  score: number; // 0-100
  status: ChurnStatus;
  reason: string;
}

/**
 * Per-signal contribution to the churn score. Tune these as more sources come
 * online. Stripe cancellation is handled as a hard short-circuit below.
 */
export const CHURN_WEIGHTS = {
  usage_drop_multiplier: 0.6, // score += usage_drop_% * 0.6
  support_ticket: 15, // score += 15 per open support ticket
} as const;

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/** Map a 0-100 score to a colour. >40 red, 10-40 amber, <10 green. */
export function churnStatusForScore(score: number): ChurnStatus {
  if (score > 40) return 'red';
  if (score >= 10) return 'amber';
  return 'green';
}

/**
 * Compute a company's churn score from its active signals.
 *
 * Phase 1 is Stripe-first: an active cancellation forces an instant red. Usage
 * and support contributions are already wired so additional sources (incl. the
 * Mubit sponsor) can be layered in by adjusting CHURN_WEIGHTS.
 */
export function computeChurn(signals: ChurnSignalInput[]): ChurnResult {
  const active = signals.filter((s) => s.active);

  if (active.some((s) => s.type === 'stripe_cancellation')) {
    return { score: 100, status: 'red', reason: 'Stripe subscription cancelled' };
  }

  let score = 0;
  const reasons: string[] = [];

  const usage = active.filter((s) => s.type === 'usage_drop');
  if (usage.length > 0) {
    const maxDrop = Math.max(...usage.map((s) => s.value ?? 0));
    const contribution = maxDrop * CHURN_WEIGHTS.usage_drop_multiplier;
    if (contribution > 0) {
      score += contribution;
      reasons.push(`Usage down ${Math.round(maxDrop)}%`);
    }
  }

  const tickets = active.filter((s) => s.type === 'support_ticket').length;
  if (tickets > 0) {
    score += tickets * CHURN_WEIGHTS.support_ticket;
    reasons.push(`${tickets} open support ticket${tickets > 1 ? 's' : ''}`);
  }

  score = clamp(score);
  return {
    score,
    status: churnStatusForScore(score),
    reason: reasons.join('; ') || 'No active risk signals',
  };
}
