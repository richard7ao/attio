import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Card, Icon } from '../../design-system/index.js';
import { api } from '../../lib/api.js';

// ---------------------------------------------------------------------------
// Types (mirror the API response shapes; kept loose since the voice schema is
// owned by the voice service and not in the shared Zod schemas).
// ---------------------------------------------------------------------------
type CallStatus =
  | 'queued'
  | 'ringing'
  | 'in_progress'
  | 'completed'
  | 'no_answer'
  | 'voicemail'
  | 'failed'
  | 'canceled';

interface CallRow {
  id: string;
  account_name: string | null;
  contact_name: string | null;
  to_number: string | null;
  goal: string | null;
  status: CallStatus;
  disposition: string | null;
  summary: string | null;
  next_action: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_ms: number | null;
  created_at: string;
  segment_count: number;
  last_segment_text: string | null;
}

interface Segment {
  id: string;
  call_id: string;
  seq: number;
  speaker: 'agent' | 'customer' | 'system';
  text: string;
  is_final: boolean;
  ts_ms: number | null;
  created_at: string;
}

interface CallDetail extends CallRow {
  recording_url: string | null;
}

const TERMINAL = new Set<CallStatus>(['completed', 'no_answer', 'voicemail', 'failed', 'canceled']);
const LIVE: CallStatus[] = ['queued', 'ringing', 'in_progress'];

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

function statusTone(status: CallStatus): 'green' | 'amber' | 'red' | 'neutral' | 'accent' {
  if (status === 'completed') return 'green';
  if (LIVE.includes(status)) return 'accent';
  if (status === 'failed' || status === 'no_answer') return 'red';
  if (status === 'voicemail' || status === 'canceled') return 'amber';
  return 'neutral';
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtDuration(ms: number | null): string {
  if (ms == null) return '—';
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function CallsPage() {
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CallDetail | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [liveStatus, setLiveStatus] = useState<CallStatus | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // --- load call list ------------------------------------------------------
  const loadCalls = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ data: CallRow[] }>('/voice/calls');
      setCalls(res.data ?? []);
    } catch (err) {
      setError(String((err as Error).message ?? err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCalls();
  }, [loadCalls]);

  // auto-select the first call (prefer a live one)
  useEffect(() => {
    if (selectedId || calls.length === 0) return;
    const firstLive = calls.find((c) => LIVE.includes(c.status));
    setSelectedId((firstLive ?? calls[0]!).id);
  }, [calls, selectedId]);

  // --- load selected call + open SSE while it's live -----------------------
  useEffect(() => {
    esRef.current?.close();
    esRef.current = null;
    setDetail(null);
    setSegments([]);
    setLiveStatus(null);
    if (!selectedId) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await api<{ call: CallDetail; transcript: Segment[] }>(
          `/voice/calls/${selectedId}`,
        );
        if (cancelled) return;
        setDetail(res.call);
        setSegments(res.transcript ?? []);
        setLiveStatus(res.call.status);
        if (!TERMINAL.has(res.call.status)) openStream(selectedId);
      } catch (err) {
        if (!cancelled) setError(String((err as Error).message ?? err));
      }
    })();

    function openStream(id: string) {
      const es = new EventSource(`${API_BASE}/api/voice/calls/${id}/stream`);
      esRef.current = es;
      es.addEventListener('status', (e) => {
        try {
          setLiveStatus((JSON.parse((e as MessageEvent).data).status as CallStatus) ?? null);
        } catch {
          /* ignore */
        }
      });
      es.addEventListener('segment', (e) => {
        try {
          const seg = JSON.parse((e as MessageEvent).data) as Segment;
          setSegments((prev) => {
            if (prev.some((p) => p.seq === seg.seq)) return prev;
            return [...prev, seg].sort((a, b) => a.seq - b.seq);
          });
        } catch {
          /* ignore */
        }
      });
      es.addEventListener('ended', (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data);
          setLiveStatus((data.status as CallStatus) ?? null);
          setDetail((prev) =>
            prev
              ? {
                  ...prev,
                  status: data.status ?? prev.status,
                  disposition: data.disposition ?? prev.disposition,
                  summary: data.summary ?? prev.summary,
                  next_action: data.nextAction ?? prev.next_action,
                  ended_at: prev.ended_at ?? new Date().toISOString(),
                }
              : prev,
          );
        } catch {
          /* ignore */
        }
        es.close();
      });
      es.onerror = () => {
        // browser auto-reconnects; if the call ended the server closed and
        // reconnect will 404 -> keep going, the list refresh will reconcile.
      };
    }

    return () => {
      cancelled = true;
      esRef.current?.close();
      esRef.current = null;
    };
  }, [selectedId]);

  // refresh the list when a live call finishes so statuses reconcile
  useEffect(() => {
    if (liveStatus && TERMINAL.has(liveStatus)) {
      const t = setTimeout(() => void loadCalls(), 800);
      return () => clearTimeout(t);
    }
    return;
  }, [liveStatus, loadCalls]);

  // auto-scroll the transcript to the bottom as new segments arrive
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [segments]);

  const sortedCalls = useMemo(() => {
    return [...calls].sort((a, b) => {
      const aLive = LIVE.includes(a.status) ? 0 : 1;
      const bLive = LIVE.includes(b.status) ? 0 : 1;
      if (aLive !== bLive) return aLive - bLive;
      return b.created_at.localeCompare(a.created_at);
    });
  }, [calls]);

  const liveCount = calls.filter((c) => LIVE.includes(c.status)).length;
  const currentStatus = liveStatus ?? detail?.status ?? null;

  return (
    <div style={{ maxWidth: 1180, padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div
          style={{
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: 10,
            background: 'var(--accent-soft)',
            border: '1px solid var(--accent-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-text)',
          }}
        >
          <Icon name="phone-call" size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, font: 'var(--type-h2)' }}>Call Transcripts</h2>
          <p style={{ margin: '4px 0 0', font: 'var(--type-body-sm)', color: 'var(--text-tertiary)' }}>
            Live and past voice-agent calls, streamed from the transcript DB.
          </p>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            height: 28,
            padding: '0 11px',
            borderRadius: 999,
            border: '1px solid var(--border-default)',
            font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)',
            letterSpacing: '0.04em',
            color: 'var(--text-secondary)',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: liveCount > 0 ? 'var(--rag-green)' : 'var(--text-tertiary)',
              animation: liveCount > 0 ? 'pulseRing 2.4s infinite' : 'none',
            }}
          />
          {liveCount > 0 ? `${liveCount} LIVE` : 'NO ACTIVE CALLS'} · {calls.length} TOTAL
        </span>
      </div>

      {error ? (
        <Card tone="red">
          <div style={{ font: 'var(--weight-medium) var(--text-sm)' }}>Couldn’t load calls</div>
          <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-tertiary)', marginTop: 4 }}>
            {error}
          </div>
        </Card>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, minHeight: 520 }}>
        {/* --- call list --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
          {loading && calls.length === 0 ? (
            <Card style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading…</Card>
          ) : sortedCalls.length === 0 ? (
            <Card style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
              <div style={{ font: 'var(--type-title)', color: 'var(--text-secondary)' }}>No calls yet</div>
              <div style={{ font: 'var(--type-body-sm)', marginTop: 4 }}>
                Place a call from the voice service to see transcripts here.
              </div>
            </Card>
          ) : (
            sortedCalls.map((c) => {
              const active = c.id === selectedId;
              const isLive = LIVE.includes(c.status);
              return (
                <Card
                  key={c.id}
                  interactive
                  pad
                  tone={isLive ? 'accent' : 'none'}
                  style={{
                    cursor: 'pointer',
                    padding: '12px 14px',
                    outline: active ? '1px solid var(--accent)' : 'none',
                  }}
                  onClick={() => setSelectedId(c.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: isLive ? 'var(--rag-green)' : 'var(--text-tertiary)',
                        animation: isLive ? 'pulseRing 2.4s infinite' : 'none',
                      }}
                    />
                    <span
                      style={{
                        font: 'var(--weight-semibold) var(--text-sm)/1.2 var(--font-sans)',
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: 1,
                      }}
                    >
                      {c.account_name ?? 'Unknown account'}
                    </span>
                    <Badge tone={statusTone(c.status)} mono>
                      {c.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      font: 'var(--type-body-sm)',
                      color: 'var(--text-tertiary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {c.contact_name ?? '—'} · {fmtTime(c.created_at)} · {c.segment_count} turns
                  </div>
                  {c.last_segment_text ? (
                    <div
                      style={{
                        marginTop: 4,
                        font: 'var(--type-body-sm)',
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      “{c.last_segment_text}”
                    </div>
                  ) : null}
                </Card>
              );
            })
          )}
        </div>

        {/* --- transcript pane --- */}
        <Card pad={false} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {!detail ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-tertiary)',
                padding: 48,
              }}
            >
              Select a call to view its transcript.
            </div>
          ) : (
            <>
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ font: 'var(--type-title)', color: 'var(--text-primary)' }}>
                      {detail.account_name ?? 'Unknown account'}
                    </span>
                    {currentStatus ? (
                      <Badge tone={statusTone(currentStatus)} mono>
                        {currentStatus.replace('_', ' ')}
                      </Badge>
                    ) : null}
                    {detail.disposition ? (
                      <Badge tone="neutral" mono>
                        {detail.disposition.replace('_', ' ')}
                      </Badge>
                    ) : null}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      font: 'var(--type-body-sm)',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {detail.contact_name ?? '—'} · {detail.to_number ?? '—'} ·{' '}
                    {fmtTime(detail.started_at ?? detail.created_at)} ·{' '}
                    {fmtDuration(detail.duration_ms)}
                  </div>
                  {detail.goal ? (
                    <div
                      style={{
                        marginTop: 6,
                        font: 'var(--type-body-sm)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <strong style={{ color: 'var(--text-tertiary)' }}>Goal: </strong>
                      {detail.goal}
                    </div>
                  ) : null}
                </div>
              </div>

              <div
                ref={scrollRef}
                style={{
                  flex: 1,
                  overflow: 'auto',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  maxHeight: 'calc(100vh - 280px)',
                }}
              >
                {segments.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      color: 'var(--text-tertiary)',
                      padding: 32,
                      font: 'var(--type-body-sm)',
                    }}
                  >
                    {LIVE.includes(currentStatus ?? 'completed')
                      ? 'Waiting for the first transcript turn…'
                      : 'No transcript segments recorded.'}
                  </div>
                ) : (
                  segments.map((seg) => <SegmentBubble key={seg.id} seg={seg} />)
                )}
              </div>

              {(detail.summary || detail.next_action) && TERMINAL.has(currentStatus ?? 'completed') ? (
                <div
                  style={{
                    borderTop: '1px solid var(--border-subtle)',
                    padding: '14px 20px',
                    background: 'var(--surface-2)',
                  }}
                >
                  {detail.summary ? (
                    <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--text-tertiary)' }}>Summary: </strong>
                      {detail.summary}
                    </div>
                  ) : null}
                  {detail.next_action ? (
                    <div
                      style={{
                        marginTop: 6,
                        font: 'var(--type-body-sm)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <strong style={{ color: 'var(--text-tertiary)' }}>Next action: </strong>
                      {detail.next_action}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function SegmentBubble({ seg }: { seg: Segment }) {
  const isAgent = seg.speaker === 'agent';
  const isSystem = seg.speaker === 'system';
  if (isSystem) {
    return (
      <div
        style={{
          alignSelf: 'center',
          font: 'var(--weight-medium) var(--text-2xs)/1.3 var(--font-mono)',
          letterSpacing: '0.04em',
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          padding: '4px 10px',
          borderRadius: 999,
          border: '1px dashed var(--border-default)',
        }}
      >
        {seg.text}
      </div>
    );
  }
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isAgent ? 'flex-start' : 'flex-end',
        maxWidth: '80%',
        alignSelf: isAgent ? 'flex-start' : 'flex-end',
      }}
    >
      <span
        style={{
          font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)',
          letterSpacing: '0.04em',
          color: 'var(--text-tertiary)',
          marginBottom: 4,
          textTransform: 'uppercase',
        }}
      >
        {isAgent ? 'Agent' : 'Customer'}
        {!seg.is_final ? ' · typing…' : ''}
      </span>
      <div
        style={{
          padding: '10px 14px',
          borderRadius: 12,
          border: '1px solid var(--border-subtle)',
          background: isAgent ? 'var(--surface-1)' : 'var(--accent-soft)',
          color: isAgent ? 'var(--text-primary)' : 'var(--accent-text)',
          font: 'var(--type-body-sm)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {seg.text}
      </div>
    </div>
  );
}
