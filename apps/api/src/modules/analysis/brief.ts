import { getCompanyContext, latestOpenEscalationId, updateEscalationBrief } from '@attio/db';
import type { AccountBrief } from '@attio/shared';
import { fallbackBrief } from './fallback.js';
import { mubitEnabled, mubitRecall, mubitRemember } from './mubit.js';
import { superlinkBrief, superlinkEnabled } from './superlink.js';

/**
 * Produce the account brief for a company. Uses the Mubit "Head of Data" agent
 * (lessons recalled before / outcome recorded after) wrapping the Superlink LLM
 * when configured; otherwise falls back to a deterministic brief so the
 * escalation columns are always populated.
 */
export async function generateAccountBrief(companyId: string): Promise<AccountBrief | null> {
  const ctx = await getCompanyContext(companyId);
  if (!ctx) return null;

  if (!superlinkEnabled()) return fallbackBrief(ctx);

  try {
    const lessons = mubitEnabled() ? await mubitRecall(ctx) : undefined;
    const brief = await superlinkBrief(ctx, lessons);
    if (mubitEnabled()) {
      brief.source = 'mubit+superlink';
      await mubitRemember(ctx, brief);
    }
    return brief;
  } catch {
    return fallbackBrief(ctx); // never let the analysis layer break the flow
  }
}

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
