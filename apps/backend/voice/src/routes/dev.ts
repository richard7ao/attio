import { Router } from "express";
import { log } from "../logger.js";
import {
  appendSegments,
  getTranscript,
  getVoiceCall,
  syncOutreachFromCall,
  updateVoiceCall,
} from "../db.js";
import { getBrain } from "../agent/brain.js";
import { publish } from "../sse.js";
import type { AccountSignal, Speaker } from "../types.js";

/**
 * DEV-ONLY routes. Mounted only when NODE_ENV !== "production".
 * Drives the same DB + SSE pipeline SLNG would, so the live transcript page can
 * be demoed end-to-end without any telephony. Also a safe stage fallback.
 */
export const devRouter = Router();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

devRouter.post("/dev/simulate/:callId", async (req, res) => {
  const call = await getVoiceCall(req.params.callId);
  if (!call) return res.status(404).json({ error: "not_found" });

  const stepMs = Number(req.query.stepMs ?? 900);
  // Respond immediately; play the conversation in the background so the client
  // can watch the SSE stream.
  res.status(202).json({
    ok: true,
    callId: call.id,
    watch: `/demo/call.html?id=${call.id}`,
  });

  void run(call.id, (call.playbook ?? {}) as Partial<AccountSignal>, stepMs).catch((err) =>
    log.error({ err, callId: call.id }, "simulation failed"),
  );
});

async function run(callId: string, s: Partial<AccountSignal>, stepMs: number): Promise<void> {
  const account = s.accountName ?? "your company";
  const contact = s.contactName ?? "there";

  await updateVoiceCall(callId, { status: "in_progress", started_at: new Date().toISOString() });
  publish(callId, "status", { status: "in_progress" });
  await sleep(stepMs);

  const script: { speaker: Speaker; text: string }[] = [
    { speaker: "agent", text: `Hi, is this ${contact}? This is Alex from Attio — do you have a quick minute?` },
    { speaker: "customer", text: `Sure, I've got a couple of minutes. What's this about?` },
    { speaker: "agent", text: `I'm reaching out about your ${account} account — your renewal is coming up and I noticed your team's usage has been climbing. Wanted to check in before it lapses.` },
    { speaker: "customer", text: `Yeah, we've added a bunch of people recently. Honestly I wasn't sure we were on the right plan anymore.` },
    { speaker: "agent", text: `That's exactly why I called. Let me pull up your current numbers so I give you accurate info.` },
  ];

  for (const line of script) {
    await emit(callId, line);
    await sleep(stepMs);
  }

  // Mid-call tool — demonstrates the SLNG → /tools → brain path.
  try {
    const brain = await getBrain();
    publish(callId, "tool", { tool: "lookup_account", args: { question: "current plan & seats" } });
    const result: any = await brain.runTool(
      "lookup_account",
      { question: "current plan, seat count, and renewal date" },
      (s.accountName && s.goal ? (s as AccountSignal) : null),
    );
    await sleep(stepMs);
    await emit(callId, {
      speaker: "agent",
      text:
        typeof result?.result === "string"
          ? `Okay — ${result.result}`
          : `Okay, I've got your account details up now.`,
    });
  } catch (err) {
    log.warn({ err, callId }, "simulate tool step failed (continuing)");
  }
  await sleep(stepMs);

  const tail: { speaker: Speaker; text: string }[] = [
    { speaker: "customer", text: `That makes sense. The Scale tier with SSO would actually solve a problem we've been having.` },
    { speaker: "agent", text: `Great — I'll send over a quote for the annual Scale plan today and hold your current pricing. Does it make sense to grab 20 minutes with your team next week to walk through it?` },
    { speaker: "customer", text: `Yeah, let's do Tuesday. Send the quote and a calendar invite.` },
    { speaker: "agent", text: `Done. I'll get that over within the hour. Thanks for the time, ${contact} — talk Tuesday.` },
  ];
  for (const line of tail) {
    await emit(callId, line);
    await sleep(stepMs);
  }

  await finish(callId, s);
}

async function emit(callId: string, line: { speaker: Speaker; text: string }): Promise<void> {
  const [seg] = await appendSegments(callId, [line]);
  if (seg) publish(callId, "segment", seg);
}

async function finish(callId: string, s: Partial<AccountSignal>): Promise<void> {
  const transcript = await getTranscript(callId);
  let summary = "";
  let disposition: any = "unknown";
  let nextAction = "";
  try {
    const brain = await getBrain();
    const signal = s.accountName && s.goal ? (s as AccountSignal) : null;
    const out = await brain.summarize(transcript, signal);
    summary = out.summary;
    disposition = out.disposition;
    nextAction = out.nextAction;
  } catch (err) {
    log.error({ err, callId }, "simulate summarize failed");
  }

  const updated = await updateVoiceCall(callId, {
    status: "completed",
    disposition,
    summary: summary || null,
    next_action: nextAction || null,
    call_end_reason: "simulated",
    ended_at: new Date().toISOString(),
  });
  await syncOutreachFromCall(updated);
  publish(callId, "status", { status: "completed" });
  publish(callId, "ended", { status: "completed", disposition, summary, nextAction });
}
