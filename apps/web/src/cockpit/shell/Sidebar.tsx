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
  { to: '/calls', label: 'Call Transcripts', icon: 'phone-call', matches: (p) => p === '/calls' },
  { to: '/accounts', label: 'Accounts', icon: 'users', matches: (p) => p === '/accounts' || p.startsWith('/account/') },
];
const SYSTEM: NavItem[] = [
  { to: '/signals', label: 'Signals', icon: 'radar', matches: (p) => p === '/signals' },
  { to: '/settings', label: 'Settings', icon: 'settings', matches: (p) => p === '/settings' },
];

const EXPANDED_WIDTH = 232;
const COLLAPSED_WIDTH = 64;

export function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { sidebarCollapsed, triageCount, upcomingCallCount, currentUser, settings } = useCockpit();
  const collapsed = sidebarCollapsed;
  const pulseAnim = settings.pulse ? 'pulseRing 2.4s infinite' : 'none';

  const renderNav = (item: NavItem, badge?: number, pulse?: boolean) => {
    const active = item.matches(pathname);
    return (
      <a
        key={item.to}
        href={`#${item.to}`}
        title={collapsed ? item.label : undefined}
        onClick={(e) => {
          e.preventDefault();
          navigate(item.to);
        }}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? 0 : 11,
          justifyContent: collapsed ? 'center' : 'flex-start',
          height: 38,
          padding: collapsed ? 0 : '0 12px',
          borderRadius: 8,
          textDecoration: 'none',
          font: 'var(--weight-medium) var(--text-sm)/1 var(--font-sans)',
          color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
          background: active ? 'var(--accent-soft)' : 'transparent',
          boxShadow: active ? 'inset 2px 0 0 var(--accent)' : 'none',
        }}
      >
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <Icon name={item.icon} size={17} />
          {/* When collapsed, surface the queue count / live pulse as a corner marker on the icon. */}
          {collapsed && badge != null && badge > 0 ? (
            <span
              style={{
                position: 'absolute',
                top: -5,
                right: -7,
                minWidth: 15,
                height: 15,
                padding: '0 4px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 999,
                background: 'var(--accent)',
                color: 'var(--on-accent)',
                font: 'var(--weight-semibold) 9px/1 var(--font-mono)',
              }}
            >
              {badge}
            </span>
          ) : null}
          {collapsed && pulse ? (
            <span style={{ position: 'absolute', top: -3, right: -4, width: 7, height: 7, borderRadius: '50%', background: 'var(--rag-green)', animation: pulseAnim }} />
          ) : null}
        </span>
        {!collapsed ? <span>{item.label}</span> : null}
        {!collapsed && badge != null ? (
          <span
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
        {!collapsed && pulse ? (
          <span style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: 'var(--rag-green)', animation: pulseAnim }} />
        ) : null}
      </a>
    );
  };

  return (
    <aside
      data-sidebar
      data-collapsed={collapsed ? '1' : '0'}
      style={{
        width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        flexShrink: 0,
        borderRight: '1px solid var(--border-subtle)',
        background: 'var(--surface-1)',
        position: 'sticky',
        top: 0,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: collapsed ? '16px 10px' : '16px 14px',
        transition: 'width .16s var(--ease-out), padding .16s var(--ease-out)',
        overflow: 'hidden',
      }}
    >
      <a
        href="#/"
        title={collapsed ? 'Rick' : undefined}
        onClick={(e) => {
          e.preventDefault();
          navigate('/');
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          justifyContent: collapsed ? 'center' : 'flex-start',
          textDecoration: 'none',
          padding: collapsed ? '6px 0 14px' : '6px 8px 14px',
        }}
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
        {!collapsed ? (
          <span style={{ font: 'var(--weight-semibold) 16px/1 var(--font-display)', letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
            Rick
          </span>
        ) : null}
      </a>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 6 }}>
        {!collapsed ? <div style={labelStyle}>WORKSPACE</div> : null}
        {renderNav(WORKSPACE[0]!)}
        {renderNav(WORKSPACE[1]!, triageCount)}
        {renderNav(WORKSPACE[2]!, upcomingCallCount > 0 ? upcomingCallCount : undefined)}
        {renderNav(WORKSPACE[3]!)}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 18 }}>
        {!collapsed ? <div style={labelStyle}>SYSTEM</div> : null}
        {renderNav(SYSTEM[0]!, undefined, true)}
        {renderNav(SYSTEM[1]!)}
      </div>

      <a
        href="#/settings"
        title={collapsed ? currentUser.name : undefined}
        onClick={(e) => {
          e.preventDefault();
          navigate('/settings');
        }}
        style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? 8 : 10,
          borderRadius: 10,
          border: '1px solid var(--border-subtle)',
          textDecoration: 'none',
        }}
      >
        <Avatar name={currentUser.name} size={collapsed ? 28 : 30} />
        {!collapsed ? (
          <div style={{ minWidth: 0 }}>
            <div style={{ font: 'var(--weight-semibold) var(--text-sm)/1.2 var(--font-sans)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>
              {currentUser.name}
            </div>
            <div style={{ font: 'var(--weight-medium) var(--text-2xs)/1.2 var(--font-mono)', color: 'var(--text-tertiary)' }}>
              {currentUser.role.toUpperCase()}
            </div>
          </div>
        ) : null}
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
