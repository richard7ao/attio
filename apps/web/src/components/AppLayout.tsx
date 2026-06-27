import { Link, NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/triage/bad', label: 'Churn Triage' },
  { to: '/triage/good', label: 'Upsell Triage' },
  { to: '/auditing', label: 'Auditing' },
];

export function AppLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 220, padding: 16, borderRight: '1px solid #e5e7eb' }}>
        <Link to="/" style={{ fontWeight: 700 }}>
          Attio
        </Link>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main style={{ flex: 1, padding: 24 }}>
        <Outlet />
      </main>
    </div>
  );
}
