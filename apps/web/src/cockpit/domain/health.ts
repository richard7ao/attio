import {
  SEVERITY_WEIGHT,
  SIGNAL_CATALOG,
  type SignalDirection,
  type SignalSeverity,
  type SignalType,
} from '@attio/shared';

/**
 * Health derivation for the cockpit. The RAG tier of an account is derived
 * from its signals, never set by hand: a major risk (or a risk score >= 7)
 * turns it Red, a smaller risk holds it Amber, and only opportunities (or no
 * signals) keep it Green. Direction, severity and weight all come straight
 * from the shared domain contract (`SIGNAL_CATALOG` + `SEVERITY_WEIGHT`), so
 * the UI and the backend agree on what every signal means.
 */

export type HealthTier = 'red' | 'amber' | 'green';
/** A board lane — the three health tiers plus the manual "pending" lane. */
export type BoardTier = HealthTier | 'pending';

export function signalDirection(type: SignalType): SignalDirection {
  return SIGNAL_CATALOG[type].direction;
}

export function signalSeverity(type: SignalType): SignalSeverity {
  return SIGNAL_CATALOG[type].severity;
}

export function signalWeight(type: SignalType): number {
  return SEVERITY_WEIGHT[signalSeverity(type)];
}

/** Derive the RAG health tier from a set of signal types. */
export function deriveHealth(types: readonly SignalType[]): HealthTier {
  let risk = 0;
  let major = false;
  for (const type of types) {
    if (signalDirection(type) !== 'risk') continue;
    risk += signalWeight(type);
    if (signalSeverity(type) === 'major') major = true;
  }
  if (major || risk >= 7) return 'red';
  if (risk >= 2) return 'amber';
  return 'green';
}

export const HEALTH_LABEL: Record<BoardTier, string> = {
  red: 'Churn Risk',
  amber: 'Investigate',
  green: 'Healthy',
  pending: 'Pending - Monitoring',
};

/** How a detected signal surfaces in the comms timeline. */
export const SIGNAL_TIMELINE: Record<
  SignalType,
  { channel: string; title: string; actor: string }
> = {
  stripe_cancellation: { channel: 'attio', title: 'Stripe: downgrade detected', actor: 'Stripe · webhook' },
  usage_drop: { channel: 'note', title: 'Usage anomaly detected', actor: 'Signals engine' },
  negative_support_ticket: { channel: 'ticket', title: 'Support escalation', actor: 'Support' },
  usage_near_limit: { channel: 'note', title: 'Seat capacity alert', actor: 'Signals engine' },
  renewal_approaching: { channel: 'note', title: 'Renewal window opened', actor: 'Signals engine' },
  positive_support_ticket: { channel: 'ticket', title: 'Positive support signal', actor: 'Support' },
};
