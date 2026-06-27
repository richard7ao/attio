// Polyfill WebSocket for Node < 22 — @supabase/realtime-js requires native
// WebSocket (only in Node 22+) or a `ws` fallback. Without this, createClient
// crashes on Node 20 with "Node.js 20 detected without native WebSocket support".
import WebSocket from "ws";
if (typeof (globalThis as any).WebSocket === "undefined") {
  (globalThis as any).WebSocket = WebSocket;
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config, requireEnv } from "./config.js";
import { log } from "./logger.js";
import type {
  Speaker,
  TranscriptSegment,
  VoiceCall,
  VoiceCallStatus,
} from "./types.js";

let client: SupabaseClient | null = null;

/** Lazily-created service-role client (bypasses RLS — server-side only). */
export function db(): SupabaseClient {
  if (!client) {
    client = createClient(
      requireEnv(config.supabase.url, "SUPABASE_URL"),
      requireEnv(config.supabase.serviceRoleKey, "SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return client;
}

export interface CreateVoiceCallInput {
  user_id: string;
  account_id?: string | null;
  account_name?: string | null;
  contact_name?: string | null;
  to_number: string;
  from_number?: string | null;
  goal?: string | null;
  playbook?: Record<string, unknown>;
}

/**
 * Create a voice_calls row AND a linked outreach row (channel='voice') so the
 * call shows up in the unified team feed. Returns the voice call.
 */
export async function createVoiceCall(input: CreateVoiceCallInput): Promise<VoiceCall> {
  const sb = db();

  const { data: outreach, error: oErr } = await sb
    .from("outreach")
    .insert({
      user_id: input.user_id,
      channel: "voice",
      status: "pending",
      recipient: input.to_number,
      subject: input.goal ?? "Voice outreach",
      metadata: { account_name: input.account_name, contact_name: input.contact_name },
    })
    .select("id")
    .single();
  if (oErr) throw oErr;

  const { data, error } = await sb
    .from("voice_calls")
    .insert({
      user_id: input.user_id,
      outreach_id: outreach.id,
      account_id: input.account_id ?? null,
      account_name: input.account_name ?? null,
      contact_name: input.contact_name ?? null,
      to_number: input.to_number,
      from_number: input.from_number ?? null,
      goal: input.goal ?? null,
      playbook: input.playbook ?? {},
      status: "queued",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as VoiceCall;
}

export async function updateVoiceCall(
  id: string,
  patch: Partial<VoiceCall>,
): Promise<VoiceCall> {
  const { data, error } = await db()
    .from("voice_calls")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as VoiceCall;
}

/** Mirror selected status/summary fields onto the linked outreach row. */
export async function syncOutreachFromCall(call: VoiceCall): Promise<void> {
  if (!call.outreach_id) return;
  const statusMap: Record<VoiceCallStatus, string> = {
    queued: "pending",
    ringing: "sent",
    in_progress: "sent",
    completed: "replied",
    no_answer: "failed",
    voicemail: "delivered",
    failed: "failed",
    canceled: "archived",
  };
  const { error } = await db()
    .from("outreach")
    .update({
      status: statusMap[call.status],
      metadata: {
        account_name: call.account_name,
        contact_name: call.contact_name,
        disposition: call.disposition,
        summary: call.summary,
        next_action: call.next_action,
        voice_call_id: call.id,
      },
    })
    .eq("id", call.outreach_id);
  if (error) log.error({ err: error }, "failed to sync outreach from call");
}

/**
 * Upsert a customer into churn_rescue_queue with a post-call status.
 * Called by the SLNG call_end listener:
 *   - completed (real conversation) -> 'new_renewal' (pending renewal action)
 *   - non-conversation outcomes          -> 'monitor'    (watch + retry)
 * No-op when accountId is absent (can't link the call to a customer).
 */
export async function upsertChurnRescueStatus(
  accountId: string,
  status: "new_renewal" | "monitor",
  companyName?: string | null,
): Promise<void> {
  const { error } = await db()
    .from("churn_rescue_queue")
    .upsert(
      {
        account_id: accountId,
        company_name: companyName ?? null,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "account_id" },
    );
  if (error) log.error({ err: error, accountId, status }, "failed to upsert churn_rescue_queue");
}

export async function getVoiceCall(id: string): Promise<VoiceCall | null> {
  const { data, error } = await db().from("voice_calls").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as VoiceCall) ?? null;
}

export async function findCallByProviderId(providerCallId: string): Promise<VoiceCall | null> {
  const { data, error } = await db()
    .from("voice_calls")
    .select("*")
    .eq("provider_call_id", providerCallId)
    .maybeSingle();
  if (error) throw error;
  return (data as VoiceCall) ?? null;
}

export async function listVoiceCalls(limit = 50): Promise<VoiceCall[]> {
  const { data, error } = await db()
    .from("voice_calls")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as VoiceCall[]) ?? [];
}

export async function getTranscript(callId: string): Promise<TranscriptSegment[]> {
  const { data, error } = await db()
    .from("voice_transcript_segments")
    .select("*")
    .eq("call_id", callId)
    .order("seq", { ascending: true });
  if (error) throw error;
  return (data as TranscriptSegment[]) ?? [];
}

export interface NewSegment {
  speaker: Speaker;
  text: string;
  is_final?: boolean;
  ts_ms?: number | null;
}

/**
 * Append transcript segments, auto-assigning `seq` after the current max.
 * Returns the inserted rows (with their assigned seq) so callers can broadcast.
 */
export async function appendSegments(
  callId: string,
  segments: NewSegment[],
): Promise<TranscriptSegment[]> {
  if (segments.length === 0) return [];
  const sb = db();

  const { data: maxRow, error: maxErr } = await sb
    .from("voice_transcript_segments")
    .select("seq")
    .eq("call_id", callId)
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxErr) throw maxErr;

  let seq = (maxRow?.seq ?? -1) + 1;
  const rows = segments.map((s) => ({
    call_id: callId,
    seq: seq++,
    speaker: s.speaker,
    text: s.text,
    is_final: s.is_final ?? true,
    ts_ms: s.ts_ms ?? null,
  }));

  const { data, error } = await sb.from("voice_transcript_segments").insert(rows).select("*");
  if (error) throw error;
  return (data as TranscriptSegment[]) ?? [];
}
