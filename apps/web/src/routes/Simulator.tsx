import { Fragment, useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

// ---------------------------------------------------------------------------
// Standalone churn "control panel". Uses the cockpit design system tokens
// so it reads as part of the product while remaining a separate operator tool.
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

interface StripeLink {
  companyId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

// --- Design tokens (match the cockpit's design-system/styles.css) ---
const T = {
  bg: '#0A0D14',
  surface1: '#10141E',
  surface2: '#161B28',
  surface3: '#1E2433',
  inset: '#0C0F17',
  border: 'rgba(255,255,255,0.10)',
  borderStrong: 'rgba(255,255,255,0.16)',
  text: '#EAEEF6',
  textSec: '#A2ABBF',
  textTert: '#6C7689',
  accent: '#4C8DFF',
  accentSoft: 'rgba(76,141,255,0.13)',
  accentBorder: 'rgba(76,141,255,0.42)',
  red: '#FB5E73',
  redSoft: 'rgba(251,94,115,0.12)',
  redBorder: 'rgba(251,94,115,0.34)',
  amber: '#F5B13D',
  amberSoft: 'rgba(245,177,61,0.12)',
  amberBorder: 'rgba(245,177,61,0.34)',
  green: '#2FD98A',
  greenSoft: 'rgba(47,217,138,0.12)',
  greenBorder: 'rgba(47,217,138,0.32)',
  radius: '10px',
  radiusSm: '6px',
  shadowMd: '0 6px 18px rgba(0,0,0,0.45)',
  fontSans: "'IBM Plex Sans', system-ui, sans-serif",
  fontMono: "'IBM Plex Mono', monospace",
  fontDisplay: "'Space Grotesk', sans-serif",
};

const RAG: Record<string, { dot: string; soft: string; border: string; text: string }> = {
  red: { dot: T.red, soft: T.redSoft, border: T.redBorder, text: T.red },
  amber: { dot: T.amber, soft: T.amberSoft, border: T.amberBorder, text: T.amber },
  green: { dot: T.green, soft: T.greenSoft, border: T.greenBorder, text: T.green },
};

function StatusBadge({ status }: { status: string }) {
  const r = RAG[status] ?? RAG.green!;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        fontFamily: T.fontMono,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        background: r.soft,
        border: `1px solid ${r.border}`,
        color: r.text,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: r.dot }} />
      {status}
    </span>
  );
}

function ScorePill({ score }: { score: number }) {
  const r = score >= 70 ? RAG.red! : score >= 40 ? RAG.amber! : RAG.green!;
  return (
    <span
      style={{
        fontFamily: T.fontMono,
        fontSize: 13,
        fontWeight: 600,
        color: r.text,
        minWidth: 32,
        textAlign: 'right' as const,
      }}
    >
      {Math.round(score)}
    </span>
  );
}

const btn = (primary = false): React.CSSProperties => ({
  background: primary ? T.accent : 'transparent',
  color: primary ? '#fff' : T.textSec,
  border: `1px solid ${primary ? T.accent : T.border}`,
  borderRadius: T.radiusSm,
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 500,
  fontFamily: T.fontSans,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
});

const stripeSubUrl = (subId: string) => `https://dashboard.stripe.com/test/subscriptions/${subId}`;

export function Simulator() {
  const [companies, setCompanies] = useState<CompanyChurn[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [stripe, setStripe] = useState<Record<string, StripeLink>>({});
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [composeFor, setComposeFor] = useState<string | null>(null);
  const [ticketText, setTicketText] = useState('');

  const refresh = useCallback(async () => {
    const [c, e, s] = await Promise.all([
      api<{ data: CompanyChurn[] }>('/companies/churn'),
      api<{ data: Escalation[] }>('/escalations?status=red&unclaimed=true'),
      api<{ data: StripeLink[] }>('/stripe/companies'),
    ]);
    setCompanies(c.data);
    setEscalations(e.data);
    setStripe(Object.fromEntries(s.data.map((l) => [l.companyId, l])));
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

  const openCustomerPortal = useCallback(async (companyId: string) => {
    setBusy(companyId);
    try {
      const res = await api<{ url: string }>(`/stripe/companies/${companyId}/portal`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      window.open(res.url, '_blank');
    } finally {
      setBusy(null);
    }
  }, []);

  const linkStripe = useCallback(
    async (companyId: string) => {
      setBusy(companyId);
      try {
        await api(`/stripe/companies/${companyId}/link`, { method: 'POST' });
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  const shown = companies.filter((c) =>
    (c.name ?? c.companyId).toLowerCase().includes(filter.toLowerCase()),
  );

  const redCount = companies.filter((c) => c.status === 'red').length;
  const amberCount = companies.filter((c) => c.status === 'amber').length;
  const greenCount = companies.filter((c) => c.status === 'green').length;

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, padding: '40px 24px', fontFamily: T.fontSans }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        {/* Header */}
        <header style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 700,
                fontFamily: T.fontDisplay,
                letterSpacing: '-0.02em',
              }}
            >
              Churn Simulator
            </h1>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                fontFamily: T.fontMono,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                color: T.textTert,
                padding: '3px 8px',
                border: `1px solid ${T.border}`,
                borderRadius: 999,
              }}
            >
              Operator
            </span>
            <a
              href="/dashboard"
              style={{ marginLeft: 'auto', color: T.accent, fontSize: 13, textDecoration: 'none' }}
            >
              ← Back to dashboard
            </a>
          </div>
          <p style={{ margin: 0, color: T.textTert, fontSize: 13 }}>
            Drive the signal pipeline by hand — trigger Stripe cancellations, support tickets, and usage drops to see the churn engine react in real time.
          </p>
        </header>

        {/* Summary stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Red', count: redCount, ...RAG.red },
            { label: 'Amber', count: amberCount, ...RAG.amber },
            { label: 'Green', count: greenCount, ...RAG.green },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                background: T.surface1,
                border: `1px solid ${s.border}`,
                borderRadius: T.radius,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.dot, boxShadow: `0 0 12px ${s.dot}80` }} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: T.fontDisplay, color: s.text }}>
                  {s.count}
                </div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: T.textTert }}>
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Escalations */}
        {escalations.length > 0 && (
          <section
            style={{
              background: T.surface1,
              border: `1px solid ${T.border}`,
              borderRadius: T.radius,
              padding: 20,
              marginBottom: 24,
              boxShadow: T.shadowMd,
            }}
          >
            <h2
              style={{
                margin: '0 0 12px',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: T.fontDisplay,
                color: T.text,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.red, boxShadow: `0 0 10px ${T.red}80` }} />
              Escalations · Red · Unclaimed
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {escalations.map((e) => {
                const name = companies.find((c) => c.companyId === e.companyId)?.name ?? e.companyId.slice(0, 8);
                return (
                  <div
                    key={e.id}
                    style={{
                      padding: '12px 14px',
                      background: T.surface2,
                      border: `1px solid ${T.border}`,
                      borderRadius: T.radiusSm,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
                        {name}
                        <span style={{ color: T.textTert, marginLeft: 8, fontSize: 12 }}>
                          {e.reason} · score {Math.round(e.score)}
                        </span>
                      </span>
                      <button style={btn()} onClick={() => void ack(e.id)}>
                        Ack
                      </button>
                    </div>
                    {e.briefStatus === 'ready' && e.briefSummary && (
                      <div
                        style={{
                          marginTop: 10,
                          padding: '12px 14px',
                          background: T.redSoft,
                          borderLeft: `3px solid ${T.red}`,
                          borderRadius: T.radiusSm,
                          fontSize: 13,
                          lineHeight: 1.5,
                        }}
                      >
                        <div style={{ marginBottom: 4 }}>
                          <span style={{ color: T.accent, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Head of Data
                          </span>
                        </div>
                        <div style={{ color: T.text }}>{e.briefSummary}</div>
                        {e.briefRecommendedPlay && (
                          <div style={{ marginTop: 6, color: T.textSec, fontSize: 12 }}>
                            <strong style={{ color: T.textTert }}>Play:</strong> {e.briefRecommendedPlay}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Companies table */}
        <section
          style={{
            background: T.surface1,
            border: `1px solid ${T.border}`,
            borderRadius: T.radius,
            padding: 20,
            boxShadow: T.shadowMd,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: T.fontDisplay,
              }}
            >
              Companies
            </h2>
            <span style={{ color: T.textTert, fontSize: 12, fontFamily: T.fontMono }}>
              {shown.length} of {companies.length}
            </span>
            <input
              placeholder="Filter companies…"
              value={filter}
              onChange={(ev) => setFilter(ev.target.value)}
              style={{
                marginLeft: 'auto',
                padding: '8px 12px',
                width: 260,
                background: T.inset,
                color: T.text,
                border: `1px solid ${T.border}`,
                borderRadius: T.radiusSm,
                fontSize: 13,
                fontFamily: T.fontSans,
                outline: 'none',
              }}
            />
          </div>

          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                {['Status', 'Company', 'Score', 'Signals'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '8px 12px',
                      fontWeight: 600,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      color: T.textTert,
                      borderBottom: `1px solid ${T.border}`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, 50).map((c) => (
                <Fragment key={c.companyId}>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: '10px 12px' }}>
                      <StatusBadge status={c.status} />
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>
                      {c.name ?? c.companyId.slice(0, 8)}
                      {c.reason && (
                        <div style={{ fontSize: 11, color: T.textTert, marginTop: 2 }}>{c.reason}</div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <ScorePill score={c.score} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                        {stripe[c.companyId]?.stripeSubscriptionId ? (
                          <>
                            <button
                              style={btn(true)}
                              disabled={busy === c.companyId || c.status === 'red'}
                              onClick={() => void openCustomerPortal(c.companyId)}
                            >
                              {c.status === 'red' ? '✓ Cancelled' : 'Cancel plan'}
                            </button>
                            <a
                              href={stripeSubUrl(stripe[c.companyId]!.stripeSubscriptionId!)}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                color: T.accent,
                                fontSize: 12,
                                textDecoration: 'none',
                                padding: '6px 8px',
              borderRadius: T.radiusSm,
                                border: `1px solid ${T.border}`,
                              }}
                            >
                              Stripe ↗
                            </a>
                          </>
                        ) : (
                          <button
                            style={btn()}
                            disabled={busy === c.companyId}
                            onClick={() => void linkStripe(c.companyId)}
                          >
                            + Link Stripe
                          </button>
                        )}
                        <button
                          style={btn()}
                          disabled={busy === c.companyId}
                          onClick={() =>
                            void sendSignal(c.companyId, { source: 'usage', type: 'usage_drop', value: 70 })
                          }
                        >
                          Usage drop 70%
                        </button>
                        <button
                          style={btn()}
                          disabled={busy === c.companyId}
                          onClick={() => void sendGenericTicket(c.companyId)}
                        >
                          Support ticket
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
                    <tr>
                      <td colSpan={4} style={{ padding: '14px 12px', background: T.surface2 }}>
                        <label
                          style={{
                            color: T.textTert,
                            fontSize: 11,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                            fontWeight: 600,
                          }}
                        >
                          Custom support ticket — the Head-of-Data agent reads this verbatim
                        </label>
                        <textarea
                          autoFocus
                          value={ticketText}
                          onChange={(ev) => setTicketText(ev.target.value)}
                          placeholder="e.g. Customer escalated: repeated API 500s for 3 days, threatening to cancel unless resolved this week."
                          rows={3}
                          style={{
                            width: '100%',
                            marginTop: 8,
                            padding: 12,
                            background: T.inset,
                            color: T.text,
                            border: `1px solid ${T.border}`,
                            borderRadius: T.radiusSm,
                            fontFamily: T.fontSans,
                            fontSize: 13,
                            lineHeight: 1.5,
                            resize: 'vertical',
                            outline: 'none',
                          }}
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button
                            style={btn(true)}
                            disabled={busy === c.companyId || ticketText.trim().length === 0}
                            onClick={() => void sendCustomTicket(c.companyId)}
                          >
                            Send ticket
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
            <p style={{ color: T.textTert, fontSize: 12, marginTop: 12, fontFamily: T.fontMono }}>
              Showing first 50 of {shown.length}.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
