import { Link } from 'react-router-dom';

// *PLACEHOLDER* — Demo entry page
export function Demo() {
  return (
    <main style={{ maxWidth: 720, margin: '10vh auto', padding: 24 }}>
      <h1>Demo</h1>
      <p>Jump into the app:</p>
      <ul>
        <li>
          <Link to="/dashboard">Dashboard</Link>
        </li>
        <li>
          <Link to="/triage/bad">Churn triage (bad signals)</Link>
        </li>
        <li>
          <Link to="/triage/good">Upsell triage (good signals)</Link>
        </li>
      </ul>
    </main>
  );
}
