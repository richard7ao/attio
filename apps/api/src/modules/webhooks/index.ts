import { ingestSignal } from '@attio/db';
import type { FastifyInstance } from 'fastify';

interface StripeEvent {
  type?: string;
  data?: { object?: { status?: string; metadata?: Record<string, string>; customer?: string } };
}

/**
 * Resolve the Attio company id for a Stripe event. We rely on the Stripe
 * object carrying `metadata.attio_company_id` (set when the subscription is
 * created). TODO: fall back to matching the Stripe customer email -> person ->
 * company once real Stripe data is connected.
 */
function companyIdFromStripe(event: StripeEvent): string | null {
  return event.data?.object?.metadata?.attio_company_id ?? null;
}

/**
 * Inbound webhooks that produce churn signals:
 *   - Stripe -> cancellation (instant red)
 *   - n8n    -> usage drop / support sentiment (later)
 *   - Twilio -> voice/SMS status (later)
 */
export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  app.post('/webhooks/stripe', async (request, reply) => {
    // TODO *CHECK THIS*: verify the Stripe-Signature header against
    // STRIPE_WEBHOOK_SECRET before trusting the payload in production.
    const event = request.body as StripeEvent;
    const cancelled =
      event.type === 'customer.subscription.deleted' ||
      (event.type === 'customer.subscription.updated' && event.data?.object?.status === 'canceled');

    if (!cancelled) return { ok: true, ignored: event.type ?? 'unknown' };

    const companyId = companyIdFromStripe(event);
    if (!companyId) return reply.badRequest('Missing metadata.attio_company_id on Stripe object');

    const churn = await ingestSignal({
      companyId,
      source: 'stripe',
      type: 'stripe_cancellation',
      active: true,
      metadata: { stripeEventType: event.type },
    });
    return { ok: true, churn };
  });

  // *PLACEHOLDER* n8n automations -> usage/sentiment signals
  app.post('/webhooks/n8n', async (_request, reply) => reply.notImplemented());
  // *PLACEHOLDER* Twilio voice/SMS status callbacks
  app.post('/webhooks/twilio', async (_request, reply) => reply.notImplemented());
}
