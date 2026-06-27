import { type ReactNode } from 'react';
import { Icon } from '../../design-system/index.js';
import { CTASection, Eyebrow, MarketingShell, PageHero, SectionTitle } from '../marketing/MarketingShell.js';

const STEPS: { icon: string; title: string; body: string }[] = [
  {
    icon: 'download',
    title: 'Import from Attio',
    body: 'The moment an Attio record flips to customer, the account, owner, ARR, seats and renewal date sync in through the webhook connector. Attio stays the source of truth; Rick instruments the post-sale layer on top.',
  },
  {
    icon: 'radar',
    title: 'Detect the signals',
    body: 'A Stripe cancellation, a 41% usage drop, a negative support ticket - each becomes a signal weighted by severity. Inverse signals like a seat cap approaching or a glowing ticket feed the expansion board instead.',
  },
  {
    icon: 'gauge',
    title: 'Derive the health',
    body: 'Risk weights are summed per account. A single major risk, or enough mediums stacked together, turns it Red; a lighter signal holds it Amber; with only opportunities it stays Green. No manual scoring, no guesswork.',
  },
  {
    icon: 'bot',
    title: 'Triage with the agent',
    body: 'The Action Agent surfaces the accounts that need attention now, writes a personalised call script from the signals and history, and recommends the channel - voice, email or SMS.',
  },
  {
    icon: 'phone-call',
    title: 'Act, then write back',
    body: 'Place a Twilio voice call or schedule it for later, or escalate to a human. The outcome is written back to the Attio churn list and a follow-up task is assigned to the account owner.',
  },
];

const TIERS: { dot: string; soft: string; border: string; text: string; title: string; rule: string }[] = [
  { dot: 'var(--rag-red)', soft: 'var(--rag-red-soft)', border: 'var(--rag-red-border)', text: 'var(--rag-red-text)', title: 'Red · Churn Risk', rule: 'A major risk signal, or risk weight ≥ 7' },
  { dot: 'var(--rag-amber)', soft: 'var(--rag-amber-soft)', border: 'var(--rag-amber-border)', text: 'var(--rag-amber-text)', title: 'Amber · Investigate', rule: 'Risk weight ≥ 2 - needs a human look' },
  { dot: 'var(--rag-green)', soft: 'var(--rag-green-soft)', border: 'var(--rag-green-border)', text: 'var(--rag-green-text)', title: 'Green · Healthy', rule: 'No active risk - expansion-ready' },
];

const WEIGHTS: { label: string; weight: string }[] = [
  { label: 'Major', weight: '10' },
  { label: 'Medium', weight: '5' },
  { label: 'Minor', weight: '2' },
];

export function HowItWorksPage() {
  return (
    <MarketingShell>
      <PageHero
        tag="HOW IT WORKS"
        title="From deal-close to renewal, instrumented"
        lede="Five steps run continuously on every account. Import the customer, detect the signals, derive the health, triage with the agent, and act before it is too late."
      />

      <section style={{ padding: '0 0 88px', maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {STEPS.map((s, i) => (
            <Step key={s.title} n={i + 1} icon={s.icon} title={s.title}>
              {s.body}
            </Step>
          ))}
        </div>
      </section>

      <section style={{ padding: '0 0 96px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Eyebrow center>THE BACKBONE</Eyebrow>
          <SectionTitle center title="How health is derived" sub="Signals carry a severity weight. Risk weights sum per account and decide the tier - the same logic the board, the agent, and the API all share." />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start', maxWidth: 900, margin: '0 auto' }}>
          <div style={{ border: '1px solid var(--border-default)', borderRadius: 12, background: 'var(--surface-1)', padding: 20 }}>
            <Eyebrow>SEVERITY WEIGHT</Eyebrow>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
              {WEIGHTS.map((w) => (
                <div key={w.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-secondary)' }}>{w.label} signal</span>
                  <span style={{ font: 'var(--weight-semibold) var(--text-md)/1 var(--font-mono)', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                    {w.weight}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {TIERS.map((t) => (
              <div key={t.title} style={{ display: 'flex', alignItems: 'center', gap: 14, border: `1px solid ${t.border}`, background: t.soft, borderRadius: 12, padding: '16px 18px' }}>
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: t.dot, boxShadow: `0 0 0 4px ${t.soft}`, flex: 'none' }} />
                <div>
                  <div style={{ font: 'var(--type-title)', color: t.text }}>{t.title}</div>
                  <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-tertiary)' }}>{t.rule}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection
        title="Watch the pipeline run"
        body="Open the cockpit to see real accounts triaged by health, then place a call straight from the Action Agent."
        action="Open the Cockpit"
      />
    </MarketingShell>
  );
}

function Step({ n, icon, title, children }: { n: number; icon: string; title: ReactNode; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', border: '1px solid var(--border-default)', background: 'var(--surface-1)', borderRadius: 14, padding: '20px 22px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 'none' }}>
        <span style={{ display: 'inline-flex', width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 999, background: 'var(--accent)', color: 'var(--on-accent)', font: 'var(--weight-semibold) var(--text-sm)/1 var(--font-mono)' }}>
          {n}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Icon name={icon} size={18} color="var(--accent-text)" />
          <h3 style={{ margin: 0, font: 'var(--type-title)' }}>{title}</h3>
        </div>
        <p style={{ margin: '8px 0 0', font: 'var(--type-body-sm)/1.6', color: 'var(--text-secondary)' }}>{children}</p>
      </div>
    </div>
  );
}
