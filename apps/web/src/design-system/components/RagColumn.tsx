import { type ReactNode } from 'react';
import { HealthDot, type HealthStatus } from './HealthDot.js';

export type RagTier = 'red' | 'amber' | 'green';

export interface RagColumnProps {
  tier?: RagTier;
  count?: number;
  arr?: string | number | null;
  children?: ReactNode;
  style?: React.CSSProperties;
}

const META: Record<RagTier, { label: string; dot: HealthStatus }> = {
  red: { label: 'Red — Churn Risk', dot: 'red' },
  amber: { label: 'Amber — Investigate', dot: 'amber' },
  green: { label: 'Green — Healthy', dot: 'green' },
};

/** A column header for the RAG pipeline board — tier name, count, and ARR roll-up. */
export function RagColumn({ tier = 'green', count = 0, arr = null, children, style = {} }: RagColumnProps) {
  const m = META[tier] || META.green;
  const textColor = ({
    red: 'var(--rag-red-text)',
    amber: 'var(--rag-amber-text)',
    green: 'var(--rag-green-text)',
  } as const)[tier];
  return (
    <section
      style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0, ...style }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 2px' }}>
        <HealthDot status={m.dot} size={9} />
        <h3
          style={{
            margin: 0,
            font: 'var(--weight-semibold) var(--text-sm)/1 var(--font-sans)',
            color: textColor,
            letterSpacing: 'var(--tracking-snug)',
          }}
        >
          {m.label}
        </h3>
        <span
          style={{
            marginLeft: 'auto',
            font: 'var(--weight-medium) var(--text-xs)/1 var(--font-mono)',
            color: 'var(--text-tertiary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {count}
          {arr ? ` · ${arr}` : ''}
        </span>
      </header>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </section>
  );
}
