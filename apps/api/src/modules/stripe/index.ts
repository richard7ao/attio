import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { stripeEnabled } from './client.js';
import {
  cancelCompanySubscription,
  createCustomerPortalSession,
  linkCompanies,
  linkCompanyById,
  listLinked,
} from './link.js';

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

  // Link one specific company to Stripe (create a real customer + subscription).
  app.post('/stripe/companies/:id/link', async (request, reply) => {
    if (!stripeEnabled()) return reply.serviceUnavailable('STRIPE_API_KEY not configured');
    const { id } = request.params as { id: string };
    const linked = await linkCompanyById(id);
    if (!linked) return reply.notFound('Unknown company');
    return { ok: true, linked };
  });

  // Customer-side self-serve cancellation: opens the Stripe Billing Portal where
  // the customer cancels their own plan. The resulting webhook flips churn to red.
  app.post('/stripe/companies/:id/portal', async (request, reply) => {
    if (!stripeEnabled()) return reply.serviceUnavailable('STRIPE_API_KEY not configured');
    const { id } = request.params as { id: string };
    try {
      const { url } = await createCustomerPortalSession(id);
      return { ok: true, url };
    } catch (err) {
      return reply.badRequest((err as Error).message);
    }
  });

  // Admin-side cancel (merchant cancels the subscription directly). Kept for
  // automation/testing — the simulator uses the customer portal flow instead.
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
