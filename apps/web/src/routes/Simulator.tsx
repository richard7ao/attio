import { Fragment, useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

// ---------------------------------------------------------------------------
// Standalone churn "control panel". Intentionally self-contained — it does not
// use the app shell (AppLayout) and carries its own dark theme so it reads as a
// separate operator/dev tool rather than part of the product UI.
// ---------------------------------------------------------------------------

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
  briefStatus: string;
  briefSummary: string | null;
  briefRecommendedPlay: string | null;
}

const C = {
  bg: '#0b1020',
  panel: '#141a2e',
  panel2: '#1c2440',
  border: '#2a3354',
  text: '#e5e9f5',
  muted: '#8b95b5',
  accent: '#6366f1',
};
const DOT: Record<string, string> = { red: '#ef4444', amber: '#f59e0b', green: '#22c55e' };

function Dot({ status }: { status: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 9,
        height: 9,
        borderRadius: '50%',
        background: DOT[status] ?? '#6b7280',
        marginRight: 8,
        boxShadow: `0 0 8px ${DOT[status] ?? 'transparent'}`,
      }}
    />
  );
}

const btn = (primary = false): React.CSSProperties => ({
  background: primary ? C.accent : 'transparent',
  color: primary ? '#fff' : C.text,
  border: `1px solid ${primary ? C.accent : C.border}`,
  borderRadius: 6,
  padding: '5px 10px',
  fontSize: 12,
  cursor: 'pointer',
});

export function Simulator() {
  const [companies, setCompanies] = useState<CompanyChurn[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [composeFor, setComposeFor] = useState<string | null>(null);
  const [ticketText, setTicketText] = useState('');

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

  const sendGenericTicket = (companyId: string) =>
    sendSignal(companyId, {
      source: 'support',
      type: 'support_ticket',
      metadata: { note: 'General support ticket raised by the customer.' },
    });

  const sendCustomTicket = useCallback(
    async (companyId: string) => {
      const note = ticketText.trim();
      if (!note) return;
      await sendSignal(companyId, { source: 'support', type: 'support_ticket', metadata: { note } });
      setComposeFor(null);
      setTicketText('');
    },
    [ticketText, sendSignal],
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
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, padding: 32 }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            borderBottom: `1px solid ${C.border}`,
            paddingBottom: 16,
            marginBottom: 24,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 22, letterSpacing: 0.5 }}>⚙ Churn Simulator</h1>
          <span style={{ color: C.muted, fontSize: 13 }}>
            operator control panel — drive the signal pipeline by hand
          </span>
          <a href="/dashboard" style={{ marginLeft: 'auto', color: C.accent, fontSize: 13 }}>
            ← back to app
          </a>
        </header>

        {/* Escalations */}
        <section
          style={{
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 15 }}>Escalations · red · unclaimed</h2>
          {escalations.length === 0 ? (
            <p style={{ color: C.muted, margin: 0 }}>None.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {escalations.map((e) => (
                <li key={e.id} style={{ padding: '8px 0', borderTop: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Dot status={e.status} />
                    <span style={{ flex: 1 }}>
                      {companies.find((c) => c.companyId === e.companyId)?.name ??
                        e.companyId.slice(0, 8)}{' '}
                      <span style={{ color: C.muted }}>
                        — {e.reason} (score {Math.round(e.score)})
                      </span>
                    </span>
                    <button style={btn()} onClick={() => void ack(e.id)}>
                      ack
                    </button>
                  </div>
                  {e.briefStatus === 'ready' && (
                    <div
                      style={{
                        marginTop: 6,
                        marginLeft: 17,
                        padding: 10,
                        background: C.panel2,
                        borderLeft: `3px solid ${DOT.red}`,
                        borderRadius: 4,
                        fontSize: 13,
                      }}
                    >
                      <div>
                        <strong>Head of Data:</strong> {e.briefSummary}
                      </div>
                      <div style={{ color: C.muted }}>
                        <strong>Play:</strong> {e.briefRecommendedPlay}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Companies */}
        <section
          style={{
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 15 }}>Companies</h2>
            <input
              placeholder="filter…"
              value={filter}
              onChange={(ev) => setFilter(ev.target.value)}
              style={{
                marginLeft: 'auto',
                padding: '6px 10px',
                width: 240,
                background: C.bg,
                color: C.text,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
              }}
            />
          </div>

          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: C.muted }}>
                <th style={{ padding: 8, fontWeight: 500 }}>Status</th>
                <th style={{ padding: 8, fontWeight: 500 }}>Company</th>
                <th style={{ padding: 8, fontWeight: 500 }}>Score</th>
                <th style={{ padding: 8, fontWeight: 500 }}>Signals</th>
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, 50).map((c) => (
                <Fragment key={c.companyId}>
                  <tr style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: 8 }}>
                      <Dot status={c.status} />
                      {c.status}
                    </td>
                    <td style={{ padding: 8 }}>{c.name ?? c.companyId.slice(0, 8)}</td>
                    <td style={{ padding: 8 }}>{Math.round(c.score)}</td>
                    <td style={{ padding: 8 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        <button
                          style={btn()}
                          disabled={busy === c.companyId}
                          onClick={() =>
                            void sendSignal(c.companyId, {
                              source: 'stripe',
                              type: 'stripe_cancellation',
                            })
                          }
                        >
                          Stripe cancel
                        </button>
                        <button
                          style={btn()}
                          disabled={busy === c.companyId}
                          onClick={() =>
                            void sendSignal(c.companyId, {
                              source: 'usage',
                              type: 'usage_drop',
                              value: 70,
                            })
                          }
                        >
                          Usage drop 70%
                        </button>
                        <button
                          style={btn()}
                          disabled={busy === c.companyId}
                          onClick={() => void sendGenericTicket(c.companyId)}
                        >
                          Generic ticket
                        </button>
                        <button
                          style={btn(composeFor === c.companyId)}
                          onClick={() => {
                            setComposeFor(composeFor === c.companyId ? null : c.companyId);
                            setTicketText('');
                          }}
                        >
                          Custom ticket…
                        </button>
                      </div>
                    </td>
                  </tr>
                  {composeFor === c.companyId && (
                    <tr style={{ background: C.panel2 }}>
                      <td colSpan={4} style={{ padding: 12 }}>
                        <label style={{ color: C.muted, fontSize: 12 }}>
                          Custom support ticket (the Head-of-Data agent reads this verbatim)
                        </label>
                        <textarea
                          autoFocus
                          value={ticketText}
                          onChange={(ev) => setTicketText(ev.target.value)}
                          placeholder="e.g. Customer escalated: repeated API 500s for 3 days, threatening to cancel unless resolved this week."
                          rows={3}
                          style={{
                            width: '100%',
                            marginTop: 6,
                            padding: 10,
                            background: C.bg,
                            color: C.text,
                            border: `1px solid ${C.border}`,
                            borderRadius: 6,
                            fontFamily: 'inherit',
                            resize: 'vertical',
                          }}
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button
                            style={btn(true)}
                            disabled={busy === c.companyId || ticketText.trim().length === 0}
                            onClick={() => void sendCustomTicket(c.companyId)}
                          >
                            Send custom ticket
                          </button>
                          <button
                            style={btn()}
                            onClick={() => {
                              setComposeFor(null);
                              setTicketText('');
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          {shown.length > 50 && (
            <p style={{ color: C.muted }}>Showing first 50 of {shown.length}.</p>
          )}
        </section>
      </div>
    </div>
  );
}
