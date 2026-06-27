export type VoiceCallStatus =
  | "queued"
  | "ringing"
  | "in_progress"
  | "completed"
  | "no_answer"
  | "voicemail"
  | "failed"
  | "canceled";

export type VoiceDisposition =
  | "renewed"
  | "upsell_agreed"
  | "callback_scheduled"
  | "info_sent"
  | "not_interested"
  | "no_answer"
  | "voicemail"
  | "do_not_call"
  | "needs_human"
  | "unknown";

export type Speaker = "agent" | "customer" | "system";

/** A renewal/upsell signal — the reason we're calling. Mock or CRM-sourced. */
export interface AccountSignal {
  accountId?: string;
  accountName: string;
  contactName: string;
  toNumber: string; // E.164
  plan?: string;
  seats?: number;
  mrr?: number;
  renewalDate?: string; // ISO date
  usageTrend?: "up" | "flat" | "down";
  healthScore?: number; // 0-100
  goal: string; // e.g. "secure annual renewal and pitch the Scale tier"
  notes?: string;
}

export interface VoiceCall {
  id: string;
  user_id: string;
  outreach_id: string | null;
  account_id: string | null;
  account_name: string | null;
  contact_name: string | null;
  to_number: string;
  from_number: string | null;
  goal: string | null;
  playbook: Record<string, unknown>;
  provider: string;
  provider_call_id: string | null;
  livekit_room_name: string | null;
  status: VoiceCallStatus;
  disposition: VoiceDisposition | null;
  call_end_reason: string | null;
  summary: string | null;
  next_action: string | null;
  recording_url: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_ms: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TranscriptSegment {
  id: string;
  call_id: string;
  seq: number;
  speaker: Speaker;
  text: string;
  is_final: boolean;
  ts_ms: number | null;
  created_at: string;
}

/** What the agent brain produces to drive a call (filled into SLNG `arguments`). */
export interface CallPlan {
  /** Template variables injected into the SLNG agent prompt ({{key}}). */
  arguments: Record<string, string>;
  /** Human-readable talking points (also stored on the call for the demo page). */
  talkingPoints: string[];
}

/** What the brain produces from a finished transcript. */
export interface CallSummary {
  summary: string;
  disposition: VoiceDisposition;
  nextAction: string;
}
