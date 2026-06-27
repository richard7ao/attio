import { type ButtonHTMLAttributes, type ReactNode, useState } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style' | 'type'> {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
  type?: 'button' | 'submit' | 'reset';
  style?: React.CSSProperties;
}

/**
 * Sentry.CS primary action button.
 * Inline-styled against the design-system CSS variables so it works
 * anywhere the bundle is loaded.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon = null,
  iconRight = null,
  fullWidth = false,
  disabled = false,
  onClick,
  type = 'button',
  style = {},
  ...rest
}: ButtonProps) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);
  const sizes = {
    sm: {
      height: 'var(--control-sm)',
      padding: '0 10px',
      font: 'var(--weight-semibold) var(--text-sm)/1 var(--font-sans)',
      gap: '6px',
    },
    md: {
      height: 'var(--control-md)',
      padding: '0 14px',
      font: 'var(--weight-semibold) var(--text-base)/1 var(--font-sans)',
      gap: '7px',
    },
    lg: {
      height: 'var(--control-lg)',
      padding: '0 18px',
      font: 'var(--weight-semibold) var(--text-md)/1 var(--font-sans)',
      gap: '8px',
    },
  };
  const variants = {
    primary: {
      base: {
        background: 'var(--accent)',
        color: 'var(--on-accent)',
        border: '1px solid transparent',
      },
      hover: { background: 'var(--accent-hover)' },
      active: { background: 'var(--accent-press)' },
    },
    secondary: {
      base: {
        background: 'var(--surface-2)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-default)',
      },
      hover: { background: 'var(--surface-3)', border: '1px solid var(--border-strong)' },
      active: { background: 'var(--surface-2)' },
    },
    ghost: {
      base: {
        background: 'transparent',
        color: 'var(--text-secondary)',
        border: '1px solid transparent',
      },
      hover: { background: 'var(--surface-2)', color: 'var(--text-primary)' },
      active: { background: 'var(--surface-1)' },
    },
    danger: {
      base: {
        background: 'var(--rag-red-soft)',
        color: 'var(--rag-red-text)',
        border: '1px solid var(--rag-red-border)',
      },
      hover: { background: 'rgba(251,94,115,0.20)' },
      active: { background: 'rgba(251,94,115,0.14)' },
    },
  };
  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;
  const composed: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s.gap,
    height: s.height,
    padding: s.padding,
    font: s.font,
    letterSpacing: 'var(--tracking-snug)',
    borderRadius: 'var(--radius-md)',
    width: fullWidth ? '100%' : 'auto',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    transform: active && !disabled ? 'translateY(1px)' : 'none',
    transition:
      'background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)',
    whiteSpace: 'nowrap',
    ...v.base,
    ...(hover && !disabled ? v.hover : {}),
    ...(active && !disabled ? v.active : {}),
    ...style,
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setActive(false);
      }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={composed}
      {...rest}
    >
      {icon ? (
        <span style={{ display: 'inline-flex', marginLeft: size === 'sm' ? -1 : -2 }}>{icon}</span>
      ) : null}
      {children}
      {iconRight ? (
        <span style={{ display: 'inline-flex', marginRight: size === 'sm' ? -1 : -2 }}>
          {iconRight}
        </span>
      ) : null}
    </button>
  );
}
