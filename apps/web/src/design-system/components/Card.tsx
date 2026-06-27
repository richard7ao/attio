import { type HTMLAttributes, type ReactNode } from 'react';

export type CardTone = 'none' | 'red' | 'amber' | 'green' | 'accent';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'style'> {
  children?: ReactNode;
  tone?: CardTone;
  interactive?: boolean;
  pad?: boolean;
  style?: React.CSSProperties;
}

/**
 * The atomic surface of the cockpit. Flat fill + hairline + lit top edge.
 * `tone` adds a RAG-tinted left status bar and wash; `pad` toggles inner padding.
 */
export function Card({
  children,
  tone = 'none',
  interactive = false,
  pad = true,
  style = {},
  ...rest
}: CardProps) {
  const tones = {
    none: null,
    red: { bar: 'var(--rag-red)', wash: 'var(--rag-red-soft)', bd: 'var(--rag-red-border)' },
    amber: {
      bar: 'var(--rag-amber)',
      wash: 'var(--rag-amber-soft)',
      bd: 'var(--rag-amber-border)',
    },
    green: {
      bar: 'var(--rag-green)',
      wash: 'var(--rag-green-soft)',
      bd: 'var(--rag-green-border)',
    },
    accent: { bar: 'var(--accent)', wash: 'var(--accent-soft)', bd: 'var(--accent-border)' },
  };
  const t = tones[tone];
  return (
    <div
      style={{
        position: 'relative',
        background: t ? `linear-gradient(${t.wash}, ${t.wash}), var(--surface-1)` : 'var(--surface-1)',
        border: `1px solid ${t ? t.bd : 'var(--border-default)'}`,
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--edge-light)',
        padding: pad ? 'var(--space-4)' : 0,
        overflow: 'hidden',
        transition: interactive
          ? 'border-color var(--dur-base) var(--ease-out), background var(--dur-base) var(--ease-out)'
          : 'none',
        ...style,
      }}
      {...rest}
    >
      {t ? (
        <span
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: t.bar }}
        />
      ) : null}
      {children}
    </div>
  );
}
