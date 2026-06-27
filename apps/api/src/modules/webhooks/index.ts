import type { FastifyInstance } from 'fastify';

/**
 * *PLACEHOLDER* — Inbound webhooks that produce signals:
 *   - Stripe   -> cancellation (major risk)
 *   - n8n      -> usage drop / near-limit, support sentiment
 *   - Twilio   -> voice/SMS delivery + reply status
 */
export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  // *PLACEHOLDER* Stripe events -> risk signals
  app.post('/webhooks/stripe', async (_request, reply) => reply.notImplemented());
  // *PLACEHOLDER* n8n automations -> usage/sentiment signals
  app.post('/webhooks/n8n', async (_request, reply) => reply.notImplemented());
  // *PLACEHOLDER* Twilio voice/SMS status callbacks
  app.post('/webhooks/twilio', async (_request, reply) => reply.notImplemented());
}
