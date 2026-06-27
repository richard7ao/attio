export type SwitchSize = 'sm' | 'md';

export interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: SwitchSize;
  style?: React.CSSProperties;
}

/** On/off toggle. Accent track when on; quiet slate when off. */
export function Switch({
  checked = false,
  onChange,
  disabled = false,
  size = 'md',
  style = {},
}: SwitchProps) {
  const dims = size === 'sm' ? { w: 30, h: 18, k: 12 } : { w: 38, h: 22, k: 16 };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange && onChange(!checked)}
      style={{
        position: 'relative',
        width: dims.w,
        height: dims.h,
        flex: 'none',
        borderRadius: 'var(--radius-pill)',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: checked ? 'var(--accent)' : 'var(--slate-600)',
        opacity: disabled ? 0.5 : 1,
        padding: 0,
        transition: 'background var(--dur-base) var(--ease-out)',
        ...style,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: (dims.h - dims.k) / 2,
          left: checked ? dims.w - dims.k - (dims.h - dims.k) / 2 : (dims.h - dims.k) / 2,
          width: dims.k,
          height: dims.k,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
          transition: 'left var(--dur-base) var(--ease-out)',
        }}
      />
    </button>
  );
}
