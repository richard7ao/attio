import { useState } from 'react';
import { ActionCard, Icon, Tabs } from '../../design-system/index.js';
import { useCockpit } from '../state/CockpitProvider.js';

type FeedTab = 'ai' | 'human' | 'resolved';

export function FeedPage() {
  const { feedItems, accounts, settings } = useCockpit();
  const [tab, setTab] = useState<FeedTab>('ai');

  const pulseAnim = settings.pulse ? 'pulseRing 2.4s infinite' : 'none';
  const agentSub =
    (settings.agentMode === 'Autopilot'
      ? 'Autopilot · agent dispatches outreach automatically'
      : 'Assist · agent drafts, you dispatch') + ' · 1.4s avg latency';

  const aiCount = feedItems.filter((i) => i.actor === 'ai' && i.open).length;
  const humanCount = feedItems.filter((i) => i.actor === 'human' && i.open).length;
  const resolvedCount = feedItems.filter((i) => !i.open).length;

  const list =
    tab === 'ai'
      ? feedItems.filter((i) => i.actor === 'ai' && i.open)
      : tab === 'human'
        ? feedItems.filter((i) => i.actor === 'human' && i.open)
        : feedItems.filter((i) => !i.open);

  return (
    <div style={{ maxWidth: 780, padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 10, background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-text)' }}>
          <Icon name="bot" size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, font: 'var(--type-h2)' }}>Action Agent</h2>
          <p style={{ margin: '4px 0 0', font: 'var(--type-body-sm)', color: 'var(--text-tertiary)' }}>{agentSub}</p>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 28, padding: '0 11px', borderRadius: 999, border: '1px solid var(--border-default)', font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--rag-green)', animation: pulseAnim }} />
          MONITORING · {accounts.length}
        </span>
      </div>

      <Tabs
        tabs={[
          { value: 'ai', label: 'AI Agent', count: aiCount },
          { value: 'human', label: 'Human Queue', count: humanCount },
          { value: 'resolved', label: 'Resolved', count: resolvedCount },
        ]}
        value={tab}
        onChange={(v) => setTab(v as FeedTab)}
      />

      {list.length === 0 ? (
        <div style={{ border: '1px dashed var(--border-default)', borderRadius: 12, padding: 48, textAlign: 'center', color: 'var(--text-tertiary)' }}>
          <div style={{ font: 'var(--type-title)', color: 'var(--text-secondary)' }}>Queue clear</div>
          <div style={{ font: 'var(--type-body-sm)', marginTop: 4 }}>No accounts need attention in this view.</div>
        </div>
      ) : tab === 'resolved' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((f) => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--border-subtle)', borderRadius: 12, background: 'var(--surface-1)', padding: '14px 16px', opacity: 0.92 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: f.resDot, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)', letterSpacing: 'var(--tracking-label)', color: 'var(--text-tertiary)' }}>{f.category}</div>
                <div style={{ font: 'var(--type-title)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
              </div>
              <span style={{ font: 'var(--weight-medium) var(--text-xs)/1 var(--font-mono)', color: f.resColor, whiteSpace: 'nowrap' }}>{f.resolution}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {list.map((f) => (
            <ActionCard
              key={f.id}
              category={f.category}
              intent={f.intent}
              actor={f.actor}
              time={f.time}
              title={f.title}
              body={f.body}
              script={f.script}
              primaryLabel={f.primaryLabel}
              primaryIcon="phone-call"
              onPrimary={f.call}
              onEscalate={f.escalate}
              onDismiss={f.dismiss}
            />
          ))}
        </div>
      )}
    </div>
  );
}
