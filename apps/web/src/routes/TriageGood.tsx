import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { StatusDot } from '../components/StatusDot.js';

interface OpportunityRow {
  companyId: string;
  name: string | null;
  status: string;
  stage: string | null;
  health: string | null;
  arr: number | null;
  contractValue: number | null;
  value: number | null;
}

const money = (n: number | null) => (n == null ? '—' : `$${Math.round(n).toLocaleString()}`);

export function TriageGood() {
  const [rows, setRows] = useState<OpportunityRow[]>([]);

  const refresh = useCallback(async () => {
    const { data } = await api<{ data: OpportunityRow[] }>('/triage/opportunity');
    setRows(data);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <section>
      <h1>Upsell Triage</h1>
      <p style={{ color: '#6b7280' }}>
        Healthy customers ranked by value at stake (ARR, else largest contract). Prioritise
        renewals and expansion conversations top-down.
      </p>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
            <th style={{ padding: 6 }}>Status</th>
            <th style={{ padding: 6 }}>Company</th>
            <th style={{ padding: 6 }}>Value</th>
            <th style={{ padding: 6 }}>Health</th>
            <th style={{ padding: 6 }}>Stage</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 50).map((r) => (
            <tr key={r.companyId} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: 6 }}>
                <StatusDot status={r.status} />
              </td>
              <td style={{ padding: 6 }}>{r.name ?? r.companyId.slice(0, 8)}</td>
              <td style={{ padding: 6 }}>{money(r.value)}</td>
              <td style={{ padding: 6 }}>{r.health ?? '—'}</td>
              <td style={{ padding: 6 }}>{r.stage ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 50 && (
        <p style={{ color: '#6b7280' }}>Showing top 50 of {rows.length}.</p>
      )}
    </section>
  );
}
