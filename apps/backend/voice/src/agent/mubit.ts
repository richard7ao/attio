import { config, requireEnv } from "../config.js";
import { log } from "../logger.js";
import type { AccountSignal, CallPlan, CallSummary, TranscriptSegment } from "../types.js";
import { PLAN_INSTRUCTIONS, SUMMARY_INSTRUCTIONS, renderAccountContext, transcriptToText } from "./prompts.js";
import { type AgentBrain, normalizeDisposition } from "./brain.js";

/**
 * Mubit-backed brain (the required runtime).
 *
 * ⚠️ STUB — the exact Mubit API (endpoint path, request/response shape, auth,
 * streaming) is an OPEN QUESTION pending the booth. Everything below is isolated
 * to this file: fill in `complete()` from the Mubit docs and the rest works as-is.
 * Until then, `getBrain()` falls back to Claude when MUBIT_* is unset.
 */
export class MubitBrain implements AgentBrain {
  readonly name = "mubit";
  private apiBase: string;
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiBase = requireEnv(config.brain.mubit.apiBase, "MUBIT_API_BASE");
    this.apiKey = requireEnv(config.brain.mubit.apiKey, "MUBIT_API_KEY");
    this.model = config.brain.mubit.model;
  }

  async planCall(signal: AccountSignal): Promise<CallPlan> {
    const text = await this.complete(
      PLAN_INSTRUCTIONS,
      `Account signal:\n${JSON.stringify(signal, null, 2)}\n\nReturn ONLY {"talkingPoints": string[]}`,
    );
    const parsed = parseJson(text);
    return {
      talkingPoints: Array.isArray(parsed?.talkingPoints) ? parsed.talkingPoints.map(String) : [],
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
    const text = await this.complete(
      "You answer a tool call from a voice agent mid-conversation. Be factual and concise.",
      `Tool: ${tool}\nArguments: ${JSON.stringify(args)}\nAccount: ${signal ? JSON.stringify(signal) : "unknown"}`,
    );
    return { result: text };
  }

  async summarize(
    transcript: TranscriptSegment[],
    signal: AccountSignal | null,
  ): Promise<CallSummary> {
    const convo = transcriptToText(transcript) || "(no transcript captured)";
    const text = await this.complete(
      SUMMARY_INSTRUCTIONS,
      `${signal ? `Account: ${JSON.stringify(signal)}\n\n` : ""}Transcript:\n${convo}`,
    );
    const parsed = parseJson(text) ?? {};
    return {
      summary: String(parsed.summary ?? "").trim() || "No summary available.",
      disposition: normalizeDisposition(parsed.disposition),
      nextAction: String(parsed.nextAction ?? "").trim() || "Review the call and decide follow-up.",
    };
  }

  /**
   * TODO(booth): replace with the real Mubit call. Placeholder assumes an
   * OpenAI-style chat endpoint; adjust path/shape once confirmed.
   */
  private async complete(system: string, user: string): Promise<string> {
    const res = await fetch(`${this.apiBase}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      log.error({ status: res.status, body: text }, "Mubit completion failed");
      throw new Error(`Mubit failed (${res.status}): ${text}`);
    }
    const json = safeJson(text);
    return (json as any)?.choices?.[0]?.message?.content ?? "";
  }
}

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
