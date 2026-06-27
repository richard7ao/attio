import { type SignalDirection, type SignalSeverity, type SignalType } from '@attio/shared';
import { type HealthTier, type BoardTier } from './health.js';

/** A signal as seeded/ingested, before classification metadata is attached. */
export interface AccountSignalInput {
  type: SignalType;
  note: string;
  detected: string;
}

/** A signal once classified (direction/severity/weight resolved from the catalog). */
export interface AccountSignal extends AccountSignalInput {
  direction: SignalDirection;
  severity: SignalSeverity;
  weight: number;
}

export interface ContactInfo {
  name: string;
  title: string;
  phone: string;
  email: string;
}

/** Raw account shape — what a data source (seed or API) provides. */
export interface AccountInput {
  id: string;
  name: string;
  domain: string;
  owner: string;
  arr: number;
  seats: number;
  seatsUsed: number;
  renewalDays: number;
  contact: ContactInfo;
  signals: AccountSignalInput[];
  usage: number[];
  expansion: number;
  /** Optional health override from the API (e.g. 'pending' for post-call monitoring). */
  health?: BoardTier;
}

export interface TimelineEntry {
  channel: string;
  title: string;
  time: string;
  body: string;
  actor?: string;
  last?: boolean;
}

/** A fully-computed account view model — everything the pages render. */
export interface AccountVM {
  id: string;
  name: string;
  domain: string;
  owner: string;
  arr: number;
  seats: number;
  seatsUsed: number;
  renewalDays: number;
  expansion: number;
  usage: number[];
  health: BoardTier;
  arrLabel: string;
  mrrSub: string;
  seatPct: number;
  seatPctLabel: string;
  seatLabel: string;
  signals: AccountSignal[];
  signalLine: string;
  healthLabel: string;
  renewalShort: string;
  renewalLabel: string;
  renewalDate: string;
  attio: string;
  contact: ContactInfo;
  usageDelta: string;
  usageDir: 'up' | 'down' | 'flat';
  timeline: TimelineEntry[];
}

export type FeedIntent = 'risk' | 'opportunity' | 'neutral';
export type FeedActor = 'ai' | 'human';

/** A seeded Action-Agent feed item, before it's joined to its account. */
export interface FeedSeed {
  id: string;
  accountId: string;
  category: string;
  intent: FeedIntent;
  actor: FeedActor;
  time: string;
  title: string;
  body: string;
  script: string | null;
  primaryLabel: string;
  /** Live escalation id, when this item came from the backend (enables ack). */
  escalationId?: string;
}

/** How a feed item was resolved (drives the "Resolved" tab). */
export type FeedResolution = 'call' | 'email' | 'sms' | 'dismissed';

/** Lifecycle of a voice call in the Call Log. */
export type CallStatus = 'scheduled' | 'live' | 'completed' | 'missed';

/** A single voice-call record — past, ongoing, or scheduled. */
export interface CallRecord {
  id: string;
  accountId: string;
  accountName: string;
  contact: string;
  phone: string;
  owner: string;
  intent: FeedIntent;
  status: CallStatus;
  /** Why the call was placed (signal line / outreach reason). */
  reason: string;
  /** Epoch ms — scheduled time (scheduled), start time (live), or end time (completed/missed). */
  at: number;
  /** Talk time in seconds, for completed calls. */
  durationSec?: number;
  /** Result summary, for completed/missed calls. */
  outcome?: string;
}

export interface CockpitUser {
  name: string;
  role: string;
  email: string;
}

export interface Integration {
  key: string;
  name: string;
  desc: string;
  status: string;
}
