import { Icon } from '../../design-system/index.js';
import { CTASection, Eyebrow, InfoCard, MarketingShell, PageHero, SectionTitle } from '../marketing/MarketingShell.js';

const FEATURES: { icon: string; title: string; body: string }[] = [
  {
    icon: 'layout-dashboard',
    title: 'Health Dashboard',
    body: 'Every account triaged Red, Amber, Green on one board. Drag a card between columns to reclassify; the pipeline re-totals ARR at risk in real time.',
  },
  {
    icon: 'bot',
    title: 'Action Agent',
    body: 'A live queue of what needs attention now. The agent writes the call script, recommends the channel, and dispatches a voice agent or escalates to a human.',
  },
  {
    icon: 'phone-call',
    title: 'Voice Calls + Scheduling',
    body: 'Place a call instantly or schedule it for the right moment. The Call Log tracks past, ongoing, and upcoming calls with outcomes and talk time.',
  },
  {
    icon: 'building-2',
    title: 'Account Profiles',
    body: 'One screen per account: primary contact, active signals, seat-usage trend, renewal countdown, and the full communication history across every channel.',
  },
  {
    icon: 'radar',
    title: 'Signals Engine',
    body: 'Stripe cancellations, usage drops, and support sentiment become weighted signals. A major risk turns an account Red; opportunities feed the upsell board.',
  },
  {
    icon: 'plug',
    title: 'Wired Into Your Stack',
    body: 'Attio is the source of truth. Stripe streams billing events, Twilio places calls, n8n runs the email workflows, and Sling routes the schedule.',
  },
];

const AGENT_POINTS: { icon: string; text: string }[] = [
  { icon: 'file-text', text: 'Drafts a personalised call script from the account’s signals and history.' },
  { icon: 'git-branch', text: 'Picks the channel - voice, email, or SMS - based on severity and renewal timing.' },
  { icon: 'phone-outgoing', text: 'Dispatches a Twilio voice agent, or hands off to the human queue when judgment is needed.' },
  { icon: 'check-check', text: 'Logs the outcome back to the account so nothing is repeated or dropped.' },
];

export function ProductPage() {
  return (
    <MarketingShell>
      <PageHero
        tag="THE PRODUCT"
        title="The cockpit for everything after the close"
        lede="Rick is a post-sale CRM add-on that watches every customer account for churn and expansion signals, triages them by health, and acts before the renewal."
      />

      <section style={{ padding: '0 0 88px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Eyebrow center>WHAT YOU GET</Eyebrow>
          <SectionTitle center title="Six surfaces, one workflow" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
          {FEATURES.map((f) => (
            <InfoCard key={f.title} icon={f.icon} title={f.title}>
              {f.body}
            </InfoCard>
          ))}
        </div>
      </section>

      <section style={{ padding: '0 0 96px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
        <div>
          <Eyebrow>THE DIFFERENCE</Eyebrow>
          <SectionTitle
            title="The Action Agent does the first 80%"
            sub="A CSM managing dozens of accounts can not chase every signal. Rick’s agent turns each one into a ready-to-send action, so your team only does the judgment calls."
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {AGENT_POINTS.map((p) => (
            <div
              key={p.text}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                border: '1px solid var(--border-default)',
                background: 'var(--surface-1)',
                borderRadius: 12,
                padding: '14px 16px',
              }}
            >
              <span style={{ display: 'inline-flex', width: 34, height: 34, flex: 'none', alignItems: 'center', justifyContent: 'center', borderRadius: 9, background: 'var(--accent-soft)', color: 'var(--accent-text)' }}>
                <Icon name={p.icon} size={17} />
              </span>
              <span style={{ font: 'var(--type-body-sm)/1.5', color: 'var(--text-secondary)' }}>{p.text}</span>
            </div>
          ))}
        </div>
      </section>

      <CTASection
        title="See it triage a live pipeline"
        body="Open the cockpit and watch every account sorted by health, with the agent already queued up and a call ready to place."
        action="Open the Cockpit"
      />
    </MarketingShell>
  );
}
