import type { AccountBrief, AccountContext } from '@attio/shared';
import { config } from '../../config.js';

/** Whether the Superlink LLM path is configured. */
export function superlinkEnabled(): boolean {
  return Boolean(config.SUPERLINK_API_KEY && config.SUPERLINK_BASE_URL);
}

const SYSTEM_PROMPT =
  'You are the Head of Data. Given a customer account context, produce a concise churn account ' +
  'brief. Respond ONLY with JSON: {"summary": string, "churnDrivers": string, ' +
  '"recommendedPlay": string, "arrAtRisk": number|null}.';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Generate a brief via the Superlink LLM (OpenAI-compatible chat completions).
 *
 * Verified against the Superlinked SIE gateway: `${SUPERLINK_BASE_URL}/chat/completions`
 * (base URL includes `/v1`) with Bearer auth and an OpenAI-shaped response.
 * SIE loads models on demand and returns `503 MODEL_LOADING` while warming up,
 * so we briefly retry; if it's still cold the caller falls back deterministically.
 */
export async function superlinkBrief(
  ctx: AccountContext,
  extraContext?: string,
): Promise<AccountBrief> {
  const body = {
    model: config.SUPERLINK_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(extraContext ? [{ role: 'system', content: `Prior lessons:\n${extraContext}` }] : []),
      { role: 'user', content: JSON.stringify(ctx) },
    ],
    response_format: { type: 'json_object' },
  };

  let res!: Response;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(`${config.SUPERLINK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.SUPERLINK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (res.status !== 503) break; // only a cold model is worth retrying
    if (attempt < 2) await sleep(2000);
  }
  if (!res.ok) throw new Error(`Superlink ${res.status}: ${await res.text()}`);

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('Superlink returned no content');

  const parsed = JSON.parse(content) as Partial<AccountBrief>;
  return {
    summary: parsed.summary ?? '',
    churnDrivers: parsed.churnDrivers ?? '',
    recommendedPlay: parsed.recommendedPlay ?? '',
    arrAtRisk: parsed.arrAtRisk ?? ctx.arr ?? ctx.contractValue,
    source: 'superlink',
  };
}
