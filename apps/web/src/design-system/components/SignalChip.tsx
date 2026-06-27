import { type ReactNode } from 'react';
import { Icon } from './Icon.js';

export interface SignalChipProps {
  type: string;
  label?: ReactNode;
  style?: React.CSSProperties;
}

interface SignalMeta {
  dir: 'risk' | 'opportunity';
  sev: 'major' | 'medium' | 'minor';
  icon: string;
  label: string;
}

/**
 * A signal chip — the trigger behind a triage item. Maps the domain's
 * signal types to direction (risk/opportunity) + severity, with a Lucide
 * icon name. Severity sets the saturation; direction sets red vs green.
 */
const CATALOG: Record<string, SignalMeta> = {
  stripe_cancellation: {
    dir: 'risk',
    sev: 'major',
    icon: 'circle-x',
    label: 'Cancellation intent',
  },
  usage_drop: { dir: 'risk', sev: 'medium', icon: 'trending-down', label: 'Usage drop' },
  negative_support_ticket: {
    dir: 'risk',
    sev: 'minor',
    icon: 'ticket-x',
    label: 'Negative ticket',
  },
  usage_near_limit: { dir: 'opportunity', sev: 'major', icon: 'gauge', label: 'Near seat limit' },
  renewal_approaching: {
    dir: 'opportunity',
    sev: 'medium',
    icon: 'calendar-clock',
    label: 'Renewal approaching',
  },
  positive_support_ticket: {
    dir: 'opportunity',
    sev: 'minor',
    icon: 'ticket-check',
    label: 'Positive ticket',
  },
};

export function SignalChip({ type, label = null, style = {} }: SignalChipProps) {
  const meta: SignalMeta = CATALOG[type] || {
    dir: 'risk',
    sev: 'minor',
    icon: 'activity',
    label: type,
  };
  const isRisk = meta.dir === 'risk';
  const fg = isRisk ? 'var(--rag-red-text)' : 'var(--rag-green-text)';
  const bd = isRisk ? 'var(--rag-red-border)' : 'var(--rag-green-border)';
  const bg = isRisk ? 'var(--rag-red-soft)' : 'var(--rag-green-soft)';
  const sevDots = ({ major: 3, medium: 2, minor: 1 } as const)[meta.sev] || 1;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 24,
        padding: '0 9px',
        borderRadius: 'var(--radius-sm)',
        background: bg,
        color: fg,
        border: `1px solid ${bd}`,
        font: 'var(--weight-medium) var(--text-xs)/1 var(--font-sans)',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <Icon name={meta.icon} size={13} />
      {label || meta.label}
      <span style={{ display: 'inline-flex', gap: 2, marginLeft: 1 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 3,
              height: 3,
              borderRadius: '50%',
              background: i < sevDots ? 'currentColor' : 'transparent',
              border: i < sevDots ? 'none' : `1px solid ${bd}`,
              opacity: i < sevDots ? 1 : 0.6,
            }}
          />
        ))}
      </span>
    </span>
  );
}
