import { listCompaniesWithChurn, listEscalations } from '@attio/db';
import type { FastifyInstance } from 'fastify';
import { listCustomerSuccess, listWonContracts } from '../attio/queries.js';

interface EscalationRow {
  id: string;
  companyId: string;
  acked: boolean;
  createdAt: string;
  briefStatus: string;
  briefSummary: string | null;
  briefChurnDrivers: string | null;
  briefRecommendedPlay: string | null;
  briefArrAtRisk: number | null;
}

interface CustomerSuccessRow {
  companyId: string | null;
  stage: string | null;
  health: string | null;
  arr: number | null;
}

interface WonContractRow {
  companyId: string | null;
  estimatedContractValue: number | null;
}

/** Keep the most recent escalation per company. */
function latestEscalationByCompany(rows: EscalationRow[]): Map<string, EscalationRow> {
  const map = new Map<string, EscalationRow>();
  for (const row of rows) {
    const prev = map.get(row.companyId);
    if (!prev || row.createdAt > prev.createdAt) map.set(row.companyId, row);
  }
  return map;
}

/**
 * Triage boards driven by account signals:
 *   - /triage/risk        -> churn-rescue ("bad") board: red/amber accounts
 *   - /triage/opportunity -> upsell/renewal ("good") board: healthy customers
 */
export async function triageRoutes(app: FastifyInstance): Promise<void> {
  // Churn-rescue board: at-risk companies with their churn state + latest brief.
  app.get('/triage/risk', async () => {
    const [companies, escalations] = await Promise.all([
      listCompaniesWithChurn(),
      listEscalations({}) as Promise<EscalationRow[]>,
    ]);
    const latest = latestEscalationByCompany(escalations);

    const data = companies
      .filter((c) => c.status === 'red' || c.status === 'amber')
      .map((c) => {
        const esc = latest.get(c.companyId);
        return {
          companyId: c.companyId,
          name: c.name,
          score: c.score,
          status: c.status,
          reason: c.reason,
          escalationId: esc?.id ?? null,
          acked: esc?.acked ?? null,
          briefStatus: esc?.briefStatus ?? null,
          briefSummary: esc?.briefSummary ?? null,
          briefChurnDrivers: esc?.briefChurnDrivers ?? null,
          briefRecommendedPlay: esc?.briefRecommendedPlay ?? null,
          briefArrAtRisk: esc?.briefArrAtRisk ?? null,
        };
      })
      .sort((a, b) => b.score - a.score);
    return { data };
  });

  // Upsell/renewal board: customers (CS or won contract) that are not at risk,
  // ranked by value at stake (ARR, else largest contract value).
  app.get('/triage/opportunity', async () => {
    const [companies, cs, contracts] = await Promise.all([
      listCompaniesWithChurn(),
      listCustomerSuccess() as Promise<CustomerSuccessRow[]>,
      listWonContracts() as Promise<WonContractRow[]>,
    ]);

    const companyById = new Map(companies.map((c) => [c.companyId, c]));
    const csByCompany = new Map<string, CustomerSuccessRow>();
    for (const r of cs) if (r.companyId) csByCompany.set(r.companyId, r);

    const maxContractByCompany = new Map<string, number>();
    for (const r of contracts) {
      if (!r.companyId || r.estimatedContractValue == null) continue;
      const prev = maxContractByCompany.get(r.companyId) ?? 0;
      if (r.estimatedContractValue > prev) maxContractByCompany.set(r.companyId, r.estimatedContractValue);
    }

    const candidateIds = new Set<string>([...csByCompany.keys(), ...maxContractByCompany.keys()]);
    const data = [...candidateIds]
      .map((companyId) => {
        const company = companyById.get(companyId);
        const csRow = csByCompany.get(companyId);
        const contractValue = maxContractByCompany.get(companyId) ?? null;
        const value = csRow?.arr ?? contractValue;
        return {
          companyId,
          name: company?.name ?? null,
          status: company?.status ?? 'green',
          stage: csRow?.stage ?? null,
          health: csRow?.health ?? null,
          arr: csRow?.arr ?? null,
          contractValue,
          value,
        };
      })
      // Upsell/renewal targets are healthy accounts, not active churn risks.
      .filter((row) => row.status !== 'red')
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    return { data };
  });
}
