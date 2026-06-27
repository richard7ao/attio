import { type HTMLAttributes, type ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'accent' | 'green' | 'amber' | 'red';

export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'style'> {
  children?: ReactNode;
  tone?: BadgeTone;
  subtle?: boolean;
  mono?: boolean;
  style?: React.CSSProperties;
}

/**
 * Small status/label pill. `tone` selects a semantic palette; `subtle`
 * uses the soft tinted fill (default), solid uses a saturated fill.
 */
export function Badge({
  children,
  tone = 'neutral',
  subtle = true,
  mono = false,
  style = {},
  ...rest
}: BadgeProps) {
  const tones = {
    neutral: {
      soft: { bg: 'var(--surface-3)', fg: 'var(--text-secondary)', bd: 'var(--border-default)' },
      solid: { bg: 'var(--slate-600)', fg: 'var(--text-primary)', bd: 'transparent' },
    },
    accent: {
      soft: { bg: 'var(--accent-soft)', fg: 'var(--accent-text)', bd: 'var(--accent-border)' },
      solid: { bg: 'var(--accent)', fg: 'var(--on-accent)', bd: 'transparent' },
    },
    green: {
      soft: {
        bg: 'var(--rag-green-soft)',
        fg: 'var(--rag-green-text)',
        bd: 'var(--rag-green-border)',
      },
      solid: { bg: 'var(--rag-green)', fg: '#05291a', bd: 'transparent' },
    },
    amber: {
      soft: {
        bg: 'var(--rag-amber-soft)',
        fg: 'var(--rag-amber-text)',
        bd: 'var(--rag-amber-border)',
      },
      solid: { bg: 'var(--rag-amber)', fg: '#3a2705', bd: 'transparent' },
    },
    red: {
      soft: { bg: 'var(--rag-red-soft)', fg: 'var(--rag-red-text)', bd: 'var(--rag-red-border)' },
      solid: { bg: 'var(--rag-red)', fg: '#3a0710', bd: 'transparent' },
    },
  };
  const p = (tones[tone] || tones.neutral)[subtle ? 'soft' : 'solid'];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 22,
        padding: '0 8px',
        borderRadius: 'var(--radius-pill)',
        background: p.bg,
        color: p.fg,
        border: `1px solid ${p.bd}`,
        font: mono
          ? 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)'
          : 'var(--weight-semibold) var(--text-xs)/1 var(--font-sans)',
        letterSpacing: mono ? 'var(--tracking-label)' : 'var(--tracking-snug)',
        textTransform: mono ? 'uppercase' : 'none',
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
