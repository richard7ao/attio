import { type ReactNode } from 'react';
import { HealthDot, type HealthStatus } from './HealthDot.js';

export interface HealthBadgeProps {
  status?: HealthStatus;
  label?: ReactNode;
  pulse?: boolean;
  style?: React.CSSProperties;
}

const LABELS: Record<HealthStatus, string> = {
  red: 'Churn Risk',
  amber: 'Investigate',
  green: 'Healthy',
};

/** Health pill = dot + tier label, tinted. The primary way an account's RAG state is shown inline. */
export function HealthBadge({ status = 'green', label = null, pulse = false, style = {} }: HealthBadgeProps) {
  const palette =
    ({
      red: { bg: 'var(--rag-red-soft)', fg: 'var(--rag-red-text)', bd: 'var(--rag-red-border)' },
      amber: {
        bg: 'var(--rag-amber-soft)',
        fg: 'var(--rag-amber-text)',
        bd: 'var(--rag-amber-border)',
      },
      green: {
        bg: 'var(--rag-green-soft)',
        fg: 'var(--rag-green-text)',
        bd: 'var(--rag-green-border)',
      },
    } as const)[status] || ({} as { bg?: string; fg?: string; bd?: string });
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        height: 24,
        padding: '0 10px 0 9px',
        borderRadius: 'var(--radius-pill)',
        background: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.bd}`,
        font: 'var(--weight-semibold) var(--text-xs)/1 var(--font-sans)',
        letterSpacing: 'var(--tracking-snug)',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <HealthDot status={status} size={7} pulse={pulse} glow={false} />
      {label || LABELS[status]}
    </span>
  );
}
