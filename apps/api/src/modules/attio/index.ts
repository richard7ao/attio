import { listCompaniesWithChurn } from '@attio/db';
import type { FastifyInstance } from 'fastify';
import { generateAccountBrief } from '../analysis/brief.js';
import { attioPushEnabled, pushBriefToAttio } from './push.js';
import { listCustomerSuccess, listCustomerSupportUsers, listWonContracts } from './queries.js';
import { syncAttio } from './sync.js';

/** Attio CRM integration: import won contracts + customer-support accounts/users. */
export async function attioRoutes(app: FastifyInstance): Promise<void> {
  // Pull from Attio and upsert into the database (sqlite local / postgres prod).
  app.post('/attio/sync', async () => {
    const result = await syncAttio();
    return { ok: true, synced: result };
  });

  app.get('/attio/won-contracts', async () => ({ data: await listWonContracts() }));
  app.get('/attio/customer-success', async () => ({ data: await listCustomerSuccess() }));
  app.get('/attio/customer-success/users', async () => ({
    data: await listCustomerSupportUsers(),
  }));

  // Push one company's churn state + brief into Attio (fields + note + task + list).
  app.post('/attio/push/:companyId', async (request, reply) => {
    if (!attioPushEnabled()) return reply.serviceUnavailable('ATTIO_API_KEY not configured');
    const { companyId } = request.params as { companyId: string };
    const brief = await generateAccountBrief(companyId);
    if (!brief) return reply.notFound('Unknown company');
    const pushed = await pushBriefToAttio(companyId, brief);
    return { ok: true, pushed };
  });

  // Push every at-risk (red/amber) company into Attio.
  app.post('/attio/push-risk', async (request, reply) => {
    if (!attioPushEnabled()) return reply.serviceUnavailable('ATTIO_API_KEY not configured');
    const atRisk = (await listCompaniesWithChurn()).filter(
      (c) => c.status === 'red' || c.status === 'amber',
    );
    const pushed = [];
    for (const c of atRisk) {
      const brief = await generateAccountBrief(c.companyId);
      if (brief) pushed.push(await pushBriefToAttio(c.companyId, brief));
    }
    return { ok: true, count: pushed.length, pushed };
  });
}
