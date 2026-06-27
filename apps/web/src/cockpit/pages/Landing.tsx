import { useNavigate } from 'react-router-dom';
import { Button, Icon } from '../../design-system/index.js';

const navLinkStyle = {
  font: 'var(--weight-medium) var(--text-sm)/1 var(--font-sans)',
  color: 'var(--text-secondary)',
  textDecoration: 'none',
} as const;

const pillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  height: 38,
  padding: '0 16px',
  borderRadius: 999,
  border: '1px solid var(--border-default)',
  background: 'var(--surface-1)',
  font: 'var(--weight-medium) var(--text-sm)/1 var(--font-sans)',
} as const;

const stepCardStyle = {
  border: '1px solid var(--border-default)',
  borderRadius: 12,
  background: 'var(--surface-1)',
  padding: 24,
  boxShadow: 'inset 0 1px 0 var(--edge-light, rgba(255,255,255,0.04))',
} as const;

const stepIconStyle = {
  display: 'inline-flex',
  width: 40,
  height: 40,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 10,
  background: 'var(--accent-soft)',
  color: 'var(--accent-text)',
} as const;

function Logo({ size = 28, iconSize = 15, opacity = 1 }: { size?: number; iconSize?: number; opacity?: number }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: 8,
        background: 'var(--accent-soft)',
        border: '1px solid var(--accent-border)',
        color: 'var(--accent-text)',
        flex: 'none',
        opacity,
      }}
    >
      <Icon name="radar" size={iconSize} />
    </span>
  );
}

export function Landing() {
  const navigate = useNavigate();
  const goDash = () => navigate('/dashboard');
  const goFeed = () => navigate('/feed');

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          top: -340,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 1100,
          height: 760,
          background: 'radial-gradient(closest-side, rgba(76,141,255,0.18), rgba(76,141,255,0) 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(var(--hero-grid) 1px, transparent 1px),linear-gradient(90deg, var(--hero-grid) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'linear-gradient(180deg, #000, transparent 55%)',
          WebkitMaskImage: 'linear-gradient(180deg, #000, transparent 55%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', maxWidth: 1120, margin: '0 auto', padding: '0 32px' }}>
        {/* nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 14, height: 72 }}>
          <Logo />
          <span style={{ font: 'var(--weight-semibold) 19px/1 var(--font-display)', letterSpacing: '-0.01em' }}>
            Rick
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 28 }}>
            <a href="#/product" style={navLinkStyle} onClick={(e) => { e.preventDefault(); navigate('/product'); }}>
              Product
            </a>
            <a href="#/how-it-works" style={navLinkStyle} onClick={(e) => { e.preventDefault(); navigate('/how-it-works'); }}>
              How it works
            </a>
            <a href="#/attio" style={navLinkStyle} onClick={(e) => { e.preventDefault(); navigate('/attio'); }}>
              Built on Attio
            </a>
            <Button variant="primary" size="sm" onClick={goDash}>
              Open Dashboard
            </Button>
          </div>
        </nav>

        {/* hero */}
        <header style={{ padding: '84px 0 56px', textAlign: 'center', maxWidth: 780, margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              height: 28,
              padding: '0 12px',
              borderRadius: 999,
              background: 'var(--accent-soft)',
              border: '1px solid var(--accent-border)',
              font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)',
              letterSpacing: 'var(--tracking-label)',
              color: 'var(--accent-text)',
            }}
          >
            POST-SALE CRM · BUILT ON ATTIO
          </div>
          <h1
            style={{
              margin: '22px 0 0',
              font: 'var(--weight-bold) var(--text-5xl)/1.04 var(--font-display)',
              letterSpacing: '-0.025em',
              textWrap: 'balance',
            }}
          >
            Mission control for
            <br />
            enterprise customer success
          </h1>
          <p
            style={{
              margin: '22px auto 0',
              maxWidth: 560,
              font: 'var(--weight-regular) var(--text-lg)/1.5 var(--font-sans)',
              color: 'var(--text-secondary)',
              textWrap: 'pretty',
            }}
          >
            Post-onboarding client management and upselling, built on Attio. The moment a deal closes, Rick watches
            every account for churn and expansion signals - and triages them Red, Amber, Green.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32 }}>
            <Button variant="primary" size="lg" onClick={goDash}>
              Open the Cockpit
            </Button>
            <Button variant="secondary" size="lg" onClick={goFeed}>
              See the Action Agent
            </Button>
          </div>
        </header>

        {/* console glimpse */}
        <div
          style={{
            margin: '0 auto 96px',
            maxWidth: 960,
            border: '1px solid var(--border-default)',
            borderRadius: 16,
            background: 'linear-gradient(180deg, var(--surface-2), var(--surface-1))',
            boxShadow: '0 40px 80px -40px rgba(0,0,0,0.8)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              height: 44,
              padding: '0 16px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--rag-red)' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--rag-amber)' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--rag-green)' }} />
            <span
              style={{
                marginLeft: 10,
                font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)',
                letterSpacing: 'var(--tracking-label)',
                color: 'var(--text-tertiary)',
              }}
            >
              RICK / HEALTH DASHBOARD
            </span>
            <span
              style={{
                marginLeft: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)',
                letterSpacing: '0.04em',
                color: 'var(--rag-green-text)',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--rag-green)' }} />
              ATTIO · SYNCED
            </span>
          </div>
          <div style={{ padding: 22, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            <StatTile
              border="var(--rag-red-border)"
              soft="var(--rag-red-soft)"
              text="var(--rag-red-text)"
              label="CHURN RISK · 3"
              value="$418k"
              sub="ARR at risk"
            />
            <StatTile
              border="var(--rag-amber-border)"
              soft="var(--rag-amber-soft)"
              text="var(--rag-amber-text)"
              label="INVESTIGATE · 4"
              value="$643k"
              sub="under watch"
            />
            <StatTile
              border="var(--rag-green-border)"
              soft="var(--rag-green-soft)"
              text="var(--rag-green-text)"
              label="HEALTHY · 5"
              value="$313k"
              sub="upsell pipeline"
            />
          </div>
        </div>

        {/* the gap */}
        <section style={{ padding: '0 0 96px', maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <div
            style={{
              font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)',
              letterSpacing: 'var(--tracking-label)',
              color: 'var(--text-tertiary)',
            }}
          >
            THE GAP
          </div>
          <h2
            style={{
              margin: '16px 0 0',
              font: 'var(--weight-semibold) var(--text-3xl)/1.15 var(--font-sans)',
              letterSpacing: '-0.02em',
              textWrap: 'balance',
            }}
          >
            Most teams stop at deal-close. The risk starts there.
          </h2>
          <p
            style={{
              margin: '18px auto 0',
              maxWidth: 600,
              font: 'var(--type-body)/1.6',
              color: 'var(--text-secondary)',
              fontSize: 'var(--text-md)',
              textWrap: 'pretty',
            }}
          >
            The CRM celebrates the win and goes quiet. What follows - renewals, seat expansion, churn rescue - gets
            abandoned to spreadsheets and good intentions. Rick instruments the post-sale account so nothing slips
            between the close and the renewal.
          </p>
        </section>

        {/* how it works */}
        <section style={{ padding: '0 0 96px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div
              style={{
                font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)',
                letterSpacing: 'var(--tracking-label)',
                color: 'var(--text-tertiary)',
              }}
            >
              HOW IT WORKS
            </div>
            <h2
              style={{
                margin: '14px 0 0',
                font: 'var(--weight-semibold) var(--text-2xl)/1.2 var(--font-sans)',
                letterSpacing: '-0.02em',
              }}
            >
              Import · Watch · Triage
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
            <div style={stepCardStyle}>
              <div style={stepIconStyle}>
                <Icon name="download" size={20} />
              </div>
              <h3 style={{ margin: '16px 0 0', font: 'var(--type-title)' }}>Import from Attio</h3>
              <p style={{ margin: '8px 0 0', font: 'var(--type-body-sm)/1.6', color: 'var(--text-secondary)' }}>
                When an Attio record flips to{' '}
                <em style={{ color: 'var(--text-primary)', fontStyle: 'normal' }}>customer</em>, the account, owner,
                ARR, seats and renewal date sync in automatically.
              </p>
            </div>
            <div style={stepCardStyle}>
              <div style={stepIconStyle}>
                <Icon name="radar" size={20} />
              </div>
              <h3 style={{ margin: '16px 0 0', font: 'var(--type-title)' }}>Watch the signals</h3>
              <p style={{ margin: '8px 0 0', font: 'var(--type-body-sm)/1.6', color: 'var(--text-secondary)' }}>
                A Stripe cancellation, a usage drop, a negative ticket - each becomes a weighted signal. Inverse
                signals feed the upsell board.
              </p>
            </div>
            <div style={stepCardStyle}>
              <div style={stepIconStyle}>
                <Icon name="bot" size={20} />
              </div>
              <h3 style={{ margin: '16px 0 0', font: 'var(--type-title)' }}>Triage with the agent</h3>
              <p style={{ margin: '8px 0 0', font: 'var(--type-body-sm)/1.6', color: 'var(--text-secondary)' }}>
                The Action Agent surfaces what needs attention, writes the call script, and dispatches a voice agent -
                or escalates to a human.
              </p>
            </div>
          </div>
        </section>

        {/* RAG backbone */}
        <section
          style={{
            padding: '0 0 96px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 48,
            alignItems: 'center',
          }}
        >
          <div>
            <div
              style={{
                font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)',
                letterSpacing: 'var(--tracking-label)',
                color: 'var(--text-tertiary)',
              }}
            >
              THE BACKBONE
            </div>
            <h2
              style={{
                margin: '14px 0 0',
                font: 'var(--weight-semibold) var(--text-2xl)/1.2 var(--font-sans)',
                letterSpacing: '-0.02em',
                textWrap: 'balance',
              }}
            >
              Red, Amber, Green - every account, at a glance
            </h2>
            <p
              style={{
                margin: '16px 0 0',
                font: 'var(--type-body)/1.6',
                color: 'var(--text-secondary)',
                fontSize: 'var(--text-md)',
              }}
            >
              Health is derived from signals, not guesswork. A major risk turns an account Red; mediums hold it Amber;
              only opportunities keep it Green. A CSM triages dozens of accounts in seconds.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <RagRow
              border="var(--rag-red-border)"
              soft="var(--rag-red-soft)"
              dot="var(--rag-red)"
              text="var(--rag-red-text)"
              title="Churn Risk"
              desc="Major risk signal - act before EOW"
            />
            <RagRow
              border="var(--rag-amber-border)"
              soft="var(--rag-amber-soft)"
              dot="var(--rag-amber)"
              text="var(--rag-amber-text)"
              title="Investigate"
              desc="Medium signal - needs a human look"
            />
            <RagRow
              border="var(--rag-green-border)"
              soft="var(--rag-green-soft)"
              dot="var(--rag-green)"
              text="var(--rag-green-text)"
              title="Healthy"
              desc="Expansion-ready - upsell candidate"
            />
          </div>
        </section>

        {/* integrations */}
        <section style={{ padding: '0 0 80px', textAlign: 'center' }}>
          <div
            style={{
              font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)',
              letterSpacing: 'var(--tracking-label)',
              color: 'var(--text-tertiary)',
              marginBottom: 22,
            }}
          >
            WIRED INTO YOUR STACK
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <span style={pillStyle}>Attio</span>
            <span style={pillStyle}>Stripe</span>
            <span style={pillStyle}>Twilio</span>
            <span style={pillStyle}>Sling</span>
            <span style={pillStyle}>n8n</span>
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: '0 0 110px' }}>
          <div
            style={{
              border: '1px solid var(--accent-border)',
              borderRadius: 18,
              background: 'linear-gradient(180deg, var(--accent-soft), rgba(76,141,255,0.02))',
              padding: '54px 32px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <h2
              style={{
                margin: 0,
                font: 'var(--weight-semibold) var(--text-3xl)/1.1 var(--font-sans)',
                letterSpacing: '-0.02em',
              }}
            >
              Stop letting accounts go quiet.
            </h2>
            <p
              style={{
                margin: '14px auto 0',
                maxWidth: 480,
                font: 'var(--type-body)/1.6',
                color: 'var(--text-secondary)',
                fontSize: 'var(--text-md)',
              }}
            >
              Open the cockpit and see every account triaged by health, with the agent already queued up.
            </p>
            <div style={{ marginTop: 28 }}>
              <Button variant="primary" size="lg" onClick={goDash}>
                Open Dashboard
              </Button>
            </div>
          </div>
        </section>

        <footer
          style={{
            borderTop: '1px solid var(--border-subtle)',
            padding: '28px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            font: 'var(--type-body-sm)',
            color: 'var(--text-tertiary)',
          }}
        >
          <Logo size={18} iconSize={11} opacity={0.7} />
          <span>Rick - post-sale CRM add-on, built on Attio.</span>
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)' }}>
            v1.0 · 2026
          </span>
        </footer>
      </div>
    </div>
  );
}

interface StatTileProps {
  border: string;
  soft: string;
  text: string;
  label: string;
  value: string;
  sub: string;
}

function StatTile({ border, soft, text, label, value, sub }: StatTileProps) {
  return (
    <div style={{ border: `1px solid ${border}`, background: soft, borderRadius: 12, padding: 16 }}>
      <div
        style={{
          font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)',
          letterSpacing: 'var(--tracking-label)',
          color: text,
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 10,
          font: 'var(--weight-semibold) var(--text-2xl)/1 var(--font-mono)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      <div style={{ marginTop: 4, font: 'var(--type-body-sm)', color: 'var(--text-tertiary)' }}>{sub}</div>
    </div>
  );
}

interface RagRowProps {
  border: string;
  soft: string;
  dot: string;
  text: string;
  title: string;
  desc: string;
}

function RagRow({ border, soft, dot, text, title, desc }: RagRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        border: `1px solid ${border}`,
        background: soft,
        borderRadius: 12,
        padding: '16px 18px',
      }}
    >
      <span
        style={{ width: 11, height: 11, borderRadius: '50%', background: dot, boxShadow: `0 0 0 4px ${soft}`, flex: 'none' }}
      />
      <div>
        <div style={{ font: 'var(--type-title)', color: text }}>{title}</div>
        <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-tertiary)' }}>{desc}</div>
      </div>
    </div>
  );
}
