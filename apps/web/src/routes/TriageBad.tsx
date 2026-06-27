import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { StatusDot } from '../components/StatusDot.js';

interface RiskRow {
  companyId: string;
  name: string | null;
  score: number;
  status: string;
  reason: string | null;
  escalationId: string | null;
  acked: boolean | null;
  briefStatus: string | null;
  briefSummary: string | null;
  briefChurnDrivers: string | null;
  briefRecommendedPlay: string | null;
  briefArrAtRisk: number | null;
}

const money = (n: number | null) => (n == null ? null : `$${Math.round(n).toLocaleString()}`);

export function TriageBad() {
  const [rows, setRows] = useState<RiskRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [pushed, setPushed] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    const { data } = await api<{ data: RiskRow[] }>('/triage/risk');
    setRows(data);
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 5000);
    return () => clearInterval(t);
  }, [refresh]);

  const ack = useCallback(
    async (id: string) => {
      setBusy(id);
      try {
        await api(`/escalations/${id}/ack`, { method: 'POST' });
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  const pushToAttio = useCallback(async (companyId: string) => {
    setBusy(companyId);
    setPushed((p) => ({ ...p, [companyId]: 'pushing…' }));
    try {
      await api(`/attio/push/${companyId}`, { method: 'POST' });
      setPushed((p) => ({ ...p, [companyId]: 'pushed ✓' }));
    } catch {
      setPushed((p) => ({ ...p, [companyId]: 'failed' }));
    } finally {
      setBusy(null);
    }
  }, []);

  return (
    <section>
      <h1>Churn Triage</h1>
      <p style={{ color: '#6b7280' }}>
        At-risk accounts, worst first. Each carries the Head-of-Data brief generated when it turned
        red. Agents reach out first; ack to claim for a CSM.
      </p>
      {rows.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No at-risk accounts.</p>
      ) : (
        rows.map((r) => (
          <div
            key={r.companyId}
            style={{
              border: '1px solid #e5e7eb',
              borderLeft: `4px solid ${r.status === 'red' ? '#ef4444' : '#f59e0b'}`,
              borderRadius: 8,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StatusDot status={r.status} />
              <strong style={{ flex: 1 }}>{r.name ?? r.companyId.slice(0, 8)}</strong>
              <span style={{ color: '#6b7280' }}>score {Math.round(r.score)}</span>
              {r.escalationId && !r.acked && (
                <button onClick={() => void ack(r.escalationId!)} disabled={busy === r.escalationId}>
                  ack
                </button>
              )}
              {r.acked && <span style={{ color: '#6b7280', fontSize: 13 }}>claimed</span>}
              <button onClick={() => void pushToAttio(r.companyId)} disabled={busy === r.companyId}>
                Push to Attio
              </button>
              {pushed[r.companyId] && (
                <span style={{ color: '#6b7280', fontSize: 12 }}>{pushed[r.companyId]}</span>
              )}
            </div>
            <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>{r.reason}</div>
            {r.briefStatus === 'ready' ? (
              <div style={{ marginTop: 8, fontSize: 13 }}>
                <div>{r.briefSummary}</div>
                {r.briefChurnDrivers && (
                  <div>
                    <strong>Drivers:</strong> {r.briefChurnDrivers}
                  </div>
                )}
                <div>
                  <strong>Play:</strong> {r.briefRecommendedPlay}
                </div>
                {money(r.briefArrAtRisk) && (
                  <div>
                    <strong>ARR at risk:</strong> {money(r.briefArrAtRisk)}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginTop: 8, color: '#9ca3af', fontSize: 13 }}>
                Brief {r.briefStatus ?? 'not generated'}…
              </div>
            )}
          </div>
        ))
      )}
    </section>
  );
}
