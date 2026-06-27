import { type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Icon } from '../../design-system/index.js';

const NAV: { to: string; label: string }[] = [
  { to: '/product', label: 'Product' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/attio', label: 'Built on Attio' },
];

export function Logo({ size = 28, iconSize = 15, opacity = 1 }: { size?: number; iconSize?: number; opacity?: number }) {
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

/** Shared marketing chrome: backdrop + routed nav + footer. Pages render as children. */
export function MarketingShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
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
        <nav style={{ display: 'flex', alignItems: 'center', gap: 14, height: 72 }}>
          <a
            href="#/"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: 'inherit' }}
          >
            <Logo />
            <span style={{ font: 'var(--weight-semibold) 19px/1 var(--font-display)', letterSpacing: '-0.01em' }}>Rick</span>
          </a>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 28 }}>
            {NAV.map((item) => {
              const active = pathname === item.to;
              return (
                <a
                  key={item.to}
                  href={`#${item.to}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(item.to);
                  }}
                  style={{
                    font: 'var(--weight-medium) var(--text-sm)/1 var(--font-sans)',
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    textDecoration: 'none',
                  }}
                >
                  {item.label}
                </a>
              );
            })}
            <Button variant="primary" size="sm" onClick={() => navigate('/dashboard')}>
              Open Dashboard
            </Button>
          </div>
        </nav>

        {children}

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
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)' }}>v1.0 · 2026</span>
        </footer>
      </div>
    </div>
  );
}

/** Mono uppercase section label. */
export function Eyebrow({ children, center = false }: { children: ReactNode; center?: boolean }) {
  return (
    <div
      style={{
        font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)',
        letterSpacing: 'var(--tracking-label)',
        color: 'var(--text-tertiary)',
        textAlign: center ? 'center' : 'left',
      }}
    >
      {children}
    </div>
  );
}

/** Section heading with an optional supporting paragraph. */
export function SectionTitle({ title, sub, center = false }: { title: ReactNode; sub?: ReactNode; center?: boolean }) {
  return (
    <div style={{ textAlign: center ? 'center' : 'left', maxWidth: center ? 640 : undefined, margin: center ? '0 auto' : undefined }}>
      <h2
        style={{
          margin: '14px 0 0',
          font: 'var(--weight-semibold) var(--text-2xl)/1.2 var(--font-sans)',
          letterSpacing: '-0.02em',
          textWrap: 'balance',
        }}
      >
        {title}
      </h2>
      {sub ? (
        <p style={{ margin: '16px 0 0', font: 'var(--type-body)/1.6', color: 'var(--text-secondary)', fontSize: 'var(--text-md)', textWrap: 'pretty' }}>
          {sub}
        </p>
      ) : null}
    </div>
  );
}

/** Icon + title + body card used across the feature/step grids. */
export function InfoCard({ icon, title, children }: { icon: string; title: ReactNode; children: ReactNode }) {
  return (
    <div
      style={{
        border: '1px solid var(--border-default)',
        borderRadius: 12,
        background: 'var(--surface-1)',
        padding: 24,
        boxShadow: 'inset 0 1px 0 var(--edge-light, rgba(255,255,255,0.04))',
      }}
    >
      <div style={{ display: 'inline-flex', width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent-text)' }}>
        <Icon name={icon} size={20} />
      </div>
      <h3 style={{ margin: '16px 0 0', font: 'var(--type-title)' }}>{title}</h3>
      <p style={{ margin: '8px 0 0', font: 'var(--type-body-sm)/1.6', color: 'var(--text-secondary)' }}>{children}</p>
    </div>
  );
}

/** Reusable closing call-to-action band. */
export function CTASection({ title, body, action = 'Open Dashboard', to = '/dashboard' }: { title: ReactNode; body: ReactNode; action?: string; to?: string }) {
  const navigate = useNavigate();
  return (
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
        <h2 style={{ margin: 0, font: 'var(--weight-semibold) var(--text-3xl)/1.1 var(--font-sans)', letterSpacing: '-0.02em' }}>{title}</h2>
        <p style={{ margin: '14px auto 0', maxWidth: 480, font: 'var(--type-body)/1.6', color: 'var(--text-secondary)', fontSize: 'var(--text-md)' }}>{body}</p>
        <div style={{ marginTop: 28 }}>
          <Button variant="primary" size="lg" onClick={() => navigate(to)}>
            {action}
          </Button>
        </div>
      </div>
    </section>
  );
}

/** Page hero: eyebrow pill + big title + lede. */
export function PageHero({ tag, title, lede }: { tag: string; title: ReactNode; lede: ReactNode }) {
  return (
    <header style={{ padding: '72px 0 48px', textAlign: 'center', maxWidth: 760, margin: '0 auto' }}>
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
        {tag}
      </div>
      <h1 style={{ margin: '22px 0 0', font: 'var(--weight-bold) var(--text-4xl)/1.07 var(--font-display)', letterSpacing: '-0.025em', textWrap: 'balance' }}>
        {title}
      </h1>
      <p style={{ margin: '20px auto 0', maxWidth: 580, font: 'var(--weight-regular) var(--text-lg)/1.5 var(--font-sans)', color: 'var(--text-secondary)', textWrap: 'pretty' }}>
        {lede}
      </p>
    </header>
  );
}
