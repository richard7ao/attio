import { Router } from "express";
import { z } from "zod";
import { log } from "../logger.js";
import {
  createVoiceCall,
  getTranscript,
  getVoiceCall,
  listVoiceCalls,
  syncOutreachFromCall,
  updateVoiceCall,
} from "../db.js";
import { getBrain } from "../agent/brain.js";
import { dispatchCall } from "../slng.js";
import { getMockSignal } from "../mock/signals.js";
import { subscribe } from "../sse.js";
import type { AccountSignal } from "../types.js";

export const callsRouter = Router();

const signalSchema = z.object({
  accountId: z.string().optional(),
  accountName: z.string(),
  contactName: z.string(),
  toNumber: z.string(),
  plan: z.string().optional(),
  seats: z.number().optional(),
  mrr: z.number().optional(),
  renewalDate: z.string().optional(),
  usageTrend: z.enum(["up", "flat", "down"]).optional(),
  healthScore: z.number().optional(),
  goal: z.string(),
  notes: z.string().optional(),
});

const createSchema = z.object({
  userId: z.string().uuid().optional(),
  // Either pass a full signal, or reference a built-in mock by key.
  mock: z.string().optional(),
  signal: signalSchema.optional(),
  // Override the destination number (handy for pointing a mock at a real phone).
  toNumber: z.string().optional(),
});

/**
 * POST /calls — create an outreach call and dispatch it to SLNG.
 * Body: { userId?, mock? | signal?, toNumber? }
 */
callsRouter.post("/calls", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
  }
  const { mock, toNumber } = parsed.data;
  const userId = parsed.data.userId ?? process.env.DEMO_USER_ID;
  if (!userId) {
    return res.status(400).json({ error: "missing_user", message: "Provide userId or set DEMO_USER_ID" });
  }

  let signal: AccountSignal | undefined = parsed.data.signal;
  if (!signal && mock) {
    signal = getMockSignal(mock);
    if (!signal) return res.status(404).json({ error: "unknown_mock", mock });
  }
  if (!signal) return res.status(400).json({ error: "missing_signal" });
  if (toNumber) signal = { ...signal, toNumber };

  // 1. Persist the call (+ linked outreach row).
  const call = await createVoiceCall({
    user_id: userId,
    account_id: signal.accountId ?? null,
    account_name: signal.accountName,
    contact_name: signal.contactName,
    to_number: signal.toNumber,
    goal: signal.goal,
    playbook: signal as unknown as Record<string, unknown>,
  });

  // 2. Pre-call planning via the agent brain.
  let talkingPoints: string[] = [];
  let args: Record<string, string> = {};
  try {
    const brain = await getBrain();
    const plan = await brain.planCall(signal);
    talkingPoints = plan.talkingPoints;
    args = plan.arguments;
    await updateVoiceCall(call.id, {
      metadata: { ...call.metadata, talking_points: talkingPoints, brain: brain.name },
    });
  } catch (err) {
    log.error({ err, callId: call.id }, "planCall failed; dispatching with minimal args");
  }

  // 3. Dispatch to SLNG. In dev (no SLNG creds) we keep the row and report it.
  try {
    const result = await dispatchCall({ phoneNumber: signal.toNumber, arguments: args });
    const updated = await updateVoiceCall(call.id, {
      provider_call_id: result.callId,
      status: "ringing",
    });
    await syncOutreachFromCall(updated);
    return res.status(201).json({ call: updated, talkingPoints });
  } catch (err) {
    log.warn({ err, callId: call.id }, "SLNG dispatch failed — row kept as queued");
    const updated = await updateVoiceCall(call.id, {
      metadata: { ...call.metadata, talking_points: talkingPoints, dispatch_error: String(err) },
    });
    return res.status(202).json({
      call: updated,
      talkingPoints,
      warning: "Created but not dispatched (SLNG not configured or call failed). See dispatch_error.",
    });
  }
});

/** GET /calls — recent calls. */
callsRouter.get("/calls", async (_req, res) => {
  res.json({ calls: await listVoiceCalls() });
});

/** GET /calls/:id — full record + transcript. */
callsRouter.get("/calls/:id", async (req, res) => {
  const call = await getVoiceCall(req.params.id);
  if (!call) return res.status(404).json({ error: "not_found" });
  const transcript = await getTranscript(call.id);
  res.json({ call, transcript });
});

/**
 * GET /calls/:id/stream — SSE live feed.
 * Replays existing transcript, then streams new segments / status / tool / ended.
 */
callsRouter.get("/calls/:id/stream", async (req, res) => {
  const callId = req.params.id;
  const call = await getVoiceCall(callId);
  if (!call) return res.status(404).json({ error: "not_found" });

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write(`event: status\ndata: ${JSON.stringify({ status: call.status })}\n\n`);

  for (const seg of await getTranscript(callId)) {
    res.write(`event: segment\ndata: ${JSON.stringify(seg)}\n\n`);
  }

  const unsubscribe = subscribe(callId, res);
  const heartbeat = setInterval(() => res.write(`: ping\n\n`), 15000);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});
