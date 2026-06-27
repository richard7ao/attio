import { type ReactNode } from 'react';
import { Icon } from './Icon.js';

export type TimelineChannel = 'ticket' | 'voice' | 'email' | 'sms' | 'note' | 'attio';

export interface TimelineItemProps {
  channel?: TimelineChannel;
  title: ReactNode;
  time: ReactNode;
  body?: ReactNode;
  actor?: ReactNode;
  last?: boolean;
  style?: React.CSSProperties;
}

type ChannelTone = 'amber' | 'accent' | 'neutral' | 'green' | 'red';

const CHANNELS: Record<TimelineChannel, { icon: string; tone: ChannelTone; label: string }> = {
  ticket: { icon: 'ticket', tone: 'amber', label: 'Support ticket' },
  voice: { icon: 'phone-call', tone: 'accent', label: 'Voice agent' },
  email: { icon: 'mail', tone: 'neutral', label: 'Email' },
  sms: { icon: 'message-square', tone: 'neutral', label: 'SMS' },
  note: { icon: 'file-text', tone: 'neutral', label: 'Note' },
  attio: { icon: 'refresh-cw', tone: 'accent', label: 'Attio sync' },
};

/** A communication-history entry on the account profile timeline. */
export function TimelineItem({
  channel = 'note',
  title,
  time,
  body,
  last = false,
  style = {},
}: TimelineItemProps) {
  const c = CHANNELS[channel] || CHANNELS.note;
  const iconColor = ({
    accent: 'var(--accent-text)',
    amber: 'var(--rag-amber-text)',
    green: 'var(--rag-green-text)',
    red: 'var(--rag-red-text)',
    neutral: 'var(--text-secondary)',
  } as const)[c.tone];
  const iconBg = ({
    accent: 'var(--accent-soft)',
    amber: 'var(--rag-amber-soft)',
    green: 'var(--rag-green-soft)',
    red: 'var(--rag-red-soft)',
    neutral: 'var(--surface-3)',
  } as const)[c.tone];
  return (
    <div style={{ display: 'flex', gap: 12, ...style }}>
      <div
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: iconBg,
            border: '1px solid var(--border-subtle)',
            color: iconColor,
          }}
        >
          <Icon name={c.icon} size={14} />
        </span>
        {!last ? (
          <span
            style={{
              flex: 1,
              width: 1,
              minHeight: 16,
              background: 'var(--border-subtle)',
              marginTop: 4,
            }}
          />
        ) : null}
      </div>
      <div style={{ paddingBottom: last ? 0 : 18, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              font: 'var(--weight-semibold) var(--text-sm)/1.3 var(--font-sans)',
              color: 'var(--text-primary)',
            }}
          >
            {title}
          </span>
          <span
            style={{
              font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)',
              color: 'var(--text-tertiary)',
            }}
          >
            {time}
          </span>
        </div>
        {body ? (
          <p
            style={{
              margin: '5px 0 0',
              font: 'var(--type-body-sm)',
              color: 'var(--text-secondary)',
              textWrap: 'pretty',
            }}
          >
            {body}
          </p>
        ) : null}
      </div>
    </div>
  );
}
