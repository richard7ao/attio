/**
 * Thin SLNG client. SLNG runs the conversation LLM + STT + TTS itself; we only
 * (a) dispatch the call with template `arguments`, and (b) read the call object.
 * Docs: https://docs.slng.ai
 */
import { config, requireEnv } from "./config.js";
import { log } from "./logger.js";

export interface DispatchCallParams {
  phoneNumber: string; // E.164
  arguments?: Record<string, string>;
  agentId?: string; // defaults to config.slng.agentId
}

export interface DispatchCallResult {
  callId: string;
  raw: unknown;
}

/** Subset of the SLNG call object we care about (see GET /v1/calls/{id}). */
export interface SlngCall {
  id: string;
  status?: string;
  call_started_at?: string | null;
  call_ended_at?: string | null;
  call_duration_ms?: number | null;
  call_end_reason?: string | null;
  livekit_room_name?: string | null;
  rendered_prompt?: string | null;
  [k: string]: unknown;
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${requireEnv(config.slng.apiKey, "SLNG_API_KEY")}`,
    "Content-Type": "application/json",
  };
}

/** Dispatch an outbound call. POST /v1/agents/{agentId}/calls */
export async function dispatchCall(params: DispatchCallParams): Promise<DispatchCallResult> {
  const agentId = requireEnv(params.agentId ?? config.slng.agentId, "SLNG_AGENT_ID");
  const url = `${config.slng.apiBase}/v1/agents/${agentId}/calls`;

  const body: Record<string, unknown> = {
    phone_number: params.phoneNumber,
    arguments: params.arguments ?? {},
  };
  // If SLNG needs the trunk on dispatch (vs. agent config), include it.
  if (config.slng.sipOutboundTrunkId) {
    body.sip_outbound_trunk_id = config.slng.sipOutboundTrunkId;
  }

  const res = await fetch(url, { method: "POST", headers: headers(), body: JSON.stringify(body) });
  const text = await res.text();
  const json = text ? safeJson(text) : {};
  if (!res.ok) {
    log.error({ status: res.status, body: text }, "SLNG dispatch failed");
    throw new Error(`SLNG dispatch failed (${res.status}): ${text}`);
  }
  const callId = (json as any)?.call_id ?? (json as any)?.id;
  if (!callId) throw new Error(`SLNG dispatch returned no call_id: ${text}`);
  return { callId, raw: json };
}

/** Fetch a call object. GET /v1/calls/{id} */
export async function getCall(callId: string): Promise<SlngCall> {
  const url = `${config.slng.apiBase}/v1/calls/${callId}`;
  const res = await fetch(url, { headers: headers() });
  const text = await res.text();
  if (!res.ok) throw new Error(`SLNG getCall failed (${res.status}): ${text}`);
  return safeJson(text) as SlngCall;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}
