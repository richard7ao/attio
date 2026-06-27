import { requireEnv } from "../config.js";
import { log } from "../logger.js";
import type { AccountSignal, CallPlan, CallSummary, TranscriptSegment } from "../types.js";
import { PLAN_INSTRUCTIONS, SUMMARY_INSTRUCTIONS, renderAccountContext, transcriptToText } from "./prompts.js";
import { type AgentBrain, normalizeDisposition } from "./brain.js";

export interface OpenAICompatOptions {
  name: string; // e.g. "openai", "groq"
  baseUrl: string; // full base incl. any prefix; we POST `${baseUrl}/chat/completions`
  apiKey: string;
  model: string;
}

/**
 * Brain backed by any OpenAI-compatible chat-completions API (OpenAI, Groq,
 * OpenRouter, and Google Gemini via its OpenAI-compatible endpoint). Used for
 * pre-call planning, the mid-call tool fallback, and post-call summarization —
 * NOT the live voice conversation (that's SLNG's own model).
 */
export class OpenAICompatBrain implements AgentBrain {
  readonly name: string;
  constructor(private opts: OpenAICompatOptions) {
    this.name = opts.name;
    requireEnv(opts.apiKey, `${opts.name.toUpperCase()}_API_KEY`);
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

  private async complete(system: string, user: string): Promise<string> {
    const res = await fetch(`${this.opts.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.opts.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.opts.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      log.error({ status: res.status, body: text, brain: this.name }, "completion failed");
      throw new Error(`${this.name} failed (${res.status}): ${text}`);
    }
    return (safeJson(text) as any)?.choices?.[0]?.message?.content ?? "";
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
