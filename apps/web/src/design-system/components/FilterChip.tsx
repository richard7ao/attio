import { type ButtonHTMLAttributes, type ReactNode, useState } from 'react';

export type FilterChipDot = 'red' | 'amber' | 'green';

export interface FilterChipProps {
  children?: ReactNode;
  active?: boolean;
  count?: number | null;
  dot?: FilterChipDot | null;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
  style?: React.CSSProperties;
}

/** A toggleable filter pill for the dashboard toolbar (e.g. RAG tier, owner, "renewing soon"). */
export function FilterChip({
  children,
  active = false,
  count = null,
  dot = null,
  onClick,
  style = {},
}: FilterChipProps) {
  const [hover, setHover] = useState(false);
  const dotColor = dot
    ? ({ red: 'var(--rag-red)', amber: 'var(--rag-amber)', green: 'var(--rag-green)' } as const)[dot]
    : null;
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        height: 30,
        padding: '0 11px',
        borderRadius: 'var(--radius-pill)',
        background: active ? 'var(--accent-soft)' : hover ? 'var(--surface-2)' : 'transparent',
        border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border-default)'}`,
        color: active ? 'var(--accent-text)' : 'var(--text-secondary)',
        font: 'var(--weight-medium) var(--text-sm)/1 var(--font-sans)',
        cursor: 'pointer',
        transition: 'all var(--dur-fast) var(--ease-out)',
        ...style,
      }}
    >
      {dotColor ? (
        <span
          style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flex: 'none' }}
        />
      ) : null}
      {children}
      {count != null ? (
        <span
          style={{
            font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)',
            color: active ? 'var(--accent-text)' : 'var(--text-tertiary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
