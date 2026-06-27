import { useLocation, useNavigate } from 'react-router-dom';
import { Avatar } from '../../design-system/index.js';
import { Icon } from '../../design-system/index.js';
import { useCockpit } from '../state/CockpitProvider.js';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  matches: (path: string) => boolean;
}

const WORKSPACE: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard', matches: (p) => p === '/dashboard' },
  { to: '/feed', label: 'Action Feed', icon: 'inbox', matches: (p) => p === '/feed' },
  { to: '/accounts', label: 'Accounts', icon: 'users', matches: (p) => p === '/accounts' || p.startsWith('/account/') },
];
const SYSTEM: NavItem[] = [
  { to: '/signals', label: 'Signals', icon: 'radar', matches: (p) => p === '/signals' },
  { to: '/settings', label: 'Settings', icon: 'settings', matches: (p) => p === '/settings' },
];

export function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { sidebarCollapsed, triageCount, currentUser, settings } = useCockpit();
  const collapsed = sidebarCollapsed;
  const pulseAnim = settings.pulse ? 'pulseRing 2.4s infinite' : 'none';

  const renderNav = (item: NavItem, badge?: number, pulse?: boolean) => {
    const active = item.matches(pathname);
    return (
      <a
        key={item.to}
        href={`#${item.to}`}
        data-railnav
        onClick={(e) => {
          e.preventDefault();
          navigate(item.to);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          height: 38,
          padding: '0 12px',
          borderRadius: 8,
          textDecoration: 'none',
          font: 'var(--weight-medium) var(--text-sm)/1 var(--font-sans)',
          color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
          background: active ? 'var(--accent-soft)' : 'transparent',
          boxShadow: active ? 'inset 2px 0 0 var(--accent)' : 'none',
        }}
      >
        <Icon name={item.icon} size={17} />
        <span data-railtext>{item.label}</span>
        {badge != null ? (
          <span
            data-railtext
            style={{
              marginLeft: 'auto',
              minWidth: 20,
              height: 18,
              padding: '0 6px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 999,
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              font: 'var(--weight-semibold) var(--text-2xs)/1 var(--font-mono)',
            }}
          >
            {badge}
          </span>
        ) : null}
        {pulse ? (
          <span
            data-railtext
            style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: 'var(--rag-green)', animation: pulseAnim }}
          />
        ) : null}
      </a>
    );
  };

  return (
    <aside
      data-sidebar
      data-collapsed={collapsed ? '1' : '0'}
      style={{
        width: 232,
        flexShrink: 0,
        borderRight: '1px solid var(--border-subtle)',
        background: 'var(--surface-1)',
        position: 'sticky',
        top: 0,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 14px',
        transition: 'width .16s var(--ease-out)',
      }}
    >
      <a
        href="#/"
        data-railnav
        onClick={(e) => {
          e.preventDefault();
          navigate('/');
        }}
        style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', padding: '6px 8px 14px' }}
      >
        <span
          style={{
            width: 24,
            height: 24,
            flex: 'none',
            borderRadius: 7,
            background: 'var(--accent-soft)',
            border: '1px solid var(--accent-border)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-text)',
          }}
        >
          <Icon name="radar" size={15} />
        </span>
        <span data-railtext style={{ font: 'var(--weight-semibold) 16px/1 var(--font-display)', letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
          Rick
        </span>
      </a>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 6 }}>
        <div data-railtext style={labelStyle}>WORKSPACE</div>
        {renderNav(WORKSPACE[0]!)}
        {renderNav(WORKSPACE[1]!, triageCount)}
        {renderNav(WORKSPACE[2]!)}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 18 }}>
        <div data-railtext style={labelStyle}>SYSTEM</div>
        {renderNav(SYSTEM[0]!, undefined, true)}
        {renderNav(SYSTEM[1]!)}
      </div>

      <a
        href="#/settings"
        data-railnav
        onClick={(e) => {
          e.preventDefault();
          navigate('/settings');
        }}
        style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: 10,
          borderRadius: 10,
          border: '1px solid var(--border-subtle)',
          textDecoration: 'none',
        }}
      >
        <Avatar name={currentUser.name} size={30} />
        <div data-railtext style={{ minWidth: 0 }}>
          <div style={{ font: 'var(--weight-semibold) var(--text-sm)/1.2 var(--font-sans)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>
            {currentUser.name}
          </div>
          <div style={{ font: 'var(--weight-medium) var(--text-2xs)/1.2 var(--font-mono)', color: 'var(--text-tertiary)' }}>
            {currentUser.role.toUpperCase()}
          </div>
        </div>
      </a>
    </aside>
  );
}

const labelStyle: React.CSSProperties = {
  font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)',
  letterSpacing: 'var(--tracking-label)',
  color: 'var(--text-tertiary)',
  padding: '8px 10px 6px',
};
