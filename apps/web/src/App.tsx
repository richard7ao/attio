import { Navigate, Route, Routes } from 'react-router-dom';
import { CockpitProvider } from './cockpit/state/CockpitProvider.js';
import { AppShell } from './cockpit/shell/AppShell.js';
import { Landing } from './cockpit/pages/Landing.js';
import { ProductPage } from './cockpit/pages/ProductPage.js';
import { HowItWorksPage } from './cockpit/pages/HowItWorksPage.js';
import { AttioPage } from './cockpit/pages/AttioPage.js';
import { DashboardPage } from './cockpit/pages/DashboardPage.js';
import { FeedPage } from './cockpit/pages/FeedPage.js';
import { AccountsPage } from './cockpit/pages/AccountsPage.js';
import { SignalsPage } from './cockpit/pages/SignalsPage.js';
import { SettingsPage } from './cockpit/pages/SettingsPage.js';
import { AccountProfilePage } from './cockpit/pages/AccountProfilePage.js';
import { CallsPage } from './cockpit/pages/CallsPage.js';
// Standalone operator pages (not part of the cockpit nav) — reachable by direct URL.
import { Simulator } from './routes/Simulator.js';
import { TriageBad } from './routes/TriageBad.js';
import { TriageGood } from './routes/TriageGood.js';
import { Dashboard as OpsDashboard } from './routes/Dashboard.js';

export function App() {
  return (
    <CockpitProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        {/* Public marketing pages (shared MarketingShell chrome, outside the cockpit). */}
        <Route path="/product" element={<ProductPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/attio" element={<AttioPage />} />
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/calls" element={<CallsPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/signals" element={<SignalsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/account/:id" element={<AccountProfilePage />} />
        </Route>
        {/* Standalone operator tools — direct URLs, intentionally not in the cockpit nav. */}
        <Route path="/simulator" element={<Simulator />} />
        <Route path="/triage/bad" element={<TriageBad />} />
        <Route path="/triage/good" element={<TriageGood />} />
        <Route path="/ops/dashboard" element={<OpsDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </CockpitProvider>
  );
}
