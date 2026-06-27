import { type ReactNode } from 'react';
import { Icon } from '../../design-system/index.js';
import { CTASection, Eyebrow, InfoCard, MarketingShell, PageHero, SectionTitle } from '../marketing/MarketingShell.js';

const SYNC_IN: string[] = [
  'Account name, domain and owner',
  'ARR, seat count and seats in use',
  'Renewal date and contract terms',
  'Primary contact and reach details',
];

const WRITE_BACK: string[] = [
  'Churn-list status as health changes',
  'Follow-up tasks assigned to the owner',
  'Call and outreach outcomes on the record',
  'Escalations flagged for a human',
];

const EVENTS: { icon: string; title: string; body: string }[] = [
  {
    icon: 'user-check',
    title: 'Record becomes a customer',
    body: 'A deal closes and the Attio record flips to customer. Rick imports the account and starts watching it for churn and expansion signals.',
  },
  {
    icon: 'list-checks',
    title: 'Churn-list status changes',
    body: 'When an account moves on the Attio churn list, the connector routes it - track the account, queue an action, or place a call.',
  },
  {
    icon: 'trophy',
    title: 'Contract won or expanded',
    body: 'Won contracts and upsells post back as opportunity signals, so the expansion board reflects what just happened in the CRM.',
  },
];

export function AttioPage() {
  return (
    <MarketingShell>
      <PageHero
        tag="BUILT ON ATTIO"
        title="An add-on, not another CRM"
        lede="Attio stays your system of record. Rick reads from it the moment a deal closes, instruments the post-sale account, and writes the results straight back."
      />

      <section style={{ padding: '0 0 88px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <Column icon="download" title="What syncs in" tone="accent" items={SYNC_IN} />
        <Column icon="upload" title="What writes back" tone="green" items={WRITE_BACK} />
      </section>

      <section style={{ padding: '0 0 96px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Eyebrow center>THE CONNECTOR</Eyebrow>
          <SectionTitle center title="Events flow both ways" sub="A signed webhook connector keeps Rick and Attio in lockstep. Every inbound event is signature-verified before it is trusted." />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
          {EVENTS.map((e) => (
            <InfoCard key={e.title} icon={e.icon} title={e.title}>
              {e.body}
            </InfoCard>
          ))}
        </div>
      </section>

      <section style={{ padding: '0 0 96px', textAlign: 'center' }}>
        <Eyebrow center>WIRED INTO YOUR STACK</Eyebrow>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 22 }}>
          {['Attio', 'Stripe', 'Twilio', 'Sling', 'n8n'].map((name) => (
            <span
              key={name}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                height: 38,
                padding: '0 16px',
                borderRadius: 999,
                border: '1px solid var(--border-default)',
                background: 'var(--surface-1)',
                font: 'var(--weight-medium) var(--text-sm)/1 var(--font-sans)',
              }}
            >
              {name}
            </span>
          ))}
        </div>
      </section>

      <CTASection
        title="Bring your Attio workspace to life after the close"
        body="Connect Attio and Rick triages every customer account by health, with the agent ready to act."
        action="Open the Cockpit"
      />
    </MarketingShell>
  );
}

function Column({ icon, title, items, tone }: { icon: string; title: ReactNode; items: string[]; tone: 'accent' | 'green' }) {
  const color = tone === 'green' ? 'var(--rag-green-text)' : 'var(--accent-text)';
  const soft = tone === 'green' ? 'var(--rag-green-soft)' : 'var(--accent-soft)';
  return (
    <div style={{ border: '1px solid var(--border-default)', borderRadius: 14, background: 'var(--surface-1)', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <span style={{ display: 'inline-flex', width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: soft, color }}>
          <Icon name={icon} size={19} />
        </span>
        <h3 style={{ margin: 0, font: 'var(--type-title)' }}>{title}</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 18 }}>
        {items.map((item) => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="check" size={15} color={color} />
            <span style={{ font: 'var(--type-body-sm)/1.4', color: 'var(--text-secondary)' }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
