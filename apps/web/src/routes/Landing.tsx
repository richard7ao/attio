import { Link } from 'react-router-dom';

// *PLACEHOLDER* — Landing page (nav to demo works; content is placeholder)
export function Landing() {
  return (
    <main style={{ maxWidth: 720, margin: '10vh auto', padding: 24 }}>
      <h1>Attio — Account Management & Renewal Triage</h1>
      <p>
        A CRM extension for enterprise account management, upselling and renewals. Import clients
        from Attio, watch churn & expansion signals, and let agents reach out first — escalating to
        a human CSM when it matters.
      </p>
      <Link to="/demo">View the demo →</Link>
    </main>
  );
}
