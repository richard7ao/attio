import { type ReactNode } from 'react';

export type StatCardDeltaDir = 'up' | 'down' | 'flat';
export type StatCardTone = 'none' | 'red' | 'amber' | 'green' | 'accent';

export interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  delta?: ReactNode;
  deltaDir?: StatCardDeltaDir;
  tone?: StatCardTone;
  icon?: ReactNode;
  style?: React.CSSProperties;
}

/**
 * Summary stat block for the dashboard header row — big mono number,
 * uppercase label, and an optional delta/sub line.
 */
export function StatCard({
  label,
  value,
  sub = null,
  delta = null,
  deltaDir = 'up',
  tone = 'none',
  icon = null,
  style = {},
}: StatCardProps) {
  const deltaColor =
    deltaDir === 'down'
      ? 'var(--rag-red-text)'
      : deltaDir === 'flat'
        ? 'var(--text-tertiary)'
        : 'var(--rag-green-text)';
  const valueColor =
    ({
      none: 'var(--text-primary)',
      red: 'var(--rag-red-text)',
      amber: 'var(--rag-amber-text)',
      green: 'var(--rag-green-text)',
      accent: 'var(--accent-text)',
    } as const)[tone] || 'var(--text-primary)';
  return (
    <div
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--edge-light)',
        padding: 'var(--space-4) var(--space-4) var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minWidth: 0,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)',
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}
        >
          {label}
        </span>
        {icon ? (
          <span style={{ display: 'inline-flex', color: 'var(--text-tertiary)' }}>{icon}</span>
        ) : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span
          style={{
            font: 'var(--weight-medium) var(--text-3xl)/1 var(--font-mono)',
            letterSpacing: '-0.02em',
            color: valueColor,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </span>
        {delta ? (
          <span
            style={{
              font: 'var(--weight-medium) var(--text-xs)/1 var(--font-mono)',
              color: deltaColor,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            {deltaDir === 'down' ? '↓' : deltaDir === 'flat' ? '·' : '↑'} {delta}
          </span>
        ) : null}
      </div>
      {sub ? (
        <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-tertiary)' }}>{sub}</span>
      ) : null}
    </div>
  );
}
