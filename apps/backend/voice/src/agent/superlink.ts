import { config, requireEnv } from "../config.js";
import { log } from "../logger.js";
import type { AccountSignal, CallPlan, CallSummary, TranscriptSegment } from "../types.js";
import { PLAN_INSTRUCTIONS, SUMMARY_INSTRUCTIONS, renderAccountContext, transcriptToText } from "./prompts.js";
import { type AgentBrain, normalizeDisposition } from "./brain.js";

/**
 * Brain backed by Superlink (the LLM) grounded by Mubit (durable memory), wired
 * per docs/guides/superlink-mubit-agents.md. Each step runs the agent loop:
 *
 *   recall lessons (Mubit)  →  generate (Superlink)  →  remember outcome (Mubit)
 *
 * Superlink is the OpenAI-compatible SIE gateway; we pin every request to a warm
 * GPU hot lane (X-SIE-MACHINE-PROFILE) and retry on a cold `503 MODEL_LOADING`.
 * Mubit recall/remember are best-effort — they never block or fail a call. Used
 * for pre-call planning, the mid-call tool fallback, and post-call summarization
 * — NOT the live voice conversation (that's SLNG's own model).
 */
export class SuperlinkBrain implements AgentBrain {
  readonly name = "superlink";
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor() {
    this.baseUrl = requireEnv(config.brain.superlink.baseUrl, "SUPERLINK_BASE_URL");
    this.apiKey = requireEnv(config.brain.superlink.apiKey, "SUPERLINK_API_KEY");
    this.model = requireEnv(config.brain.superlink.model, "SUPERLINK_MODEL");
  }

  async planCall(signal: AccountSignal): Promise<CallPlan> {
    const runId = this.runId(signal);
    const task = `Plan an outbound call to ${signal.contactName} at ${signal.accountName} (goal: ${signal.goal}).`;
    const lessons = await this.recall(runId, `Talking points and prior outcomes for: ${task}`);

    const text = await this.generate(
      PLAN_INSTRUCTIONS,
      `${lessons ? `Prior lessons:\n${lessons}\n\n` : ""}Account signal:\n${JSON.stringify(signal, null, 2)}\n\n` +
        `Return ONLY {"talkingPoints": string[]}`,
    );
    const parsed = parseJson(text);
    const talkingPoints = Array.isArray(parsed?.talkingPoints) ? parsed.talkingPoints.map(String) : [];

    await this.remember(runId, `Plan for ${signal.accountName} (goal: ${signal.goal}) -> talking points: ${talkingPoints.join("; ")}`);

    return {
      talkingPoints,
      arguments: {
        company_name: "Attio",
        account_name: signal.accountName,
        contact_name: signal.contactName,
        call_goal: signal.goal,
        account_context: renderAccountContext(signal),
      },
    };
  }

  async runTool(
    tool: string,
    args: Record<string, unknown>,
    signal: AccountSignal | null,
  ): Promise<unknown> {
    const runId = signal ? this.runId(signal) : "voice-unknown";
    const lessons = await this.recall(runId, `Relevant facts for tool ${tool} with args ${JSON.stringify(args)}`);
    const text = await this.generate(
      "You answer a tool call from a voice agent mid-conversation. Be factual and concise.",
      `${lessons ? `Prior lessons:\n${lessons}\n\n` : ""}Tool: ${tool}\nArguments: ${JSON.stringify(args)}\n` +
        `Account: ${signal ? JSON.stringify(signal) : "unknown"}`,
    );
    return { result: text };
  }

  async summarize(
    transcript: TranscriptSegment[],
    signal: AccountSignal | null,
  ): Promise<CallSummary> {
    const runId = signal ? this.runId(signal) : "voice-unknown";
    const convo = transcriptToText(transcript) || "(no transcript captured)";
    const lessons = await this.recall(runId, "How prior calls for this account were dispositioned and followed up.");

    const text = await this.generate(
      SUMMARY_INSTRUCTIONS,
      `${lessons ? `Prior lessons:\n${lessons}\n\n` : ""}${signal ? `Account: ${JSON.stringify(signal)}\n\n` : ""}Transcript:\n${convo}`,
    );
    const parsed = parseJson(text) ?? {};
    const summary = {
      summary: String(parsed.summary ?? "").trim() || "No summary available.",
      disposition: normalizeDisposition(parsed.disposition),
      nextAction: String(parsed.nextAction ?? "").trim() || "Review the call and decide follow-up.",
    };

    await this.remember(
      runId,
      `Call with ${signal?.accountName ?? "account"} -> ${summary.disposition}. ` +
        `Summary: ${summary.summary} Next: ${summary.nextAction}`,
    );
    return summary;
  }

  /** Stable Mubit run id per account so memory accumulates over time. */
  private runId(signal: AccountSignal): string {
    return `voice-${signal.accountId ?? signal.accountName}`;
  }

  // ── Superlink (the LLM) ────────────────────────────────────────────────────

  /**
   * Route to a warm GPU hot lane. SUPERLINK_GPU is a machine profile (e.g.
   * `rtx6000-qwen27`) or `pool/profile`; the SIE gateway selects the lane from
   * the X-SIE-MACHINE-PROFILE (+ X-SIE-Pool) headers — never a body field.
   */
  private laneHeaders(): Record<string, string> {
    const gpu = config.brain.superlink.gpu;
    if (!gpu) return {};
    const parts = gpu.split("/");
    const pool = parts.length > 1 ? parts[0] : undefined;
    const profile = parts.length > 1 ? parts[1] : parts[0];
    const headers: Record<string, string> = {};
    if (pool) headers["X-SIE-Pool"] = pool;
    if (profile) headers["X-SIE-MACHINE-PROFILE"] = profile;
    return headers;
  }

  /** Generate strict JSON via Superlink, retrying a cold `503 MODEL_LOADING` lane. */
  private async generate(system: string, user: string): Promise<string> {
    const body = {
      model: this.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      max_tokens: 512, // the JSON we ask for is small; cap output to keep latency low
    };

    let res!: Response;
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...this.laneHeaders(),
        },
        body: JSON.stringify(body),
      });
      if (res.status !== 503) break; // only a cold model is worth retrying
      if (attempt < 2) await sleep(2000);
    }
    const text = await res.text();
    if (!res.ok) {
      log.error({ status: res.status, body: text, brain: this.name }, "Superlink completion failed");
      throw new Error(`Superlink failed (${res.status}): ${text}`);
    }
    return (safeJson(text) as any)?.choices?.[0]?.message?.content ?? "";
  }

  // ── Mubit (the memory) — best-effort recall + remember ─────────────────────

  /** Recall prior lessons for a thread. Returns undefined on abstain/low confidence/error. */
  private async recall(runId: string, query: string): Promise<string | undefined> {
    const { baseUrl, apiKey } = config.brain.mubit;
    if (!baseUrl || !apiKey) return undefined; // memory is optional
    try {
      const res = await fetch(`${baseUrl}/v2/control/query`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ run_id: runId, query }),
      });
      if (!res.ok) return undefined; // best-effort; never block the agent
      const out = (await res.json()) as { final_answer?: string; confidence?: number };
      const answer = out.final_answer?.trim();
      // Treat low-confidence abstentions as "no prior lessons".
      if (!answer || (out.confidence ?? 0) < 0.2 || /\bi (?:do not|don't) know\b/i.test(answer)) {
        return undefined;
      }
      return answer;
    } catch {
      return undefined;
    }
  }

  /** Record an outcome so the next recall is grounded. Async + best-effort. */
  private async remember(runId: string, lesson: string): Promise<void> {
    const { baseUrl, apiKey, agent } = config.brain.mubit;
    if (!baseUrl || !apiKey) return;
    try {
      await fetch(`${baseUrl}/v2/control/ingest`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          run_id: runId,
          agent_id: agent,
          items: [
            {
              item_id: `lesson-${Date.now()}`, // unique per write
              content_type: "text",
              intent: "lesson",
              content: lesson,
            },
          ],
        }),
      });
    } catch {
      // best-effort: a memory write must never fail the agent
    }
  }
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function parseJson(text: string): any {
  const match = text.match(/\{[\s\S]*\}/);
  const json = match?.[0];
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}
