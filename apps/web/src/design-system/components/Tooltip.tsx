import { type ReactNode, useState } from 'react';

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  children?: ReactNode;
  label: ReactNode;
  side?: TooltipSide;
  style?: React.CSSProperties;
}

/** Hover tooltip on a wrapped trigger. Dark popover, hairline border, small shadow. */
export function Tooltip({ children, label, side = 'top', style = {} }: TooltipProps) {
  const [show, setShow] = useState(false);
  const pos: React.CSSProperties = {
    top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 7 },
    bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 7 },
    left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: 7 },
    right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 7 },
  }[side];
  return (
    <span
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      style={{ position: 'relative', display: 'inline-flex', ...style }}
    >
      {children}
      {show ? (
        <span
          style={{
            position: 'absolute',
            zIndex: 50,
            whiteSpace: 'nowrap',
            background: 'var(--surface-3)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            padding: '6px 9px',
            font: 'var(--weight-medium) var(--text-xs)/1.3 var(--font-sans)',
            pointerEvents: 'none',
            ...pos,
          }}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
