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
 * Route to a warm GPU hot lane. SUPERLINK_GPU is a machine profile
 * (e.g. `rtx6000-qwen27`) or `pool/profile`; the SIE gateway selects the lane
 * from the X-SIE-MACHINE-PROFILE (+ X-SIE-Pool) headers.
 */
function laneHeaders(): Record<string, string> {
  const gpu = config.SUPERLINK_GPU;
  if (!gpu) return {};
  const parts = gpu.split('/');
  const pool = parts.length > 1 ? parts[0] : undefined;
  const profile = parts.length > 1 ? parts[1] : parts[0];
  const headers: Record<string, string> = {};
  if (pool) headers['X-SIE-Pool'] = pool;
  if (profile) headers['X-SIE-MACHINE-PROFILE'] = profile;
  return headers;
}

/**
 * Generate a brief via the Superlink LLM (OpenAI-compatible chat completions).
 *
 * Verified against the Superlinked SIE gateway: `${SUPERLINK_BASE_URL}/chat/completions`
 * (base URL includes `/v1`) with Bearer auth and an OpenAI-shaped response.
 * Requests are pinned to a warm GPU hot lane via the X-SIE-MACHINE-PROFILE
 * header (see laneHeaders). If a lane is cold it returns `503 MODEL_LOADING`,
 * so we briefly retry; if still cold the caller falls back deterministically.
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
    max_tokens: 512, // the brief JSON is small; cap output to keep latency low
  };

  let res!: Response;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(`${config.SUPERLINK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.SUPERLINK_API_KEY}`,
        'Content-Type': 'application/json',
        ...laneHeaders(),
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
