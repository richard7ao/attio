import { getCompanyContext, latestOpenEscalationId, updateEscalationBrief } from '@attio/db';
import type { AccountBrief, AccountContext } from '@attio/shared';
import { fallbackBrief } from './fallback.js';
import { mubitBrief, mubitEnabled, mubitRemember } from './mubit.js';
import { superlinkBrief, superlinkEnabled } from './superlink.js';

/**
 * Produce the account brief for a company. The Mubit "Head of Data" agent and
 * the Superlink LLM are raced as two duplicate calls — whichever returns a valid
 * brief first wins (Promise.any) — so a slow/cold provider never holds up the
 * result. If both fail (or neither is configured) we fall back to a deterministic
 * brief so the escalation columns are always populated.
 */
export async function generateAccountBrief(companyId: string): Promise<AccountBrief | null> {
  const ctx = await getCompanyContext(companyId);
  if (!ctx) return null;

  const racers: Promise<AccountBrief>[] = [];
  if (superlinkEnabled()) racers.push(superlinkBrief(ctx));
  if (mubitEnabled()) racers.push(mubitBrief(ctx));
  if (racers.length === 0) return fallbackBrief(ctx);

  try {
    const brief = await Promise.any(racers);
    // Record the winning brief back into Mubit memory (best-effort) so future
    // recalls are grounded.
    if (mubitEnabled()) await mubitRemember(ctx, brief);
    return brief;
  } catch {
    return fallbackBrief(ctx); // both providers failed; never break the flow
  }
}

// AccountContext is re-exported for callers/tests that build a context directly.
export type { AccountContext };

/**
 * Generate a brief and write it onto the company's latest open escalation.
 * Returns the brief and the escalation id it was attached to (if any).
 */
export async function generateAndSaveBrief(
  companyId: string,
): Promise<{ brief: AccountBrief | null; escalationId: string | null }> {
  const brief = await generateAccountBrief(companyId);
  if (!brief) return { brief: null, escalationId: null };
  const escalationId = await latestOpenEscalationId(companyId);
  if (escalationId) await updateEscalationBrief(escalationId, brief);
  return { brief, escalationId };
}
