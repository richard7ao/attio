import { type ButtonHTMLAttributes, type ReactNode, useState } from 'react';

export type IconButtonVariant = 'ghost' | 'surface' | 'accent';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style' | 'type'> {
  children?: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  disabled?: boolean;
  active?: boolean;
  'aria-label'?: string;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
  style?: React.CSSProperties;
}

/** Square icon-only button for toolbars and card affordances. */
export function IconButton({
  children,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  active = false,
  'aria-label': ariaLabel,
  onClick,
  style = {},
  ...rest
}: IconButtonProps) {
  const [hover, setHover] = useState(false);
  const dims = ({ sm: 28, md: 34, lg: 40 } as const)[size] || 34;
  const variants = {
    ghost: {
      base: {
        background: active ? 'var(--surface-3)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        border: '1px solid transparent',
      },
      hover: { background: 'var(--surface-2)', color: 'var(--text-primary)' },
    },
    surface: {
      base: {
        background: 'var(--surface-2)',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border-default)',
      },
      hover: {
        background: 'var(--surface-3)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-strong)',
      },
    },
    accent: {
      base: {
        background: 'var(--accent-soft)',
        color: 'var(--accent-text)',
        border: '1px solid var(--accent-border)',
      },
      hover: { background: 'rgba(76,141,255,0.20)' },
    },
  };
  const v = variants[variant] || variants.ghost;
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: dims,
        height: dims,
        flex: 'none',
        borderRadius: 'var(--radius-md)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition:
          'background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)',
        ...v.base,
        ...(hover && !disabled ? v.hover : {}),
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
