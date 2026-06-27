import { z } from 'zod';

/**
 * Signal direction: `risk` feeds the bad-triage (churn rescue) board,
 * `opportunity` feeds the upsell/renewal board.
 */
export const signalDirectionSchema = z.enum(['risk', 'opportunity']);
export type SignalDirection = z.infer<typeof signalDirectionSchema>;

/** Severity buckets, ordered by impact. */
export const signalSeveritySchema = z.enum(['major', 'medium', 'minor']);
export type SignalSeverity = z.infer<typeof signalSeveritySchema>;

/** Numeric weight per severity, used to compute an account score. */
export const SEVERITY_WEIGHT: Record<SignalSeverity, number> = {
  major: 10,
  medium: 5,
  minor: 2,
};

export const signalTypeSchema = z.enum([
  // risk
  'stripe_cancellation',
  'usage_drop',
  'negative_support_ticket',
  // opportunity
  'usage_near_limit',
  'renewal_approaching',
  'positive_support_ticket',
]);
export type SignalType = z.infer<typeof signalTypeSchema>;

/** Default classification for each known signal type. */
export const SIGNAL_CATALOG: Record<
  SignalType,
  { direction: SignalDirection; severity: SignalSeverity }
> = {
  stripe_cancellation: { direction: 'risk', severity: 'major' },
  usage_drop: { direction: 'risk', severity: 'medium' },
  negative_support_ticket: { direction: 'risk', severity: 'minor' },
  usage_near_limit: { direction: 'opportunity', severity: 'major' },
  renewal_approaching: { direction: 'opportunity', severity: 'medium' },
  positive_support_ticket: { direction: 'opportunity', severity: 'minor' },
};

export const signalSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  type: signalTypeSchema,
  direction: signalDirectionSchema,
  severity: signalSeveritySchema,
  /** Free-form source payload (Stripe event, ticket id, usage metric, ...). */
  metadata: z.record(z.unknown()).default({}),
  detectedAt: z.string().datetime(),
});
export type Signal = z.infer<typeof signalSchema>;
