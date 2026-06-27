import { type InputHTMLAttributes, type ReactNode, useState } from 'react';
import { Icon } from './Icon.js';

export interface SearchFieldProps {
  value?: InputHTMLAttributes<HTMLInputElement>['value'];
  onChange?: InputHTMLAttributes<HTMLInputElement>['onChange'];
  placeholder?: string;
  hint?: ReactNode;
  width?: number | string;
  style?: React.CSSProperties;
}

/** The top-bar account search. Pre-wired with a search icon and ⌘K hint. */
export function SearchField({
  value,
  onChange,
  placeholder = 'Search accounts, owners, signals…',
  hint = '⌘K',
  width = 320,
  style = {},
}: SearchFieldProps) {
  const [focus, setFocus] = useState(false);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        width,
        height: 'var(--control-md)',
        padding: '0 10px',
        background: 'var(--surface-field)',
        border: `1px solid ${focus ? 'var(--accent)' : 'var(--border-default)'}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: focus ? 'var(--ring-accent)' : 'none',
        transition:
          'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
        ...style,
      }}
    >
      <Icon name="search" size={15} color="var(--text-tertiary)" />
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          flex: 1,
          minWidth: 0,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'var(--text-primary)',
          font: 'var(--type-body-sm)',
        }}
      />
      {hint ? (
        <kbd
          style={{
            font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)',
            color: 'var(--text-tertiary)',
            background: 'var(--surface-2)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xs)',
            padding: '3px 5px',
            flex: 'none',
          }}
        >
          {hint}
        </kbd>
      ) : null}
    </div>
  );
}
