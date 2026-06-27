import Anthropic from "@anthropic-ai/sdk";
import { config, requireEnv } from "../config.js";
import { log } from "../logger.js";
import type { AccountSignal, CallPlan, CallSummary, TranscriptSegment } from "../types.js";
import { PLAN_INSTRUCTIONS, SUMMARY_INSTRUCTIONS, renderAccountContext, transcriptToText } from "./prompts.js";
import { type AgentBrain, normalizeDisposition } from "./brain.js";

/** Working brain backed by the Claude API. Used as the fallback runtime. */
export class ClaudeBrain implements AgentBrain {
  readonly name = "claude";
  private client: Anthropic;
  private model: string;

  constructor() {
    this.client = new Anthropic({ apiKey: requireEnv(config.brain.claude.apiKey, "ANTHROPIC_API_KEY") });
    this.model = config.brain.claude.model;
  }

  async planCall(signal: AccountSignal): Promise<CallPlan> {
    const text = await this.complete(
      PLAN_INSTRUCTIONS,
      `Account signal:\n${JSON.stringify(signal, null, 2)}\n\n` +
        `Return ONLY a JSON object: {"talkingPoints": string[]}`,
      400,
    );
    const parsed = parseJson(text);
    const talkingPoints = Array.isArray(parsed?.talkingPoints)
      ? parsed.talkingPoints.map(String)
      : [];

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
    // Generic reasoning fallback. Real deployments wire tools to CRM/billing.
    const text = await this.complete(
      "You answer a tool call made by a voice agent mid-conversation. Be factual " +
        "and concise. If you lack data, say so plainly. Reply in one or two sentences.",
      `Tool: ${tool}\nArguments: ${JSON.stringify(args)}\n` +
        `Account: ${signal ? JSON.stringify(signal) : "unknown"}`,
      250,
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
      500,
    );
    const parsed = parseJson(text) ?? {};
    return {
      summary: String(parsed.summary ?? "").trim() || "No summary available.",
      disposition: normalizeDisposition(parsed.disposition),
      nextAction: String(parsed.nextAction ?? "").trim() || "Review the call and decide follow-up.",
    };
  }

  private async complete(system: string, user: string, maxTokens: number): Promise<string> {
    try {
      const res = await this.client.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      });
      return res.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
    } catch (err) {
      log.error({ err }, "Claude completion failed");
      throw err;
    }
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
