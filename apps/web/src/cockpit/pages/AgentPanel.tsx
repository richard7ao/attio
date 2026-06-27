import { useNavigate } from 'react-router-dom';
import { Button, Icon, IconButton, Tooltip } from '../../design-system/index.js';
import { useCockpit } from '../state/CockpitProvider.js';

/** The docked Action-Agent rail on the dashboard: the top open AI items + quick actions. */
export function AgentPanel() {
  const navigate = useNavigate();
  const { feedItems, settings } = useCockpit();
  const pulseAnim = settings.pulse ? 'pulseRing 2.4s infinite' : 'none';

  const openAi = feedItems.filter((i) => i.actor === 'ai' && i.open);
  const items = openAi.slice(0, 5);
  const footer = openAi.length > items.length ? `Open Action Feed · ${openAi.length - items.length} more` : 'Open Action Feed';

  return (
    <aside
      style={{
        width: 330,
        flexShrink: 0,
        position: 'sticky',
        top: 76,
        alignSelf: 'flex-start',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid var(--border-default)',
        borderRadius: 14,
        background: 'var(--surface-1)',
        boxShadow: 'var(--edge-light)',
        maxHeight: 'calc(100vh - 96px)',
        overflow: 'hidden',
      }}
    >
      <PanelHeader pulseAnim={pulseAnim} />
      <div style={{ flex: 1, overflowY: 'auto', padding: 13, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              border: '1px solid var(--border-subtle)',
              borderRadius: 10,
              background: 'var(--surface-1)',
              padding: '11px 12px',
              boxShadow: `inset 3px 0 0 ${item.intentColor}`,
            }}
          >
            <div style={{ font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)', letterSpacing: 'var(--tracking-label)', color: item.intentText }}>
              {item.category}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 7 }}>
              <span style={{ font: 'var(--weight-semibold) var(--text-sm)/1.2 var(--font-sans)' }}>{item.name}</span>
              <span style={{ font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)', color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
                {item.arrLabel}
              </span>
            </div>
            <div style={{ font: 'var(--type-body-sm)/1.45', color: 'var(--text-secondary)', marginTop: 5 }}>{item.reason}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 11 }}>
              <Button variant="primary" size="sm" onClick={item.call}>Place Call</Button>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Tooltip label="Send email · n8n" side="top">
                  <IconButton variant="ghost" size="sm" aria-label="Send email via n8n" onClick={item.email}>
                    <Icon name="mail" size={15} />
                  </IconButton>
                </Tooltip>
                <Tooltip label="Send SMS · Twilio" side="top">
                  <IconButton variant="ghost" size="sm" aria-label="Send SMS" onClick={item.sms}>
                    <Icon name="message-square" size={15} />
                  </IconButton>
                </Tooltip>
                <Tooltip label="Escalate to human" side="top">
                  <IconButton variant="ghost" size="sm" aria-label="Escalate to human" onClick={item.escalate}>
                    <Icon name="user-round-cog" size={15} />
                  </IconButton>
                </Tooltip>
                <Tooltip label="Dismiss signal" side="top">
                  <IconButton variant="ghost" size="sm" aria-label="Dismiss" onClick={item.dismiss}>
                    <Icon name="x" size={15} />
                  </IconButton>
                </Tooltip>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 8, padding: '32px 16px', color: 'var(--text-tertiary)' }}>
            <Icon name="circle-check" size={20} color="var(--rag-green-text)" />
            <span style={{ font: 'var(--type-body-sm)' }}>Queue clear - every account handled.</span>
          </div>
        ) : null}
      </div>
      <a
        href="#/feed"
        onClick={(e) => {
          e.preventDefault();
          navigate('/feed');
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '13px 16px',
          borderTop: '1px solid var(--border-subtle)',
          textDecoration: 'none',
          color: 'var(--accent-text)',
          font: 'var(--weight-medium) var(--text-sm)/1 var(--font-sans)',
        }}
      >
        <span>{footer}</span>
        <span style={{ fontFamily: 'var(--font-mono)' }}>→</span>
      </a>
    </aside>
  );
}

function PanelHeader({ pulseAnim }: { pulseAnim: string }) {
  const { setAgentOpen } = useCockpit();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '15px 16px 13px', borderBottom: '1px solid var(--border-subtle)' }}>
      <div
        style={{
          width: 34,
          height: 34,
          flexShrink: 0,
          borderRadius: 9,
          background: 'var(--accent-soft)',
          border: '1px solid var(--accent-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent-text)',
        }}
      >
        <Icon name="bot" size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: 'var(--type-title)' }}>Action Agent</div>
        <div style={{ font: 'var(--weight-medium) var(--text-2xs)/1.2 var(--font-mono)', color: 'var(--text-tertiary)', marginTop: 2 }}>
          NEEDS ATTENTION NOW
        </div>
      </div>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--rag-green)', animation: pulseAnim }} />
      <IconButton variant="ghost" size="sm" aria-label="Dismiss agent panel" onClick={() => setAgentOpen(false)}>
        <Icon name="panel-right-close" size={16} />
      </IconButton>
    </div>
  );
}
