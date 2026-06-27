import { type ReactNode } from 'react';
import { Avatar, Badge, Icon, Select, Switch } from '../../design-system/index.js';
import { useCockpit } from '../state/CockpitProvider.js';

type IntegrationKey = 'attio' | 'stripe' | 'twilio' | 'sling' | 'n8n';

export function SettingsPage() {
  const { accounts, settings, setSetting, integrations, users, theme, setTheme } = useCockpit();

  const segButton = (target: 'light' | 'dark') => {
    const active = theme === target;
    return {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      height: 30,
      padding: '0 13px',
      border: 'none',
      borderRadius: 6,
      cursor: 'pointer',
      font: 'var(--weight-medium) var(--text-sm)/1 var(--font-sans)',
      background: active ? 'var(--surface-1)' : 'transparent',
      color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
      boxShadow: active ? 'var(--shadow-sm)' : 'none',
    } as const;
  };

  return (
    <div style={{ maxWidth: 920, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ margin: 0, font: 'var(--type-h2)' }}>Settings</h2>
        <p style={{ margin: '4px 0 0', font: 'var(--type-body-sm)', color: 'var(--text-tertiary)' }}>
          Workspace configuration · Rick
        </p>
      </div>

      {/* Appearance */}
      <Section title="Appearance" description="Choose how Rick looks for you.">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ font: 'var(--weight-semibold) var(--text-sm)/1.2 var(--font-sans)' }}>Theme</div>
            <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-tertiary)', marginTop: 2 }}>
              Switch between the light and dark cockpit.
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: 3,
              borderRadius: 9,
              border: '1px solid var(--border-default)',
              background: 'var(--surface-inset)',
            }}
          >
            <button onClick={() => setTheme('light')} style={segButton('light')}>
              <Icon name="sun" size={15} />
              Light
            </button>
            <button onClick={() => setTheme('dark')} style={segButton('dark')}>
              <Icon name="moon" size={15} />
              Dark
            </button>
          </div>
        </div>
      </Section>

      {/* Integrations */}
      <Section
        title="Integrations"
        description="Connect the systems Rick reads signals from and acts through."
      >
        {integrations.map((it) => {
          const key = it.key as IntegrationKey;
          return (
            <Row key={it.key} title={it.name} description={it.desc}>
              <Badge tone={settings[key] ? 'green' : 'neutral'} mono>
                {it.status}
              </Badge>
              <Switch checked={settings[key]} onChange={(v) => setSetting(key, v)} />
            </Row>
          );
        })}
      </Section>

      {/* Action Agent */}
      <Section title="Action Agent" description="How the AI agent triages and reaches out.">
        <Row
          title="Mode"
          description="Assist drafts for your review; Autopilot dispatches automatically."
        >
          <Select
            value={settings.agentMode}
            options={['Assist', 'Autopilot']}
            onChange={(e) => setSetting('agentMode', e.target.value as 'Assist' | 'Autopilot')}
            size="sm"
          />
        </Row>
        <Row title="Default outreach channel" description="First channel the agent reaches out on.">
          <Select
            value={settings.defaultChannel}
            options={['Voice', 'Email', 'SMS']}
            onChange={(e) => setSetting('defaultChannel', e.target.value as 'Voice' | 'Email' | 'SMS')}
            size="sm"
          />
        </Row>
        <Row
          title="Auto-dispatch low-risk calls"
          description="Let the agent place minor-severity calls without confirmation."
        >
          <Switch checked={settings.autoDispatch} onChange={(v) => setSetting('autoDispatch', v)} />
        </Row>
        <Row
          title="Live monitoring pulse"
          description="Animate the radar/status dots that show the engine is watching."
        >
          <Switch checked={settings.pulse} onChange={(v) => setSetting('pulse', v)} />
        </Row>
      </Section>

      {/* Team */}
      <Section title="Team" description="Customer Success Managers in this workspace.">
        {users.map((u) => (
          <div
            key={u.email}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '13px 18px',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <Avatar name={u.name} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: 'var(--weight-semibold) var(--text-sm)/1.2 var(--font-sans)' }}>{u.name}</div>
              <div
                style={{
                  font: 'var(--weight-medium) var(--text-2xs)/1.2 var(--font-mono)',
                  color: 'var(--text-tertiary)',
                }}
              >
                {u.email}
              </div>
            </div>
            <span
              style={{
                font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)',
                letterSpacing: 'var(--tracking-label)',
                color: 'var(--text-tertiary)',
              }}
            >
              {u.role}
            </span>
            <span
              style={{
                font: 'var(--weight-medium) var(--text-xs)/1 var(--font-mono)',
                color: 'var(--text-secondary)',
                fontVariantNumeric: 'tabular-nums',
                minWidth: 72,
                textAlign: 'right',
              }}
            >
              {accounts.filter((a) => a.owner === u.name).length} accounts
            </span>
          </div>
        ))}
      </Section>

      {/* Notifications */}
      <Section title="Notifications" description="What lands in your inbox.">
        <Row title="Red-tier alerts" description="Notify immediately when an account turns Red.">
          <Switch checked={settings.redAlerts} onChange={(v) => setSetting('redAlerts', v)} />
        </Row>
        <Row title="Renewal reminders" description="Remind me 30 days before each renewal.">
          <Switch checked={settings.renewalReminders} onChange={(v) => setSetting('renewalReminders', v)} />
        </Row>
        <Row title="Weekly digest" description="A Monday summary of pipeline health.">
          <Switch checked={settings.weeklyDigest} onChange={(v) => setSetting('weeklyDigest', v)} />
        </Row>
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        border: '1px solid var(--border-default)',
        borderRadius: 12,
        background: 'var(--surface-1)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ font: 'var(--type-title)' }}>{title}</div>
        <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-tertiary)', marginTop: 2 }}>
          {description}
        </div>
      </div>
      {children}
    </div>
  );
}

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 18px',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: 'var(--weight-semibold) var(--text-sm)/1.2 var(--font-sans)' }}>{title}</div>
        <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-tertiary)', marginTop: 2 }}>
          {description}
        </div>
      </div>
      {children}
    </div>
  );
}
