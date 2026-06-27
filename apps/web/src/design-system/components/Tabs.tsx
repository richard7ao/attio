import { type ReactNode } from 'react';

export interface TabItem {
  value: string;
  label: ReactNode;
  count?: number | null;
}

export type TabsItem = string | TabItem;

export interface TabsProps {
  tabs?: TabsItem[];
  value?: string;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
}

/** Underlined tab strip. Active tab gets accent text + an accent underline marker. */
export function Tabs({ tabs = [], value, onChange, style = {} }: TabsProps) {
  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        gap: 2,
        borderBottom: '1px solid var(--border-subtle)',
        ...style,
      }}
    >
      {tabs.map((t) => {
        const val = typeof t === 'string' ? t : t.value;
        const lab = typeof t === 'string' ? t : t.label;
        const count = typeof t === 'object' ? t.count : null;
        const active = val === value;
        return (
          <button
            key={val}
            role="tab"
            aria-selected={active}
            onClick={() => onChange && onChange(val)}
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 12px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
              font: `var(--weight-${active ? 'semibold' : 'medium'}) var(--text-sm)/1 var(--font-sans)`,
              transition: 'color var(--dur-fast) var(--ease-out)',
            }}
          >
            {lab}
            {count != null ? (
              <span
                style={{
                  font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)',
                  color: active ? 'var(--accent-text)' : 'var(--text-tertiary)',
                  background: active ? 'var(--accent-soft)' : 'var(--surface-2)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '2px 6px',
                }}
              >
                {count}
              </span>
            ) : null}
            {active ? (
              <span
                style={{
                  position: 'absolute',
                  left: 8,
                  right: 8,
                  bottom: -1,
                  height: 2,
                  background: 'var(--accent)',
                  borderRadius: 2,
                }}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
