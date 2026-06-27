import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Button, Icon, StatCard, Tabs } from '../../design-system/index.js';
import {
  CALL_STATUS_META,
  formatCallWhen,
  formatDuration,
  formatRelative,
  intentColor,
} from '../domain/calls.js';
import { type CallRecord } from '../domain/types.js';
import { useCockpit } from '../state/CockpitProvider.js';

type CallTab = 'all' | 'scheduled' | 'live' | 'completed';

export function CallLogPage() {
  const { calls, settings } = useCockpit();
  const [tab, setTab] = useState<CallTab>('all');
  const now = Date.now();

  const counts = useMemo(
    () => ({
      all: calls.length,
      scheduled: calls.filter((c) => c.status === 'scheduled').length,
      live: calls.filter((c) => c.status === 'live').length,
      completed: calls.filter((c) => c.status === 'completed' || c.status === 'missed').length,
    }),
    [calls],
  );

  const talkTime = useMemo(
    () => calls.reduce((t, c) => t + (c.durationSec ?? 0), 0),
    [calls],
  );

  // Upcoming sorted soonest-first; history most-recent-first.
  const list = useMemo(() => {
    const isHistory = (c: CallRecord) => c.status === 'completed' || c.status === 'missed';
    const filtered = calls.filter((c) => {
      if (tab === 'all') return true;
      if (tab === 'completed') return isHistory(c);
      return c.status === tab;
    });
    const rank = (c: CallRecord) => (c.status === 'live' ? 0 : c.status === 'scheduled' ? 1 : 2);
    return [...filtered].sort((a, b) => {
      if (tab === 'all' && rank(a) !== rank(b)) return rank(a) - rank(b);
      const upcoming = !isHistory(a) && !isHistory(b);
      return upcoming ? a.at - b.at : b.at - a.at;
    });
  }, [calls, tab]);

  const pulseAnim = settings.pulse ? 'pulseRing 2.4s infinite' : 'none';

  return (
    <div style={{ maxWidth: 920, padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 10, background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-text)' }}>
          <Icon name="phone-call" size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, font: 'var(--type-h2)' }}>Call Log</h2>
          <p style={{ margin: '4px 0 0', font: 'var(--type-body-sm)', color: 'var(--text-tertiary)' }}>
            Past, ongoing, and scheduled calls · Twilio voice agent
          </p>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 28, padding: '0 11px', borderRadius: 999, border: '1px solid var(--border-default)', font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: counts.live > 0 ? 'var(--rag-green)' : 'var(--slate-500)', animation: counts.live > 0 ? pulseAnim : 'none' }} />
          {counts.live > 0 ? `${counts.live} LIVE` : 'IDLE'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatCard label="Live Now" value={String(counts.live)} sub="on a call" tone={counts.live > 0 ? 'green' : 'none'} icon={<Icon name="radio" size={14} />} />
        <StatCard label="Scheduled" value={String(counts.scheduled)} sub="upcoming" tone="accent" icon={<Icon name="calendar-clock" size={14} />} />
        <StatCard label="Completed" value={String(counts.completed)} sub="logged" icon={<Icon name="check-check" size={14} />} />
        <StatCard label="Talk Time" value={formatDuration(talkTime)} sub="total connected" icon={<Icon name="clock" size={14} />} />
      </div>

      <Tabs
        tabs={[
          { value: 'all', label: 'All', count: counts.all },
          { value: 'scheduled', label: 'Scheduled', count: counts.scheduled },
          { value: 'live', label: 'Live', count: counts.live },
          { value: 'completed', label: 'History', count: counts.completed },
        ]}
        value={tab}
        onChange={(v) => setTab(v as CallTab)}
      />

      {list.length === 0 ? (
        <div style={{ border: '1px dashed var(--border-default)', borderRadius: 12, padding: 48, textAlign: 'center', color: 'var(--text-tertiary)' }}>
          <div style={{ font: 'var(--type-title)', color: 'var(--text-secondary)' }}>No calls here</div>
          <div style={{ font: 'var(--type-body-sm)', marginTop: 4 }}>
            Place or schedule a call from the Action Feed or an account page.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((c) => (
            <CallRow key={c.id} call={c} now={now} pulseAnim={pulseAnim} />
          ))}
        </div>
      )}
    </div>
  );
}

function CallRow({ call, now, pulseAnim }: { call: CallRecord; now: number; pulseAnim: string }) {
  const navigate = useNavigate();
  const { startCall, cancelCall } = useCockpit();
  const meta = CALL_STATUS_META[call.status];
  const live = call.status === 'live';
  const scheduled = call.status === 'scheduled';

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        border: `1px solid ${live ? 'var(--rag-green-border)' : 'var(--border-subtle)'}`,
        borderRadius: 12,
        background: 'var(--surface-1)',
        boxShadow: live ? 'none' : 'var(--edge-light)',
        padding: '14px 16px 14px 17px',
        overflow: 'hidden',
      }}
    >
      <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: intentColor(call.intent) }} />

      {/* status */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 76, flexShrink: 0 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, font: 'var(--weight-semibold) var(--text-2xs)/1 var(--font-mono)', letterSpacing: 'var(--tracking-label)', color: meta.text }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta.dot, animation: live ? pulseAnim : 'none' }} />
          {meta.label.toUpperCase()}
        </span>
      </div>

      {/* body */}
      <button
        onClick={() => navigate(`/account/${call.accountId}`)}
        style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ font: 'var(--weight-semibold) var(--text-sm)/1.2 var(--font-sans)', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {call.accountName}
          </span>
          <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{call.contact}</span>
        </div>
        <div style={{ font: 'var(--type-body-sm)/1.4', color: 'var(--text-secondary)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {call.outcome ?? call.reason}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <Avatar name={call.owner} size={18} />
          <span style={{ font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)', color: 'var(--text-tertiary)' }}>{call.owner}</span>
          <span style={{ color: 'var(--border-strong)' }}>·</span>
          <span style={{ font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)', color: 'var(--text-tertiary)' }}>{call.phone}</span>
        </div>
      </button>

      {/* right: timing + actions */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ font: 'var(--weight-semibold) var(--text-sm)/1 var(--font-sans)', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
            {live ? 'On call' : call.durationSec != null ? formatDuration(call.durationSec) : formatCallWhen(call.at, now)}
          </div>
          <div style={{ font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)', color: scheduled ? 'var(--accent-text)' : 'var(--text-tertiary)', marginTop: 4, whiteSpace: 'nowrap' }}>
            {formatRelative(call.at, now)}
          </div>
        </div>
        {scheduled ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Button variant="secondary" size="sm" icon={<Icon name="phone-outgoing" size={14} />} onClick={() => startCall(call.id)}>
              Call now
            </Button>
            <Button variant="ghost" size="sm" onClick={() => cancelCall(call.id)}>
              Cancel
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
