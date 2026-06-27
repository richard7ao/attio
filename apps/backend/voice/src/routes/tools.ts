import { Router } from "express";
import { config } from "../config.js";
import { log } from "../logger.js";
import { findCallByProviderId, getVoiceCall } from "../db.js";
import { getBrain } from "../agent/brain.js";
import { publish } from "../sse.js";
import type { AccountSignal } from "../types.js";

export const toolsRouter = Router();

/** SLNG sends a bearer token (configured on the tool) — verify it. */
function authorized(req: any): boolean {
  const secret = config.slng.toolWebhookSecret;
  if (!secret) {
    log.warn("TOOL_WEBHOOK_SECRET unset — accepting tool calls unauthenticated (dev only)");
    return true;
  }
  const header = String(req.header("authorization") ?? "");
  return header === `Bearer ${secret}`;
}

/**
 * POST /tools/:tool — a mid-call tool the SLNG agent invokes. SLNG passes the
 * tool's parameters in the body; we (optionally) correlate to a call via a
 * `call_id` query param or body field, run the brain, and return a result the
 * agent will speak.
 *
 * Configure the tool URL on the agent as e.g.
 *   {PUBLIC_BASE_URL}/tools/lookup_account?call_id={{call_id}}
 */
toolsRouter.post("/tools/:tool", async (req, res) => {
  if (!authorized(req)) return res.status(401).json({ error: "unauthorized" });

  const tool = req.params.tool;
  const args = (req.body ?? {}) as Record<string, unknown>;
  const providerCallId = String(req.query.call_id ?? args.call_id ?? "");

  let signal: AccountSignal | null = null;
  let localCallId: string | null = null;
  if (providerCallId) {
    const call = await findCallByProviderId(providerCallId);
    if (call) {
      localCallId = call.id;
      const pb = call.playbook as Partial<AccountSignal>;
      if (pb?.accountName && pb?.goal) signal = pb as AccountSignal;
    }
  }

  // Resolve a spoken answer. NEVER 500 — a tool error makes the agent say
  // "technical problem" on the call. Always return 200 with a `result` string.
  let result: string;
  try {
    if (signal) {
      // Deterministic CRM facts — no LLM needed.
      result = describeAccount(signal);
    } else {
      // No account context (e.g. a dashboard test session). Try the brain if it's
      // configured; otherwise answer gracefully.
      try {
        const brain = await getBrain();
        const out = (await brain.runTool(tool, args, null)) as { result?: string };
        result = out?.result?.trim() || NO_DATA;
      } catch {
        result = NO_DATA;
      }
    }
  } catch (err) {
    log.error({ err, tool }, "tool handler error");
    result = NO_DATA;
  }

  if (localCallId) publish(localCallId, "tool", { tool, args, result });
  log.info({ tool, callId: localCallId, hasSignal: Boolean(signal) }, "tool invoked");
  return res.json({ result });
});

const NO_DATA =
  "I don't have those details in front of me right now, but I can follow up by email with the specifics.";

/** Turn the stored account signal into a short spoken-style summary of facts. */
function describeAccount(s: AccountSignal): string {
  const bits: string[] = [];
  if (s.plan) bits.push(`They're on the ${s.plan} plan`);
  if (s.seats != null) bits.push(`with ${s.seats} seats`);
  if (s.mrr != null) bits.push(`at about $${s.mrr} per month`);
  if (s.renewalDate) bits.push(`Their renewal date is ${s.renewalDate}`);
  if (s.usageTrend) bits.push(`usage has been trending ${s.usageTrend} recently`);
  if (s.healthScore != null) bits.push(`account health is ${s.healthScore} out of 100`);
  return bits.length
    ? bits.join(", ").replace(/, ([^,]*)$/, ", and $1") + "."
    : NO_DATA;
}

/** GET /tools/_local/:localCallId — debug helper to inspect stored context. */
toolsRouter.get("/tools/_local/:localCallId", async (req, res) => {
  const call = await getVoiceCall(req.params.localCallId);
  if (!call) return res.status(404).json({ error: "not_found" });
  res.json({ playbook: call.playbook });
});
