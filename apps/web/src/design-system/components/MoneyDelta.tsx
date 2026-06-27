import { type ReactNode } from 'react';

export type MoneyDeltaDir = 'up' | 'down' | 'flat';

export interface MoneyDeltaProps {
  value: ReactNode;
  dir?: MoneyDeltaDir;
  invert?: boolean;
  style?: React.CSSProperties;
}

/**
 * A signed mono delta — arrow + value, colored by direction. `invert` flips
 * the good/bad mapping (e.g. ARR-at-risk going up is bad).
 */
export function MoneyDelta({ value, dir = 'up', invert = false, style = {} }: MoneyDeltaProps) {
  const isUp = dir === 'up';
  const good = invert ? !isUp : isUp;
  const color =
    dir === 'flat' ? 'var(--text-tertiary)' : good ? 'var(--rag-green-text)' : 'var(--rag-red-text)';
  const arrow = dir === 'flat' ? '·' : isUp ? '↑' : '↓';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        font: 'var(--weight-medium) var(--text-xs)/1 var(--font-mono)',
        color,
        fontVariantNumeric: 'tabular-nums',
        ...style,
      }}
    >
      {arrow} {value}
    </span>
  );
}
