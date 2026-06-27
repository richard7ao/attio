import { type CallStatus, type FeedIntent } from './types.js';

export interface CallStatusMeta {
  label: string;
  dot: string;
  soft: string;
  text: string;
}

/** Visual treatment per call lifecycle state, against the RAG token backbone. */
export const CALL_STATUS_META: Record<CallStatus, CallStatusMeta> = {
  live: { label: 'Live', dot: 'var(--rag-green)', soft: 'var(--rag-green-soft)', text: 'var(--rag-green-text)' },
  scheduled: { label: 'Scheduled', dot: 'var(--accent)', soft: 'var(--accent-soft)', text: 'var(--accent-text)' },
  completed: { label: 'Completed', dot: 'var(--slate-500)', soft: 'var(--surface-2)', text: 'var(--text-secondary)' },
  missed: { label: 'Missed', dot: 'var(--rag-red)', soft: 'var(--rag-red-soft)', text: 'var(--rag-red-text)' },
};

/** Accent colour for a call's intent, mirroring the feed item treatment. */
export function intentColor(intent: FeedIntent): string {
  if (intent === 'risk') return 'var(--rag-red)';
  if (intent === 'opportunity') return 'var(--rag-green)';
  return 'var(--accent)';
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function clock(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Format a `<input type="datetime-local">` value (local time, minute precision). */
export function toLocalInputValue(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Calendar-style label: "Today 14:30", "Tomorrow 09:00", "Yesterday 16:20", "Jun 30 09:00". */
export function formatCallWhen(at: number, now: number): string {
  const d = new Date(at);
  const n = new Date(now);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayDiff = Math.round((startOf(d) - startOf(n)) / 86400000);
  const t = clock(d);
  if (dayDiff === 0) return `Today ${t}`;
  if (dayDiff === 1) return `Tomorrow ${t}`;
  if (dayDiff === -1) return `Yesterday ${t}`;
  const date = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${date} ${t}`;
}

/** Relative label: "in 35 min", "in 3 hrs", "2 days ago", "just now". */
export function formatRelative(at: number, now: number): string {
  const diff = at - now;
  const mins = Math.round(Math.abs(diff) / 60000);
  const unit = (n: number, u: string) => `${n} ${u}${n === 1 ? '' : 's'}`;
  let label: string;
  if (mins < 1) return 'just now';
  if (mins < 60) label = unit(mins, 'min');
  else if (mins < 1440) label = unit(Math.round(mins / 60), 'hr');
  else label = unit(Math.round(mins / 1440), 'day');
  return diff >= 0 ? `in ${label}` : `${label} ago`;
}

/** Talk-time label from seconds: "8m 32s", "47s". */
export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m === 0 ? `${s}s` : `${m}m ${pad(s)}s`;
}
