import { Link, useParams } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Button,
  HealthBadge,
  Icon,
  MoneyDelta,
  SignalChip,
  Sparkline,
  StatCard,
  TimelineItem,
} from '../../design-system/index.js';
import { type StatCardTone } from '../../design-system/index.js';
import { useCockpit } from '../state/CockpitProvider.js';

const cardStyle = {
  border: '1px solid var(--border-default)',
  borderRadius: 12,
  background: 'var(--surface-1)',
  padding: 18,
} as const;

const cardLabelStyle = {
  font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)',
  letterSpacing: 'var(--tracking-label)',
  color: 'var(--text-tertiary)',
} as const;

export function AccountProfilePage() {
  const { id } = useParams();
  const { accountById, showToast } = useCockpit();
  const a = id ? accountById(id) : undefined;

  if (!a) {
    return (
      <div style={{ padding: '64px 24px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
        <div style={{ font: 'var(--type-h3)', color: 'var(--text-secondary)' }}>Account not found</div>
        <p style={{ margin: '8px 0 18px', font: 'var(--type-body-sm)' }}>That record isn't in this workspace.</p>
        <Link
          to="/dashboard"
          style={{
            color: 'var(--accent-text)',
            textDecoration: 'none',
            font: 'var(--weight-medium) var(--text-sm)/1 var(--font-sans)',
          }}
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const capTone: StatCardTone = a.seatPct >= 90 ? 'green' : 'none';
  const renewalTone: StatCardTone = a.renewalDays <= 14 ? 'red' : a.renewalDays <= 45 ? 'amber' : 'none';
  const sparkTone = a.health === 'red' ? 'red' : a.health === 'amber' ? 'amber' : 'green';
  const barColor = `var(--rag-${a.health})`;

  const placeCall = () => showToast(`Call dispatched to ${a.name} · Twilio voice agent`);
  const escalate = () => showToast(`Escalated to human · ${a.name}`);

  return (
    <div style={{ maxWidth: 1320, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Link
        to="/dashboard"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          font: 'var(--weight-medium) var(--text-sm)/1 var(--font-sans)',
          color: 'var(--text-tertiary)',
          textDecoration: 'none',
          width: 'fit-content',
        }}
      >
        <Icon name="arrow-left" size={15} />
        Back to pipeline
      </Link>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <Avatar name={a.name} size={52} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, font: 'var(--type-h2)' }}>{a.name}</h2>
            <HealthBadge status={a.health} pulse={a.health === 'red'} />
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              marginTop: 7,
              flexWrap: 'wrap',
              font: 'var(--weight-medium) var(--text-xs)/1 var(--font-mono)',
              color: 'var(--text-tertiary)',
            }}
          >
            <span>{a.domain}</span>
            <span style={{ color: 'var(--border-strong)' }}>·</span>
            <span>{a.attio}</span>
            <span style={{ color: 'var(--border-strong)' }}>·</span>
            <span>OWNER {a.owner}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="primary" size="md" onClick={placeCall}>
            Place Call
          </Button>
          <Button variant="secondary" size="md" onClick={escalate}>
            Escalate
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        <StatCard label="Annual Recurring" value={a.arrLabel} sub={a.mrrSub} />
        <StatCard label="Seat Capacity" value={a.seatPctLabel} sub={`${a.seatLabel} seats`} tone={capTone} />
        <StatCard label="Renewal" value={a.renewalShort} sub={a.renewalDate} tone={renewalTone} />
        <StatCard label="Health" value={a.healthLabel} sub="derived from signals" tone={a.health} />
      </div>

      {/* two-col */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 18, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* contact */}
          <div style={cardStyle}>
            <div style={cardLabelStyle}>PRIMARY CONTACT</div>
            <div style={{ font: 'var(--type-title)', marginTop: 12 }}>{a.contact.name}</div>
            <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-tertiary)', marginTop: 2 }}>
              {a.contact.title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)' }}>
                <Icon name="phone" size={15} color="var(--text-tertiary)" />
                <span style={{ font: 'var(--weight-medium) var(--text-sm)/1 var(--font-mono)' }}>{a.contact.phone}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)' }}>
                <Icon name="mail" size={15} color="var(--text-tertiary)" />
                <span style={{ font: 'var(--weight-medium) var(--text-sm)/1 var(--font-mono)' }}>{a.contact.email}</span>
              </div>
            </div>
          </div>

          {/* active signals */}
          <div style={cardStyle}>
            <div style={cardLabelStyle}>ACTIVE SIGNALS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
              {a.signals.map((sig, i) => (
                <div key={`${sig.type}-${i}`}>
                  <SignalChip type={sig.type} />
                  <div style={{ font: 'var(--type-body-sm)/1.5', color: 'var(--text-secondary)', marginTop: 7 }}>
                    {sig.note}
                  </div>
                  <div
                    style={{
                      font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)',
                      color: 'var(--text-tertiary)',
                      marginTop: 4,
                    }}
                  >
                    DETECTED {sig.detected}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* usage */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={cardLabelStyle}>SEAT USAGE · 12 WK</div>
              <MoneyDelta value={a.usageDelta} dir={a.usageDir} />
            </div>
            <div style={{ marginTop: 14 }}>
              <Sparkline data={a.usage} tone={sparkTone} width={312} height={56} />
            </div>
            <div
              style={{
                marginTop: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)',
                color: 'var(--text-tertiary)',
              }}
            >
              <span>CAPACITY</span>
              <span style={{ color: 'var(--text-secondary)' }}>{a.seatPctLabel}</span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 999,
                background: 'var(--viz-track)',
                overflow: 'hidden',
                marginTop: 8,
              }}
            >
              <div
                style={{ height: '100%', width: `${a.seatPct}%`, background: barColor, borderRadius: 999 }}
              />
            </div>
          </div>
        </div>

        {/* timeline */}
        <div
          style={{
            border: '1px solid var(--border-default)',
            borderRadius: 12,
            background: 'var(--surface-1)',
            padding: '20px 22px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18,
            }}
          >
            <div>
              <div style={{ font: 'var(--type-title)' }}>Communication History</div>
              <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-tertiary)', marginTop: 2 }}>
                Across email · voice · sms · n8n · Attio
              </div>
            </div>
            <Badge mono tone="neutral">
              {a.timeline.length}
            </Badge>
          </div>
          {a.timeline.map((t, i) => (
            <TimelineItem
              key={`${t.title}-${i}`}
              channel={t.channel as never}
              title={t.title}
              time={t.time}
              body={t.body}
              actor={t.actor}
              last={t.last}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
