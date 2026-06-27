import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { StatusDot } from '../components/StatusDot.js';
import { STATUS_COLOR } from '../components/status.js';

interface CompanyChurn {
  companyId: string;
  name: string | null;
  score: number;
  status: 'red' | 'amber' | 'green';
  reason: string | null;
}

interface StripeCompany {
  companyId: string;
  name: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

function Card({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div
      style={{
        flex: 1,
        padding: 16,
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, color: color ?? '#111827' }}>{value}</div>
      <div style={{ color: '#6b7280', fontSize: 13 }}>{label}</div>
    </div>
  );
}

export function Dashboard() {
  const [companies, setCompanies] = useState<CompanyChurn[]>([]);
  const [linked, setLinked] = useState<StripeCompany[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [c, l] = await Promise.all([
      api<{ data: CompanyChurn[] }>('/companies/churn'),
      api<{ data: StripeCompany[] }>('/stripe/companies'),
    ]);
    setCompanies(c.data);
    setLinked(l.data);
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 4000); // reflect webhook-driven churn
    return () => clearInterval(t);
  }, [refresh]);

  const counts = {
    red: companies.filter((c) => c.status === 'red').length,
    amber: companies.filter((c) => c.status === 'amber').length,
    green: companies.filter((c) => c.status === 'green').length,
  };
  const statusOf = (id: string) => companies.find((c) => c.companyId === id)?.status ?? 'green';

  const linkMore = useCallback(async () => {
    setBusy('link');
    try {
      await api('/stripe/link', { method: 'POST', body: JSON.stringify({ limit: 5 }) });
      await refresh();
    } finally {
      setBusy(null);
    }
  }, [refresh]);

  const cancel = useCallback(
    async (companyId: string) => {
      setBusy(companyId);
      try {
        await api(`/stripe/companies/${companyId}/cancel`, { method: 'POST' });
        // Webhook drives the churn flip; poll until it lands.
        setTimeout(() => void refresh(), 1500);
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  const topRisk = companies.filter((c) => c.status !== 'green').slice(0, 8);

  return (
    <section>
      <h1>Dashboard</h1>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <Card label="Companies" value={companies.length} />
        <Card label="Red" value={counts.red} color={STATUS_COLOR.red} />
        <Card label="Amber" value={counts.amber} color={STATUS_COLOR.amber} />
        <Card label="Green" value={counts.green} color={STATUS_COLOR.green} />
      </div>

      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h2>Top at-risk accounts</h2>
          {topRisk.length === 0 ? (
            <p style={{ color: '#6b7280' }}>All accounts healthy.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {topRisk.map((c) => (
                <li key={c.companyId} style={{ padding: '6px 0' }}>
                  <StatusDot status={c.status} />
                  {c.name ?? c.companyId.slice(0, 8)}{' '}
                  <span style={{ color: '#6b7280' }}>
                    — score {Math.round(c.score)} ({c.reason ?? 'n/a'})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <h2>
            Stripe-linked accounts{' '}
            <button onClick={() => void linkMore()} disabled={busy === 'link'}>
              {busy === 'link' ? 'linking…' : 'Link 5 more'}
            </button>
          </h2>
          <p style={{ color: '#6b7280', fontSize: 13 }}>
            Cancel a subscription to fire a real Stripe webhook → churn flips to red.
          </p>
          {linked.length === 0 ? (
            <p style={{ color: '#6b7280' }}>None linked yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {linked.map((c) => (
                <li
                  key={c.companyId}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}
                >
                  <StatusDot status={statusOf(c.companyId)} />
                  <span style={{ flex: 1 }}>{c.name ?? c.companyId.slice(0, 8)}</span>
                  <button
                    onClick={() => void cancel(c.companyId)}
                    disabled={busy === c.companyId || statusOf(c.companyId) === 'red'}
                  >
                    {statusOf(c.companyId) === 'red' ? 'cancelled' : 'Cancel subscription'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
