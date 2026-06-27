import { getCompanyContext, getCompanyPrimaryContact } from '@attio/db';
import type { AccountBrief, ChurnStatus } from '@attio/shared';
import { config } from '../../config.js';

// ===========================================================================
// CHURN-RESCUE DISPATCH
// On escalation, our API is the source of truth for the brief. We emit a single
// `churn.escalated` event (brief included) to the n8n WF-4 webhook, which owns
// orchestration only: priority routing -> voice call / email / queue.
// Best-effort: never block or fail the churn flow.
// ===========================================================================

export function rescueDispatchEnabled(): boolean {
  return Boolean(config.N8N_WEBHOOK_BASE_URL);
}

/** Map churn status to the priority WF-4's "Route by Priority" switch expects. */
export function priorityFor(status: ChurnStatus): 'high' | 'medium' | 'low' {
  if (status === 'red') return 'high';
  if (status === 'amber') return 'medium';
  return 'low';
}

export interface RescueEvent {
  event: 'churn.escalated';
  companyId: string;
  name: string | null;
  status: ChurnStatus;
  score: number;
  priority: 'high' | 'medium' | 'low';
  arrAtRisk: number | null;
  contact: { name: string | null; email: string | null; phone: string | null } | null;
  brief: AccountBrief;
  at: string;
}

/** Build the rescue event payload from the company context + brief. */
export async function buildRescueEvent(
  companyId: string,
  brief: AccountBrief,
): Promise<RescueEvent | null> {
  const ctx = await getCompanyContext(companyId);
  if (!ctx) return null;
  const contact = await getCompanyPrimaryContact(companyId);
  return {
    event: 'churn.escalated',
    companyId,
    name: ctx.name,
    status: ctx.churnStatus,
    score: Math.round(ctx.churnScore),
    priority: priorityFor(ctx.churnStatus),
    arrAtRisk: brief.arrAtRisk,
    contact,
    brief,
    at: new Date().toISOString(),
  };
}

/**
 * POST the churn-rescue event to the n8n WF-4 webhook. Best-effort: any failure
 * is swallowed so the escalation/brief flow is never affected.
 */
export async function dispatchRescue(companyId: string, brief: AccountBrief): Promise<void> {
  if (!config.N8N_WEBHOOK_BASE_URL) return;
  try {
    const payload = await buildRescueEvent(companyId, brief);
    if (!payload) return;
    await fetch(`${config.N8N_WEBHOOK_BASE_URL}/webhook/churn-rescue/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // best-effort
  }
}
