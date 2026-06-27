import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilterChip, Icon, SignalChip, StatCard } from '../../design-system/index.js';
import { signalDirection, signalSeverity, signalWeight } from '../domain/health.js';
import { useCockpit } from '../state/CockpitProvider.js';

type SignalFilter = 'all' | 'risk' | 'opportunity';

interface SignalRow {
  id: string;
  accountId: string;
  accName: string;
  type: string;
  note: string;
  detected: string;
  direction: string;
  severity: string;
  weight: number;
}

export function SignalsPage() {
  const { accounts, visibleAccounts, settings } = useCockpit();
  const navigate = useNavigate();
  const [signalFilter, setSignalFilter] = useState<SignalFilter>('all');

  const rows = useMemo(() => {
    const out: SignalRow[] = [];
    for (const a of visibleAccounts) {
      a.signals.forEach((s, i) => {
        out.push({
          id: `${a.id}-${i}`,
          accountId: a.id,
          accName: a.name,
          type: s.type,
          note: s.note,
          detected: s.detected,
          direction: signalDirection(s.type),
          severity: signalSeverity(s.type),
          weight: signalWeight(s.type),
        });
      });
    }
    out.sort((x, y) => y.weight - x.weight);
    return out;
  }, [visibleAccounts]);

  const riskRows = rows.filter((r) => r.direction === 'risk');
  const oppRows = rows.filter((r) => r.direction === 'opportunity');
  const majorCount = rows.filter((r) => r.severity === 'major').length;
  const riskWeight = riskRows.reduce((t, r) => t + r.weight, 0);

  const filtered = signalFilter === 'all' ? rows : rows.filter((r) => r.direction === signalFilter);

  const pulseAnim = settings.pulse ? 'pulseRing 2.4s infinite' : 'none';

  return (
    <div style={{ maxWidth: 1320, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
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
          <Icon name="radar" size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, font: 'var(--type-h2)' }}>Signals</h2>
          <p style={{ margin: '4px 0 0', font: 'var(--type-body-sm)', color: 'var(--text-tertiary)' }}>
            Live detections from the signals engine across {accounts.length} accounts
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
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--rag-green)', animation: pulseAnim }} />
          ENGINE LIVE
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatCard label="Total Signals" value={String(rows.length)} sub="this cycle" />
        <StatCard label="Risk Signals" value={String(riskRows.length)} sub={`weight ${riskWeight}`} tone="red" />
        <StatCard label="Opportunity" value={String(oppRows.length)} sub="expansion intent" tone="green" />
        <StatCard label="Major Severity" value={String(majorCount)} sub="act first" tone="amber" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <FilterChip active={signalFilter === 'all'} count={rows.length} onClick={() => setSignalFilter('all')}>
          All signals
        </FilterChip>
        <FilterChip
          active={signalFilter === 'risk'}
          dot="red"
          count={riskRows.length}
          onClick={() => setSignalFilter((f) => (f === 'risk' ? 'all' : 'risk'))}
        >
          Risk
        </FilterChip>
        <FilterChip
          active={signalFilter === 'opportunity'}
          dot="green"
          count={oppRows.length}
          onClick={() => setSignalFilter((f) => (f === 'opportunity' ? 'all' : 'opportunity'))}
        >
          Opportunity
        </FilterChip>
      </div>

      <div
        style={{
          border: '1px solid var(--border-default)',
          borderRadius: 12,
          background: 'var(--surface-1)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)' }}>
              {(['SIGNAL', 'ACCOUNT', 'DETAIL'] as const).map((label) => (
                <th
                  key={label}
                  style={{
                    textAlign: 'left',
                    padding: '11px 16px',
                    font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)',
                    letterSpacing: 'var(--tracking-label)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {label}
                </th>
              ))}
              <th
                style={{
                  textAlign: 'right',
                  padding: '11px 16px',
                  font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)',
                  letterSpacing: 'var(--tracking-label)',
                  color: 'var(--text-tertiary)',
                }}
              >
                DETECTED
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <SignalTableRow key={s.id} signal={s} onOpen={() => navigate(`/account/${s.accountId}`)} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SignalTableRow({ signal, onOpen }: { signal: SignalRow; onOpen: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <tr
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderTop: '1px solid var(--border-subtle)',
        cursor: 'pointer',
        background: hover ? 'var(--surface-2)' : 'transparent',
      }}
    >
      <td style={{ padding: '12px 16px' }}>
        <SignalChip type={signal.type} />
      </td>
      <td style={{ padding: '12px 16px', font: 'var(--weight-semibold) var(--text-sm)/1.2 var(--font-sans)' }}>
        {signal.accName}
      </td>
      <td
        style={{
          padding: '12px 16px',
          font: 'var(--type-body-sm)',
          color: 'var(--text-secondary)',
          maxWidth: 360,
        }}
      >
        {signal.note}
      </td>
      <td
        style={{
          padding: '12px 16px',
          textAlign: 'right',
          font: 'var(--weight-medium) var(--text-xs)/1 var(--font-mono)',
          color: 'var(--text-tertiary)',
          whiteSpace: 'nowrap',
        }}
      >
        {signal.detected}
      </td>
    </tr>
  );
}
