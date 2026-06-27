import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Avatar, Icon, IconButton, SearchField } from '../../design-system/index.js';
import { useCockpit } from '../state/CockpitProvider.js';

function usePageTitle(): string {
  const { pathname } = useLocation();
  const { id } = useParams();
  const { accountById } = useCockpit();
  if (pathname === '/dashboard') return 'Health Dashboard';
  if (pathname === '/feed') return 'Action Agent';
  if (pathname === '/calls') return 'Call Log';
  if (pathname === '/accounts') return 'Accounts';
  if (pathname === '/signals') return 'Signals';
  if (pathname === '/settings') return 'Settings';
  if (pathname.startsWith('/account/')) return accountById(id ?? '')?.name ?? 'Account';
  return 'Rick';
}

export function TopBar() {
  const navigate = useNavigate();
  const title = usePageTitle();
  const { query, setQuery, owner, setOwner, owners, currentUser, users, setCurrentUser, toggleSidebar } = useCockpit();
  const [menu, setMenu] = useState<'owner' | 'user' | null>(null);

  return (
    <header
      style={{
        height: 56,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '0 24px',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        background: 'var(--scrim)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 50,
      }}
    >
      <IconButton variant="ghost" size="sm" aria-label="Collapse sidebar" onClick={toggleSidebar} style={{ marginLeft: -6 }}>
        <Icon name="panel-left" size={18} />
      </IconButton>
      <h1 style={{ margin: 0, font: 'var(--weight-semibold) var(--text-md)/1.1 var(--font-sans)', whiteSpace: 'nowrap' }}>{title}</h1>

      <div style={{ marginLeft: 18, flex: 1, maxWidth: 340 }}>
        <SearchField value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search accounts…" hint="⌘K" width="100%" />
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* owner filter */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenu((m) => (m === 'owner' ? null : 'owner'))}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: 34,
              padding: '0 10px 0 12px',
              borderRadius: 8,
              border: `1px solid ${menu === 'owner' ? 'var(--accent-border)' : 'var(--border-default)'}`,
              background: 'var(--surface-inset)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              font: 'var(--weight-medium) var(--text-sm)/1 var(--font-sans)',
            }}
          >
            <Icon name="users" size={14} color="var(--text-tertiary)" />
            <span style={{ whiteSpace: 'nowrap' }}>{owner}</span>
            <Icon name="chevron-down" size={14} color="var(--text-tertiary)" />
          </button>
          {menu === 'owner' ? (
            <Menu>
              {owners.map((name) => (
                <MenuItem
                  key={name}
                  active={name === owner}
                  onClick={() => {
                    setOwner(name);
                    setMenu(null);
                  }}
                >
                  <span style={{ flex: 1 }}>{name}</span>
                  {name === owner ? <Icon name="check" size={15} color="var(--accent-text)" /> : null}
                </MenuItem>
              ))}
            </Menu>
          ) : null}
        </div>

        {/* user switcher */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenu((m) => (m === 'user' ? null : 'user'))}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: 36,
              padding: '3px 8px 3px 4px',
              borderRadius: 999,
              border: `1px solid ${menu === 'user' ? 'var(--accent-border)' : 'var(--border-default)'}`,
              background: 'var(--surface-1)',
              cursor: 'pointer',
            }}
          >
            <Avatar name={currentUser.name} size={28} />
            <span style={{ font: 'var(--weight-medium) var(--text-sm)/1 var(--font-sans)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              {currentUser.name}
            </span>
            <Icon name="chevron-down" size={14} color="var(--text-tertiary)" />
          </button>
          {menu === 'user' ? (
            <Menu width={248}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px 12px' }}>
                <Avatar name={currentUser.name} size={34} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ font: 'var(--weight-semibold) var(--text-sm)/1.2 var(--font-sans)', color: 'var(--text-primary)' }}>{currentUser.name}</div>
                  <div style={{ font: 'var(--weight-medium) var(--text-2xs)/1.2 var(--font-mono)', color: 'var(--text-tertiary)' }}>{currentUser.email}</div>
                </div>
              </div>
              <Divider />
              <div style={{ ...labelStyle, padding: '4px 8px 6px' }}>SWITCH USER</div>
              {users.map((u) => (
                <MenuItem
                  key={u.name}
                  active={u.name === currentUser.name}
                  onClick={() => {
                    setCurrentUser(u.name);
                    setMenu(null);
                  }}
                >
                  <Avatar name={u.name} size={22} />
                  <span style={{ flex: 1 }}>{u.name}</span>
                  {u.name === currentUser.name ? <Icon name="check" size={15} color="var(--accent-text)" /> : null}
                </MenuItem>
              ))}
              <Divider />
              <MenuItem
                onClick={() => {
                  setMenu(null);
                  navigate('/settings');
                }}
              >
                <Icon name="settings" size={16} color="var(--text-tertiary)" />
                <span>Settings</span>
              </MenuItem>
            </Menu>
          ) : null}
        </div>
      </div>

      {menu ? (
        <div onClick={() => setMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 45 }} />
      ) : null}
    </header>
  );
}

function Menu({ children, width = 220 }: { children: React.ReactNode; width?: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: 'calc(100% + 6px)',
        zIndex: 60,
        width,
        padding: 6,
        borderRadius: 10,
        background: 'var(--surface-3)',
        border: '1px solid var(--border-strong)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      {children}
    </div>
  );
}

function MenuItem({ children, active = false, onClick }: { children: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        width: '100%',
        height: 36,
        padding: '0 8px',
        border: 'none',
        borderRadius: 7,
        background: active ? 'var(--accent-soft)' : 'transparent',
        color: active ? 'var(--accent-text)' : 'var(--text-secondary)',
        cursor: 'pointer',
        font: 'var(--weight-medium) var(--text-sm)/1 var(--font-sans)',
        textAlign: 'left',
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--border-subtle)', margin: '6px 0' }} />;
}

const labelStyle: React.CSSProperties = {
  font: 'var(--weight-medium) var(--text-2xs)/1 var(--font-mono)',
  letterSpacing: 'var(--tracking-label)',
  color: 'var(--text-tertiary)',
};
