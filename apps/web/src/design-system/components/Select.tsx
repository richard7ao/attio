import { type ReactNode, type SelectHTMLAttributes, useState } from 'react';
import { Icon } from './Icon.js';

export type SelectSize = 'sm' | 'md' | 'lg';

export interface SelectOption {
  value: string;
  label: ReactNode;
}

export type SelectOptionItem = string | SelectOption;

export interface SelectProps {
  value?: string;
  options?: SelectOptionItem[];
  onChange?: SelectHTMLAttributes<HTMLSelectElement>['onChange'];
  placeholder?: string;
  icon?: ReactNode;
  size?: SelectSize;
  style?: React.CSSProperties;
}

/** Lightweight select / dropdown trigger styled as a cockpit control. (Visual; wire your own menu.) */
export function Select({
  value,
  options = [],
  onChange,
  placeholder = 'Select…',
  icon = null,
  size = 'md',
  style = {},
}: SelectProps) {
  const [hover, setHover] = useState(false);
  const h = ({
    sm: 'var(--control-sm)',
    md: 'var(--control-md)',
    lg: 'var(--control-lg)',
  } as const)[size];
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        height: h,
        padding: '0 9px 0 11px',
        background: 'var(--surface-2)',
        border: `1px solid ${hover ? 'var(--border-strong)' : 'var(--border-default)'}`,
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        transition: 'border-color var(--dur-fast) var(--ease-out)',
        ...style,
      }}
    >
      {icon ? (
        <span style={{ display: 'inline-flex', color: 'var(--text-tertiary)' }}>{icon}</span>
      ) : null}
      <select
        value={value}
        onChange={onChange}
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: value ? 'var(--text-primary)' : 'var(--text-tertiary)',
          font: 'var(--type-body-sm)',
          cursor: 'pointer',
          paddingRight: 4,
        }}
      >
        {placeholder ? (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        ) : null}
        {options.map((o) => {
          const val = typeof o === 'string' ? o : o.value;
          const lab = typeof o === 'string' ? o : o.label;
          return (
            <option
              key={val}
              value={val}
              style={{ background: 'var(--surface-3)', color: 'var(--text-primary)' }}
            >
              {lab}
            </option>
          );
        })}
      </select>
      <Icon name="chevron-down" size={14} color="var(--text-tertiary)" />
    </div>
  );
}
