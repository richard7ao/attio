import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout.js';
import { Landing } from './routes/Landing.js';
import { Demo } from './routes/Demo.js';
import { Dashboard } from './routes/Dashboard.js';
import { Auditing } from './routes/Auditing.js';
import { TriageGood } from './routes/TriageGood.js';
import { TriageBad } from './routes/TriageBad.js';
import { AllReachOuts } from './routes/AllReachOuts.js';
import { Simulator } from './routes/Simulator.js';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/demo" element={<Demo />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/auditing" element={<Auditing />} />
        <Route path="/triage/good" element={<TriageGood />} />
        <Route path="/triage/bad" element={<TriageBad />} />
        <Route path="/users/:userId/reach-outs" element={<AllReachOuts />} />
      </Route>
      {/* Standalone control panel — intentionally outside the app shell. */}
      <Route path="/simulator" element={<Simulator />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
