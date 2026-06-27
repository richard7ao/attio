import { type HTMLAttributes, type ReactNode } from 'react';

export interface TagProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'style'> {
  children?: ReactNode;
  icon?: ReactNode;
  style?: React.CSSProperties;
}

/** Low-emphasis metadata tag — quieter than Badge, for keys like channels or counts. */
export function Tag({ children, icon = null, style = {}, ...rest }: TagProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 20,
        padding: '0 7px',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--surface-2)',
        border: '1px solid var(--border-subtle)',
        color: 'var(--text-tertiary)',
        font: 'var(--weight-medium) var(--text-xs)/1 var(--font-sans)',
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {icon ? <span style={{ display: 'inline-flex' }}>{icon}</span> : null}
      {children}
    </span>
  );
}
