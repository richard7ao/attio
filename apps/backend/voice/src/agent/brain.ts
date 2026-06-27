import { config } from "../config.js";
import { log } from "../logger.js";
import type { AccountSignal, CallPlan, CallSummary, TranscriptSegment } from "../types.js";

/**
 * The reasoning runtime. SLNG drives the live conversation, so the brain is used
 * at three points OUTSIDE the audio loop:
 *   - planCall:  pre-call — turn a signal into talking points + template args
 *   - runTool:   mid-call — answer a tool webhook the SLNG agent invokes
 *   - summarize: post-call — transcript -> summary + disposition + next action
 *
 * Mubit (the required runtime) and Claude (fallback) both implement this.
 */
export interface AgentBrain {
  readonly name: string;
  planCall(signal: AccountSignal): Promise<CallPlan>;
  runTool(tool: string, args: Record<string, unknown>, signal: AccountSignal | null): Promise<unknown>;
  summarize(transcript: TranscriptSegment[], signal: AccountSignal | null): Promise<CallSummary>;
}

let cached: AgentBrain | null = null;

/**
 * Pick the configured brain. Falls back to Claude if Mubit is selected but not
 * yet configured, so the demo never hard-stops on missing Mubit creds.
 */
export async function getBrain(): Promise<AgentBrain> {
  if (cached) return cached;

  if (config.brain.kind === "mubit") {
    if (config.brain.mubit.apiKey && config.brain.mubit.apiBase) {
      const { MubitBrain } = await import("./mubit.js");
      cached = new MubitBrain();
      return cached;
    }
    log.warn("AGENT_BRAIN=mubit but MUBIT_API_KEY/BASE not set — falling back to Claude");
  }

  if (config.brain.kind === "gemini") {
    if (config.brain.gemini.apiKey) {
      const { OpenAICompatBrain } = await import("./openai.js");
      cached = new OpenAICompatBrain({ name: "gemini", ...config.brain.gemini });
      return cached;
    }
    log.warn("AGENT_BRAIN=gemini but GEMINI_API_KEY not set — falling back to Claude");
  }

  if (config.brain.kind === "openai") {
    if (config.brain.openai.apiKey) {
      const { OpenAICompatBrain } = await import("./openai.js");
      cached = new OpenAICompatBrain({ name: "openai", ...config.brain.openai });
      return cached;
    }
    log.warn("AGENT_BRAIN=openai but OPENAI_API_KEY not set — falling back to Claude");
  }

  const { ClaudeBrain } = await import("./claude.js");
  cached = new ClaudeBrain();
  return cached;
}

/** Coerce arbitrary model output into a valid disposition. */
export function normalizeDisposition(value: unknown): CallSummary["disposition"] {
  const allowed: CallSummary["disposition"][] = [
    "renewed", "upsell_agreed", "callback_scheduled", "info_sent",
    "not_interested", "no_answer", "voicemail", "do_not_call",
    "needs_human", "unknown",
  ];
  const v = String(value ?? "").toLowerCase().trim();
  return (allowed as string[]).includes(v) ? (v as CallSummary["disposition"]) : "unknown";
}
