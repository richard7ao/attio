import type { FastifyInstance } from 'fastify';

/**
 * *PLACEHOLDER* — Triage boards driven by account signals:
 *   - direction=risk        -> churn-rescue ("bad") board
 *   - direction=opportunity -> upsell/renewal ("good") board
 */
export async function triageRoutes(app: FastifyInstance): Promise<void> {
  // *PLACEHOLDER* churn-rescue board (risk signals)
  app.get('/triage/risk', async (_request, reply) => reply.notImplemented());
  // *PLACEHOLDER* upsell/renewal board (opportunity signals)
  app.get('/triage/opportunity', async (_request, reply) => reply.notImplemented());
}
