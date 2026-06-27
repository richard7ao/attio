import { Navigate, Route, Routes } from 'react-router-dom';
import { CockpitProvider } from './cockpit/state/CockpitProvider.js';
import { AppShell } from './cockpit/shell/AppShell.js';
import { Landing } from './cockpit/pages/Landing.js';
import { DashboardPage } from './cockpit/pages/DashboardPage.js';
import { FeedPage } from './cockpit/pages/FeedPage.js';
import { AccountsPage } from './cockpit/pages/AccountsPage.js';
import { SignalsPage } from './cockpit/pages/SignalsPage.js';
import { SettingsPage } from './cockpit/pages/SettingsPage.js';
import { AccountProfilePage } from './cockpit/pages/AccountProfilePage.js';

export function App() {
  return (
    <CockpitProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/signals" element={<SignalsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/account/:id" element={<AccountProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </CockpitProvider>
  );
}
