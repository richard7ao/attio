import { type InputHTMLAttributes, type ReactNode, useState } from 'react';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'style' | 'size' | 'type'> {
  value?: InputHTMLAttributes<HTMLInputElement>['value'];
  onChange?: InputHTMLAttributes<HTMLInputElement>['onChange'];
  placeholder?: string;
  type?: string;
  icon?: ReactNode;
  disabled?: boolean;
  invalid?: boolean;
  size?: InputSize;
  style?: React.CSSProperties;
}

/** Text input with the cockpit's inset-field treatment and accent focus ring. */
export function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  icon = null,
  disabled = false,
  invalid = false,
  size = 'md',
  style = {},
  ...rest
}: InputProps) {
  const [focus, setFocus] = useState(false);
  const h = ({
    sm: 'var(--control-sm)',
    md: 'var(--control-md)',
    lg: 'var(--control-lg)',
  } as const)[size];
  const borderColor = invalid
    ? 'var(--rag-red-border)'
    : focus
      ? 'var(--accent)'
      : 'var(--border-default)';
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        height: h,
        padding: '0 11px',
        background: 'var(--surface-field)',
        border: `1px solid ${borderColor}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: focus ? (invalid ? 'var(--ring-red)' : 'var(--ring-accent)') : 'none',
        opacity: disabled ? 0.5 : 1,
        transition:
          'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
        ...style,
      }}
    >
      {icon ? (
        <span style={{ display: 'inline-flex', color: 'var(--text-tertiary)', flex: 'none' }}>
          {icon}
        </span>
      ) : null}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          flex: 1,
          minWidth: 0,
          height: '100%',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'var(--text-primary)',
          font: 'var(--type-body)',
        }}
        {...rest}
      />
    </div>
  );
}
