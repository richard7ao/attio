import type { AccountBrief, AccountContext } from '@attio/shared';
import { config } from '../../config.js';

/** Whether the Mubit memory layer is configured. */
export function mubitEnabled(): boolean {
  return Boolean(config.MUBIT_API_KEY);
}

// ===========================================================================
// *CHECK THIS* — MUBIT INTEGRATION
// Mubit (https://api.mubit.ai) is the memory/agent layer for the "Head of Data"
// agent. The exact request shapes below must be verified against the Mubit docs
// (docs.mubit.ai) once MUBIT_API_KEY is provided. The pattern is the documented
// one: recall lessons before the LLM call, record the outcome after.
// ===========================================================================

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

/** Recall prior lessons relevant to this account for the Head-of-Data agent. */
export async function mubitRecall(ctx: AccountContext): Promise<string | undefined> {
  try {
    const out = (await mubitFetch('/v1/recall', {
      agent: config.MUBIT_AGENT,
      query: `Churn analysis for ${ctx.name ?? ctx.companyId}`,
    })) as { context?: string; answer?: string };
    return out.context ?? out.answer;
  } catch {
    return undefined; // memory is best-effort; never block the brief
  }
}

/** Record the produced brief back into Mubit memory. */
export async function mubitRemember(ctx: AccountContext, brief: AccountBrief): Promise<void> {
  try {
    await mubitFetch('/v1/remember', {
      agent: config.MUBIT_AGENT,
      item: { companyId: ctx.companyId, status: ctx.churnStatus, brief },
    });
  } catch {
    // best-effort
  }
}
