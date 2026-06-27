import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { stripeEnabled } from './client.js';
import { cancelCompanySubscription, linkCompanies, listLinked } from './link.js';

const linkBody = z.object({ limit: z.number().int().min(1).max(100).optional().default(10) });

/**
 * Stripe linkage + control (test mode). Links Attio companies to Stripe
 * customers/subscriptions so a real cancellation flows back through the webhook.
 */
export async function stripeRoutes(app: FastifyInstance): Promise<void> {
  // Create Stripe customers + subscriptions for not-yet-linked companies.
  app.post('/stripe/link', async (request, reply) => {
    if (!stripeEnabled()) return reply.serviceUnavailable('STRIPE_API_KEY not configured');
    const { limit } = linkBody.parse(request.body ?? {});
    const linked = await linkCompanies(limit);
    return { ok: true, linked };
  });

  // Companies currently linked to a Stripe subscription.
  app.get('/stripe/companies', async () => ({ data: await listLinked() }));

  // Cancel a company's Stripe subscription (real Stripe action -> webhook).
  app.post('/stripe/companies/:id/cancel', async (request, reply) => {
    if (!stripeEnabled()) return reply.serviceUnavailable('STRIPE_API_KEY not configured');
    const { id } = request.params as { id: string };
    try {
      const result = await cancelCompanySubscription(id);
      return { ok: true, companyId: id, subscription: result };
    } catch (err) {
      return reply.badRequest((err as Error).message);
    }
  });
}
