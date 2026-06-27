import crypto from "node:crypto";
import { Router, type Request } from "express";
import { config } from "../config.js";
import { log } from "../logger.js";
import {
  appendSegments,
  createVoiceCall,
  findCallByProviderId,
  getTranscript,
  syncOutreachFromCall,
  updateVoiceCall,
  upsertChurnRescueStatus,
} from "../db.js";
import { getBrain } from "../agent/brain.js";
import { publish } from "../sse.js";
import type { AccountSignal, Speaker, VoiceCall, VoiceCallStatus, VoiceDisposition } from "../types.js";

export const webhooksRouter = Router();

/** Verify the HMAC-SHA256 signature SLNG attaches to system webhooks. */
function verifySignature(req: Request): boolean {
  const secret = config.slng.webhookSecret;
  if (!secret) {
    log.warn("SLNG_WEBHOOK_SECRET unset — skipping signature verification (dev only)");
    return true;
  }
  const raw = (req as any).rawBody as Buffer | undefined;
  const provided = req.header(config.slng.webhookSignatureHeader) ?? "";
  if (!raw || !provided) return false;
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  // Accept either bare hex or "sha256=<hex>".
  const got = provided.replace(/^sha256=/i, "");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(got));
  } catch {
    return false;
  }
}

/**
 * POST /webhooks/slng/events — SLNG system webhook.
 * Configured (via upsert-agent) to fire on call_start / first_user_message /
 * call_end and to include call_id + transcript_messages + call_end_reason.
 */
webhooksRouter.post("/webhooks/slng/events", async (req, res) => {
  if (!verifySignature(req)) {
    return res.status(401).json({ error: "bad_signature" });
  }
  // Respond fast; SLNG fires these with wait_for_response=false.
  res.status(200).json({ ok: true });

  try {
    await handleEvent(req.body ?? {});
  } catch (err) {
    log.error({ err }, "event handling failed");
  }
});

async function handleEvent(body: any): Promise<void> {
  const a = body.arguments ?? {};
  const event: string =
    body.event ?? a.event ?? body.trigger_event ?? body.type ?? body.trigger ?? "unknown";
  const providerCallId: string | undefined =
    body.call_id ?? a.call_id ?? body.data?.call_id;

  if (!providerCallId) {
    log.warn({ event, body }, "event without call_id; ignoring");
    return;
  }
  const call = await ensureCall(providerCallId, body);
  if (!call) {
    log.warn({ event, providerCallId }, "no matching voice_call and could not auto-ingest");
    return;
  }
  log.info({ event, callId: call.id }, "slng event");

  if (event === "call_start") {
    const updated = await updateVoiceCall(call.id, {
      status: "in_progress",
      started_at: new Date().toISOString(),
      livekit_room_name: body.livekit_room_name ?? body.room_name ?? call.livekit_room_name,
    });
    await syncOutreachFromCall(updated);
    publish(call.id, "status", { status: "in_progress" });
    return;
  }

  if (event === "first_user_message") {
    const text = body.first_user_message ?? body.message ?? body.arguments?.first_user_message;
    if (text) await appendAndBroadcast(call.id, [{ speaker: "customer", text: String(text) }]);
    return;
  }

  if (event === "call_end") {
    await handleCallEnd(call.id, body);
    return;
  }

  // Tool events / anything else — store on metadata for debugging.
  log.debug({ event }, "unhandled slng event");
}

/**
 * Find the local call for a provider call_id, or auto-create one. This lets
 * sessions started OUTSIDE our API (e.g. SLNG's browser test interface) still
 * land their transcript + summary on our page. Requires DEMO_USER_ID to own the
 * row; without it we can't satisfy the user_id FK, so we skip ingest.
 */
async function ensureCall(providerCallId: string, body: any): Promise<VoiceCall | null> {
  const existing = await findCallByProviderId(providerCallId);
  if (existing) return existing;

  const userId = process.env.DEMO_USER_ID;
  if (!userId) return null;

  try {
    const created = await createVoiceCall({
      user_id: userId,
      to_number: body.phone_number ?? body.arguments?.phone_number ?? "web",
      goal: "Externally-initiated session (auto-ingested)",
    });
    return await updateVoiceCall(created.id, {
      provider_call_id: providerCallId,
      metadata: { ...created.metadata, source: "auto_ingest" },
    });
  } catch (err) {
    // Likely a race (another event created it first) — re-fetch and use that.
    log.warn({ err, providerCallId }, "auto-ingest create failed; refetching");
    return findCallByProviderId(providerCallId);
  }
}

async function handleCallEnd(callId: string, body: any): Promise<void> {
  const endReason: string = body.call_end_reason ?? body.arguments?.call_end_reason ?? "";

  // Persist whatever transcript SLNG shipped, then broadcast it.
  const messages = extractTranscript(body);
  if (messages.length) await appendAndBroadcast(callId, messages);

  const status = statusFromEndReason(endReason);

  // Summarize via the brain (skip if there was no conversation).
  const transcript = await getTranscript(callId);
  let summary = "";
  let disposition: VoiceDisposition = dispositionFromStatus(status);
  let nextAction = "";
  if (transcript.some((s) => s.speaker !== "system")) {
    try {
      const brain = await getBrain();
      const call = await findByIdSignal(callId);
      const result = await brain.summarize(transcript, call);
      summary = result.summary;
      disposition = result.disposition;
      nextAction = result.nextAction;
    } catch (err) {
      log.error({ err, callId }, "summarize failed");
    }
  }

  const durationMs = body.call_duration_ms ?? body.arguments?.call_duration_ms ?? null;
  const updated = await updateVoiceCall(callId, {
    status,
    disposition,
    summary: summary || null,
    next_action: nextAction || null,
    call_end_reason: endReason || null,
    ended_at: new Date().toISOString(),
    duration_ms: durationMs,
  });
  await syncOutreachFromCall(updated);

  // Place the customer in the churn-rescue queue with a post-call status:
  //   completed (real conversation) -> 'new_renewal' (pending renewal action)
  //   non-conversation outcomes     -> 'monitor'     (watch + retry)
  if (updated.account_id) {
    await upsertChurnRescueStatus(
      updated.account_id,
      status === "completed" ? "new_renewal" : "monitor",
      updated.account_name,
    );
  }

  publish(callId, "status", { status });
  publish(callId, "ended", {
    status,
    disposition,
    summary,
    nextAction,
    durationMs,
  });
}

async function appendAndBroadcast(
  callId: string,
  segments: { speaker: Speaker; text: string; is_final?: boolean; ts_ms?: number | null }[],
): Promise<void> {
  const inserted = await appendSegments(callId, segments);
  for (const seg of inserted) publish(callId, "segment", seg);
}

/** Read the AccountSignal we stored in playbook when the call was created. */
async function findByIdSignal(callId: string): Promise<AccountSignal | null> {
  const { getVoiceCall } = await import("../db.js");
  const call = await getVoiceCall(callId);
  const pb = call?.playbook as Partial<AccountSignal> | undefined;
  if (pb && pb.accountName && pb.goal) return pb as AccountSignal;
  return null;
}

function extractTranscript(body: any): { speaker: Speaker; text: string }[] {
  const arr =
    body.transcript ??
    body.transcript_messages ??
    body.arguments?.transcript ??
    body.arguments?.transcript_messages ??
    [];
  if (!Array.isArray(arr)) return [];
  return arr
    .map((m: any) => {
      const role = String(m.role ?? m.speaker ?? "").toLowerCase();
      const speaker: Speaker =
        role === "user" || role === "customer" || role === "human" ? "customer" : "agent";
      const text = String(m.content ?? m.text ?? m.message ?? "").trim();
      return { speaker, text };
    })
    .filter((m: { text: string }) => m.text.length > 0);
}

function statusFromEndReason(reason: string): VoiceCallStatus {
  const r = reason.toLowerCase();
  if (r.includes("voicemail") || r.includes("machine")) return "voicemail";
  if (r.includes("no_answer") || r.includes("no-answer") || r.includes("noanswer")) return "no_answer";
  if (r.includes("busy")) return "no_answer";
  if (r.includes("fail") || r.includes("error")) return "failed";
  if (r.includes("cancel")) return "canceled";
  return "completed";
}

function dispositionFromStatus(status: VoiceCallStatus): VoiceDisposition {
  if (status === "voicemail") return "voicemail";
  if (status === "no_answer") return "no_answer";
  if (status === "failed" || status === "canceled") return "unknown";
  return "unknown";
}
