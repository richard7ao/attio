import type { AccountBrief, AccountContext } from '@attio/shared';
import { config } from '../../config.js';
import { arrAtRiskOf, churnDriversText, recommendedPlayText } from './fallback.js';

/** Whether the Mubit memory layer is configured. */
export function mubitEnabled(): boolean {
  return Boolean(config.MUBIT_API_KEY);
}

// ===========================================================================
// MUBIT INTEGRATION (verified against api.mubit.ai control-plane HTTP API)
// Mubit is the durable memory layer for the "Head of Data" agent. It produces a
// memory-grounded brief via answer-oriented retrieval (POST /v2/control/query)
// and records produced briefs back (POST /v2/control/ingest) so future answers
// are grounded. The brief generator is raced against Superlink (see brief.ts);
// the ingest write is best-effort and must never block or fail a brief.
//   docs: https://docs.mubit.ai/api-reference/control-http
// ===========================================================================

/** A stable Mubit run/session id per company so memory accumulates over time. */
function runId(ctx: AccountContext): string {
  return `churn-${ctx.companyId}`;
}

async function mubitFetch(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${config.MUBIT_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.MUBIT_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Mubit ${res.status} on ${path}: ${await res.text()}`);
  return res.json();
}

const BRIEF_QUERY =
  'Summarize this account\u2019s churn risk and the key drivers, drawing on prior lessons in memory.';

interface MubitQueryResult {
  final_answer?: string;
  confidence?: number;
  routing_summary?: string;
}

/**
 * Generate a brief via Mubit's answer-oriented retrieval (`/v2/control/query`).
 *
 * Mubit is a memory engine, not a JSON LLM: it returns a natural-language
 * `final_answer` grounded in stored lessons plus a `routing_summary` of the
 * drivers it focused on. We map those onto the brief shape and fill the
 * remaining fields deterministically from the account context. Rejects when
 * Mubit abstains (low confidence / no grounded memory) so the racing caller can
 * take the Superlink result instead.
 */
export async function mubitBrief(ctx: AccountContext): Promise<AccountBrief> {
  const out = (await mubitFetch('/v2/control/query', {
    run_id: runId(ctx),
    query: `${BRIEF_QUERY}\nAccount context: ${JSON.stringify(ctx)}`,
  })) as MubitQueryResult;

  const answer = out.final_answer?.trim();
  if (!answer || (out.confidence ?? 0) < 0.2 || /\bi (?:do not|don't) know\b/i.test(answer)) {
    throw new Error('Mubit abstained (no grounded memory)');
  }

  // routing_summary is prefixed with a routing tag (e.g. "entity_focus:..."); drop it.
  const drivers = out.routing_summary?.replace(/^[a-z_]+:\s*/i, '').trim();
  return {
    summary: answer,
    churnDrivers: drivers && drivers.length > 0 ? drivers : churnDriversText(ctx),
    recommendedPlay: recommendedPlayText(ctx),
    arrAtRisk: arrAtRiskOf(ctx),
    source: 'mubit',
  };
}

/** Record the produced brief back into Mubit memory. */
export async function mubitRemember(ctx: AccountContext, brief: AccountBrief): Promise<void> {
  try {
    await mubitFetch('/v2/control/ingest', {
      run_id: runId(ctx),
      agent_id: config.MUBIT_AGENT,
      items: [
        {
          item_id: `brief-${ctx.companyId}-${Date.now()}`,
          content_type: 'text',
          intent: 'lesson',
          content:
            `Churn brief for ${ctx.name ?? ctx.companyId} (${ctx.churnStatus}).\n` +
            `Summary: ${brief.summary}\nDrivers: ${brief.churnDrivers}\n` +
            `Play: ${brief.recommendedPlay}\nARR at risk: ${brief.arrAtRisk ?? 'n/a'}`,
        },
      ],
    });
  } catch {
    // best-effort
  }
}
