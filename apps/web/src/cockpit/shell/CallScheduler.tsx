import { useEffect, useMemo, useState } from 'react';
import { Button, Icon, IconButton, Input } from '../../design-system/index.js';
import { formatCallWhen, formatRelative, toLocalInputValue } from '../domain/calls.js';
import { useCockpit } from '../state/CockpitProvider.js';

/** Outer guard: only mount the dialog (and its hooks/state) while a target is set. */
export function CallScheduler() {
  const { callScheduler } = useCockpit();
  if (!callScheduler) return null;
  return <CallSchedulerDialog key={`${callScheduler.accountId}:${callScheduler.feedId ?? ''}`} />;
}

interface PresetOption {
  key: string;
  label: string;
  sub: string;
  at: number | null; // null = call now
}

function CallSchedulerDialog() {
  const { callScheduler, accountById, confirmCall, closeCallScheduler, theme } = useCockpit();
  const account = callScheduler ? accountById(callScheduler.accountId) : undefined;

  // Presets are pinned at mount so they don't drift while the dialog is open.
  const presets = useMemo<PresetOption[]>(() => {
    const now = Date.now();
    const HR = 3600000;
    const t9 = new Date(now);
    t9.setDate(t9.getDate() + 1);
    t9.setHours(9, 0, 0, 0);
    return [
      { key: 'now', label: 'Call now', sub: 'Dispatch immediately', at: null },
      { key: '1h', label: 'In 1 hour', sub: formatCallWhen(now + HR, now), at: now + HR },
      { key: '3h', label: 'In 3 hours', sub: formatCallWhen(now + 3 * HR, now), at: now + 3 * HR },
      { key: 'tmrw', label: 'Tomorrow 9 AM', sub: formatCallWhen(t9.getTime(), now), at: t9.getTime() },
    ];
  }, []);

  const [sel, setSel] = useState<string>('now');
  const [customStr, setCustomStr] = useState('');
  const minLocal = useMemo(() => toLocalInputValue(Date.now()), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCallScheduler();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeCallScheduler]);

  if (!callScheduler) return null;

  const customAt = customStr ? new Date(customStr).getTime() : NaN;
  const customValid = sel === 'custom' && !Number.isNaN(customAt) && customAt > Date.now() - 60000;
  const chosenAt =
    sel === 'now'
      ? Date.now()
      : sel === 'custom'
        ? customAt
        : (presets.find((p) => p.key === sel)?.at ?? Date.now());

  const immediate = sel === 'now';
  const canConfirm = sel !== 'custom' || customValid;

  const confirm = () => {
    if (!canConfirm) return;
    confirmCall(callScheduler.accountId, immediate ? Date.now() : chosenAt, callScheduler.feedId);
  };

  const now = Date.now();
  const previewLabel = immediate
    ? 'Dispatches now via Twilio voice agent'
    : sel === 'custom'
      ? customValid
        ? `${formatCallWhen(customAt, now)} · ${formatRelative(customAt, now)}`
        : 'Pick a future date and time'
      : `${formatCallWhen(chosenAt, now)} · ${formatRelative(chosenAt, now)}`;

  return (
    <div
      onClick={closeCallScheduler}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--scrim-strong, rgba(8,15,28,0.55))',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Schedule call"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 440,
          maxWidth: '100%',
          borderRadius: 16,
          background: 'var(--surface-1)',
          border: '1px solid var(--border-strong)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          animation: 'riseIn .18s var(--ease-out, ease)',
        }}
      >
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 9, background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-text)' }}>
            <Icon name="phone-call" size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: 'var(--type-title)' }}>Schedule call</div>
            <div style={{ font: 'var(--weight-medium) var(--text-2xs)/1.3 var(--font-mono)', color: 'var(--text-tertiary)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {account ? `${account.name.toUpperCase()} · ${account.contact.name}` : 'OUTBOUND CALL'}
            </div>
          </div>
          <IconButton variant="ghost" size="sm" aria-label="Close" onClick={closeCallScheduler}>
            <Icon name="x" size={16} />
          </IconButton>
        </div>

        {/* body */}
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {account ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: 'var(--weight-medium) var(--text-sm)/1 var(--font-mono)', color: 'var(--text-secondary)' }}>
              <Icon name="phone" size={14} color="var(--text-tertiary)" />
              {account.contact.phone}
            </div>
          ) : null}

          <div>
            <div style={labelStyle}>WHEN</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 9 }}>
              {presets.map((p) => (
                <PresetButton key={p.key} option={p} active={sel === p.key} onClick={() => setSel(p.key)} />
              ))}
            </div>
          </div>

          <div>
            <button
              onClick={() => setSel('custom')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: sel === 'custom' ? 'var(--accent-text)' : 'var(--text-tertiary)',
                font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)',
                letterSpacing: 'var(--tracking-label)',
              }}
            >
              <Icon name="calendar-clock" size={13} />
              PICK A SPECIFIC TIME
            </button>
            <div style={{ marginTop: 9, colorScheme: theme } as React.CSSProperties}>
              <Input
                type="datetime-local"
                value={customStr}
                min={minLocal}
                invalid={sel === 'custom' && customStr !== '' && !customValid}
                icon={<Icon name="calendar" size={15} />}
                onChange={(e) => {
                  setCustomStr(e.target.value);
                  setSel('custom');
                }}
                style={{ colorScheme: theme } as React.CSSProperties}
              />
            </div>
          </div>

          {/* preview */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '11px 13px',
              borderRadius: 10,
              background: immediate ? 'var(--rag-green-soft)' : 'var(--accent-soft)',
              border: `1px solid ${immediate ? 'var(--rag-green-border)' : 'var(--accent-border)'}`,
            }}
          >
            <Icon name={immediate ? 'phone-outgoing' : 'clock'} size={15} color={immediate ? 'var(--rag-green-text)' : 'var(--accent-text)'} />
            <span style={{ font: 'var(--weight-medium) var(--text-sm)/1.2 var(--font-sans)', color: immediate ? 'var(--rag-green-text)' : 'var(--accent-text)' }}>
              {previewLabel}
            </span>
          </div>
        </div>

        {/* footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '14px 18px', borderTop: '1px solid var(--border-subtle)' }}>
          <Button variant="ghost" size="md" onClick={closeCallScheduler}>
            Cancel
          </Button>
          <Button variant="primary" size="md" disabled={!canConfirm} icon={<Icon name="phone-call" size={16} />} onClick={confirm}>
            {immediate ? 'Place Call' : 'Schedule Call'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PresetButton({ option, active, onClick }: { option: PresetOption; active: boolean; onClick: () => void }) {
  const isNow = option.at === null;
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 3,
        padding: '9px 11px',
        borderRadius: 10,
        cursor: 'pointer',
        textAlign: 'left',
        background: active ? 'var(--accent-soft)' : 'var(--surface-inset)',
        border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border-default)'}`,
        color: active ? 'var(--accent-text)' : 'var(--text-secondary)',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, font: 'var(--weight-semibold) var(--text-sm)/1 var(--font-sans)' }}>
        {isNow ? <Icon name="zap" size={13} /> : null}
        {option.label}
      </span>
      <span style={{ font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)', color: 'var(--text-tertiary)' }}>{option.sub}</span>
    </button>
  );
}

const labelStyle: React.CSSProperties = {
  font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)',
  letterSpacing: 'var(--tracking-label)',
  color: 'var(--text-tertiary)',
};
