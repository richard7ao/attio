import { type SignalType } from '@attio/shared';
import { type HealthTier } from '../domain/health.js';
import { type AccountInput, type FeedIntent, type FeedSeed } from '../domain/types.js';

/** Churn dashboard row — GET /api/companies/churn and /api/triage/risk. */
export interface ChurnRow {
  companyId: string;
  name: string;
  score: number;
  status: HealthTier;
  reason: string | null;
  escalationId?: string;
  acked?: boolean;
  briefSummary?: string | null;
  briefRecommendedPlay?: string | null;
  briefArrAtRisk?: number | null;
}

/** Upsell row — GET /api/triage/opportunity. */
export interface OpportunityRow {
  companyId: string;
  name: string;
  status: string;
  stage: string | null;
  health: string | null;
  arr: number | null;
  contractValue: number | null;
  value: number | null;
}

/** Escalation row — GET /api/escalations. */
export interface EscalationRow {
  id: string;
  companyId: string;
  status: HealthTier;
  score: number;
  reason: string | null;
  acked: boolean;
  briefSummary?: string | null;
  briefRecommendedPlay?: string | null;
  briefArrAtRisk?: number | null;
  createdAt: string;
}

/**
 * Pick a representative signal type for a server-derived health status so the
 * single live signal reproduces the same RAG tier through `deriveHealth`, and
 * its catalog direction matches the dashboards.
 *
 * TODO(api): replace once the backend exposes per-account signal rows
 * (GET /api/accounts/:id/signals) instead of a rolled-up churn status.
 */
function signalForStatus(status: HealthTier, reason: string | null): SignalType {
  const r = (reason ?? '').toLowerCase();
  if (status === 'red') return r.includes('stripe') || r.includes('cancel') ? 'stripe_cancellation' : 'usage_drop';
  if (status === 'amber') return 'usage_drop';
  return r.includes('renew') ? 'renewal_approaching' : 'usage_near_limit';
}

/**
 * Deterministically synthesize the rich account fields the current API does
 * not return (seats, 12-week usage trend, primary contact). These are clearly
 * derived placeholders so the cockpit renders completely against live data.
 *
 * TODO(api): drop these once accounts expose seats/usage/contacts directly.
 */
function deriveSeatsAndUsage(arr: number, status: HealthTier): { seats: number; seatsUsed: number; usage: number[] } {
  const seats = Math.max(10, Math.round(arr / 1200));
  const fillByTier = { red: 0.62, amber: 0.78, green: 0.93 } as const;
  const seatsUsed = Math.min(seats, Math.round(seats * fillByTier[status]));
  const shape =
    status === 'red'
      ? [1.0, 0.97, 0.92, 0.86, 0.79, 0.72, 0.68, 0.64, 0.62, 0.61, 0.6, 0.6]
      : status === 'green'
        ? [0.6, 0.66, 0.72, 0.78, 0.83, 0.87, 0.9, 0.92, 0.94, 0.96, 0.98, 1.0]
        : [0.92, 0.95, 0.98, 1.0, 0.99, 0.98, 0.99, 0.98, 0.99, 0.98, 0.99, 0.98];
  const usage = shape.map((f) => Math.round(seatsUsed * f));
  return { seats, seatsUsed, usage };
}

function renewalDaysFrom(value: number | null | undefined): number {
  if (value == null) return 90;
  return Math.max(1, Math.round(value));
}

/**
 * Merge the live dashboards into account inputs. `churn` carries health/reason;
 * `opportunity` contributes ARR and (when present) a positive renewal signal.
 */
export function mapLiveAccounts(churn: ChurnRow[], opportunity: OpportunityRow[]): AccountInput[] {
  const oppById = new Map(opportunity.map((o) => [o.companyId, o]));
  const seen = new Set<string>();
  const inputs: AccountInput[] = [];

  const push = (companyId: string, name: string | null, status: HealthTier, reason: string | null, arr: number) => {
    if (seen.has(companyId)) return;
    seen.add(companyId);
    const { seats, seatsUsed, usage } = deriveSeatsAndUsage(arr, status);
    const opp = oppById.get(companyId);
    const safeName = name ?? 'Unknown';
    const slug = safeName.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'account';
    inputs.push({
      id: companyId,
      name: safeName,
      domain: companyId.includes('.') ? companyId : `${slug}.com`,
      owner: 'Unassigned',
      arr,
      seats,
      seatsUsed,
      renewalDays: renewalDaysFrom(opp?.value),
      contact: { name: 'Account contact', title: 'Primary contact', phone: '—', email: `team@${slug}.com` },
      signals: [{ type: signalForStatus(status, reason), note: reason ?? 'Signal detected by the engine', detected: 'live' }],
      usage,
      expansion: status === 'green' ? Math.round((opp?.value ?? arr * 0.15)) : 0,
    });
  };

  for (const c of churn) push(c.companyId, c.name, c.status, c.reason, oppById.get(c.companyId)?.arr ?? 0);
  // Opportunity-only companies (healthy, upsell-ready) that never hit the churn table.
  for (const o of opportunity) {
    if (seen.has(o.companyId)) continue;
    push(o.companyId, o.name, 'green', o.stage ? `Stage: ${o.stage}` : null, o.arr ?? o.contractValue ?? 0);
  }
  return inputs;
}

/** Map live escalations into Action-Agent feed items (AI risk queue, ack-enabled). */
export function mapEscalationsToFeed(rows: EscalationRow[], nameById: Map<string, string>): FeedSeed[] {
  return rows.map((e) => {
    const name = nameById.get(e.companyId) ?? e.companyId;
    const intent: FeedIntent = 'risk';
    return {
      id: `esc_${e.id}`,
      accountId: e.companyId,
      escalationId: e.id,
      category: e.status === 'red' ? 'URGENT · CHURN RISK' : 'INVESTIGATE',
      intent,
      actor: 'ai',
      time: 'live',
      title: `${name} — ${e.reason ?? 'flagged by the churn engine'}`,
      body:
        e.briefSummary ??
        `${name} crossed the churn threshold (score ${Math.round(e.score)}). ${e.briefRecommendedPlay ?? 'Recommend a direct check-in.'}`,
      script: e.briefRecommendedPlay ?? null,
      primaryLabel: 'Place Call',
    };
  });
}
