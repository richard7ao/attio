import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

interface CompanyChurn {
  companyId: string;
  name: string | null;
  score: number;
  status: 'red' | 'amber' | 'green';
  reason: string | null;
}

interface Escalation {
  id: string;
  companyId: string;
  status: string;
  score: number;
  reason: string | null;
  acked: boolean;
  createdAt: string;
}

const STATUS_COLOR: Record<string, string> = {
  red: '#ef4444',
  amber: '#f59e0b',
  green: '#22c55e',
};

function Dot({ status }: { status: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: STATUS_COLOR[status] ?? '#9ca3af',
        marginRight: 8,
      }}
    />
  );
}

export function Simulator() {
  const [companies, setCompanies] = useState<CompanyChurn[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [c, e] = await Promise.all([
      api<{ data: CompanyChurn[] }>('/companies/churn'),
      api<{ data: Escalation[] }>('/escalations?status=red&unclaimed=true'),
    ]);
    setCompanies(c.data);
    setEscalations(e.data);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sendSignal = useCallback(
    async (companyId: string, body: Record<string, unknown>) => {
      setBusy(companyId);
      try {
        await api('/signals', { method: 'POST', body: JSON.stringify({ companyId, ...body }) });
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  const ack = useCallback(
    async (id: string) => {
      await api(`/escalations/${id}/ack`, { method: 'POST' });
      await refresh();
    },
    [refresh],
  );

  const shown = companies.filter((c) =>
    (c.name ?? c.companyId).toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <section>
      <h1>Churn Simulator</h1>
      <p>
        Drive the signal pipeline by hand. A Stripe cancellation flips a company to{' '}
        <strong style={{ color: STATUS_COLOR.red }}>red</strong> instantly and creates an escalation
        for the voice team.
      </p>

      <h2>Escalations (red, unclaimed)</h2>
      {escalations.length === 0 ? (
        <p style={{ color: '#6b7280' }}>None.</p>
      ) : (
        <ul>
          {escalations.map((e) => (
            <li key={e.id} style={{ marginBottom: 6 }}>
              <Dot status={e.status} />
              {e.companyId.slice(0, 8)} — {e.reason} (score {Math.round(e.score)}){' '}
              <button onClick={() => void ack(e.id)}>ack</button>
            </li>
          ))}
        </ul>
      )}

      <h2 style={{ marginTop: 24 }}>Companies</h2>
      <input
        placeholder="filter…"
        value={filter}
        onChange={(ev) => setFilter(ev.target.value)}
        style={{ marginBottom: 12, padding: 6, width: 260 }}
      />
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
            <th style={{ padding: 6 }}>Status</th>
            <th style={{ padding: 6 }}>Company</th>
            <th style={{ padding: 6 }}>Score</th>
            <th style={{ padding: 6 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {shown.slice(0, 50).map((c) => (
            <tr key={c.companyId} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: 6 }}>
                <Dot status={c.status} />
                {c.status}
              </td>
              <td style={{ padding: 6 }}>{c.name ?? c.companyId.slice(0, 8)}</td>
              <td style={{ padding: 6 }}>{Math.round(c.score)}</td>
              <td style={{ padding: 6, display: 'flex', gap: 6 }}>
                <button
                  disabled={busy === c.companyId}
                  onClick={() =>
                    void sendSignal(c.companyId, { source: 'stripe', type: 'stripe_cancellation' })
                  }
                >
                  Stripe cancel
                </button>
                <button
                  disabled={busy === c.companyId}
                  onClick={() =>
                    void sendSignal(c.companyId, { source: 'usage', type: 'usage_drop', value: 70 })
                  }
                >
                  Usage drop 70%
                </button>
                <button
                  disabled={busy === c.companyId}
                  onClick={() =>
                    void sendSignal(c.companyId, { source: 'support', type: 'support_ticket' })
                  }
                >
                  Support ticket
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {shown.length > 50 && <p style={{ color: '#6b7280' }}>Showing first 50 of {shown.length}.</p>}
    </section>
  );
}
