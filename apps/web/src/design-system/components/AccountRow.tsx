import { type HTMLAttributes, type ReactNode, useState } from 'react';
import { Avatar } from './Avatar.js';
import { HealthDot, type HealthStatus } from './HealthDot.js';
import { Icon } from './Icon.js';

export interface AccountRowProps {
  name: ReactNode;
  arr: ReactNode;
  signal?: ReactNode;
  owner?: string;
  renewalDays?: number | null;
  status?: HealthStatus;
  onClick?: HTMLAttributes<HTMLDivElement>['onClick'];
  style?: React.CSSProperties;
}

/**
 * An account as it appears in the RAG pipeline board — the workhorse card.
 * Name + ARR on top, the triggering signal line, then owner + renewal countdown.
 */
export function AccountRow({
  name,
  arr,
  signal,
  owner,
  renewalDays,
  status = 'green',
  onClick,
  style = {},
}: AccountRowProps) {
  const [hover, setHover] = useState(false);
  const renewTone =
    renewalDays != null && renewalDays <= 14
      ? 'var(--rag-red-text)'
      : renewalDays != null && renewalDays <= 45
        ? 'var(--rag-amber-text)'
        : 'var(--text-tertiary)';
  const barColor = ({
    red: 'var(--rag-red)',
    amber: 'var(--rag-amber)',
    green: 'var(--rag-green)',
  } as const)[status];
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        background: hover ? 'var(--surface-2)' : 'var(--surface-1)',
        border: `1px solid ${hover ? 'var(--border-strong)' : 'var(--border-default)'}`,
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--edge-light)',
        padding: '12px 13px 12px 15px',
        overflow: 'hidden',
        transition:
          'background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)',
        ...style,
      }}
    >
      <span
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: barColor }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <span
          style={{
            font: 'var(--weight-semibold) var(--text-sm)/1.2 var(--font-sans)',
            color: 'var(--text-primary)',
          }}
        >
          {name}
        </span>
        <span
          style={{
            font: 'var(--weight-medium) var(--text-sm)/1 var(--font-mono)',
            color: 'var(--text-primary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {arr}
        </span>
      </div>
      {signal ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 }}>
          <HealthDot status={status} size={6} glow={false} />
          <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-secondary)' }}>
            {signal}
          </span>
        </div>
      ) : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 11 }}>
        <Avatar name={owner || ''} size={20} />
        <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-tertiary)' }}>{owner}</span>
        {renewalDays != null ? (
          <span
            style={{
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              font: 'var(--weight-medium) var(--text-xs)/1 var(--font-mono)',
              color: renewTone,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <Icon name="calendar-clock" size={12} />
            renew {renewalDays}d
          </span>
        ) : null}
      </div>
    </div>
  );
}
