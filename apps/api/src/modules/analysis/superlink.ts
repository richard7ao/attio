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

/**
 * Generate a brief via the Superlink LLM (OpenAI-compatible chat completions).
 *
 * *CHECK THIS* — assumes Superlink exposes `${SUPERLINK_BASE_URL}/chat/completions`
 * with Bearer auth and an OpenAI-shaped response. Confirm against the real
 * Superlink docs/endpoint, then adjust the URL/shape if needed.
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

  const res = await fetch(`${config.SUPERLINK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.SUPERLINK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
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
