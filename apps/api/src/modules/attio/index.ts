import type { FastifyInstance } from 'fastify';
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
}
