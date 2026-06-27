import { type ReactNode, useState } from 'react';
import { Button } from './Button.js';
import { Icon } from './Icon.js';
import { IconButton } from './IconButton.js';

export type ActionCardIntent = 'risk' | 'opportunity' | 'neutral';
export type ActionCardActor = 'ai' | 'human';

export interface ActionCardProps {
  category?: ReactNode;
  intent?: ActionCardIntent;
  actor?: ActionCardActor;
  time?: ReactNode;
  title: ReactNode;
  body: ReactNode;
  script?: ReactNode;
  scriptLabel?: ReactNode;
  primaryLabel?: ReactNode;
  primaryIcon?: string;
  onPrimary?: () => void;
  onEscalate?: () => void;
  onDismiss?: () => void;
  style?: React.CSSProperties;
}

/**
 * The Action Agent feed item. An AI (or human) surfaces an account that
 * needs attention: an uppercase category eyebrow, the actor + time, a
 * headline, the reasoning, an optional generated call script, and actions.
 */
export function ActionCard({
  category = 'CHECK-IN',
  intent = 'neutral',
  actor = 'ai',
  time = '',
  title,
  body,
  script = null,
  scriptLabel = 'AI script',
  primaryLabel = 'Place Call',
  primaryIcon = 'phone-call',
  onPrimary,
  onEscalate,
  onDismiss,
  style = {},
}: ActionCardProps) {
  const [open, setOpen] = useState(Boolean(script));
  const accent =
    intent === 'risk'
      ? {
          fg: 'var(--rag-red-text)',
          bd: 'var(--rag-red-border)',
          bg: 'var(--rag-red-soft)',
          bar: 'var(--rag-red)',
        }
      : intent === 'opportunity'
        ? {
            fg: 'var(--rag-green-text)',
            bd: 'var(--rag-green-border)',
            bg: 'var(--rag-green-soft)',
            bar: 'var(--rag-green)',
          }
        : {
            fg: 'var(--accent-text)',
            bd: 'var(--accent-border)',
            bg: 'var(--accent-soft)',
            bar: 'var(--accent)',
          };
  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--surface-1)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--edge-light)',
        padding: '14px 16px 16px',
        overflow: 'hidden',
        ...style,
      }}
    >
      <span
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: accent.bar }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
        <span
          style={{
            font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)',
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: accent.fg,
          }}
        >
          {category}
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            marginLeft: 'auto',
            font: 'var(--weight-semibold) var(--text-2xs)/1 var(--font-sans)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: actor === 'ai' ? 'var(--accent-text)' : 'var(--text-secondary)',
            background: actor === 'ai' ? 'var(--accent-soft)' : 'var(--surface-3)',
            border: `1px solid ${actor === 'ai' ? 'var(--accent-border)' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-pill)',
            padding: '3px 7px',
          }}
        >
          <Icon name={actor === 'ai' ? 'sparkles' : 'user-round'} size={11} />
          {actor}
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
      <h4
        style={{
          margin: '0 0 6px',
          font: 'var(--weight-semibold) var(--text-md)/1.3 var(--font-sans)',
          color: 'var(--text-primary)',
        }}
      >
        {title}
      </h4>
      <p
        style={{
          margin: 0,
          font: 'var(--type-body-sm)',
          color: 'var(--text-secondary)',
          textWrap: 'pretty',
        }}
      >
        {body}
      </p>
      {script ? (
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => setOpen(!open)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              width: '100%',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              color: 'var(--text-tertiary)',
              font: 'var(--weight-medium) var(--text-xs)/1 var(--font-sans)',
            }}
          >
            <Icon name="quote" size={12} color={accent.fg} />
            {scriptLabel}
            <Icon
              name={open ? 'chevron-up' : 'chevron-down'}
              size={13}
              style={{ marginLeft: 'auto' }}
            />
          </button>
          {open ? (
            <p
              style={{
                margin: '8px 0 0',
                padding: '11px 13px',
                background: 'var(--surface-inset)',
                border: `1px solid ${accent.bd}`,
                borderRadius: 'var(--radius-md)',
                font: 'var(--type-body-sm)',
                fontStyle: 'italic',
                color: 'var(--text-secondary)',
                textWrap: 'pretty',
              }}
            >
              {script}
            </p>
          ) : null}
        </div>
      ) : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
        <Button
          size="sm"
          variant="primary"
          icon={<Icon name={primaryIcon} size={14} />}
          onClick={onPrimary}
        >
          {primaryLabel}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon={<Icon name="arrow-up-right" size={14} />}
          onClick={onEscalate}
        >
          Escalate
        </Button>
        <IconButton
          size="sm"
          variant="ghost"
          aria-label="Dismiss"
          onClick={onDismiss}
          style={{ marginLeft: 'auto' }}
        >
          <Icon name="x" size={15} />
        </IconButton>
      </div>
    </div>
  );
}
