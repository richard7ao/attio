import type { FastifyInstance } from 'fastify';

/** *PLACEHOLDER* — Attio CRM integration: import accounts/contacts, sync records. */
export async function attioRoutes(app: FastifyInstance): Promise<void> {
  // *PLACEHOLDER* import clients/accounts from Attio
  app.post('/attio/import', async (_request, reply) => reply.notImplemented());
}
