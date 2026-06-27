import { companyIdByStripeCustomer, ingestSignal } from '@attio/db';
import type { FastifyInstance } from 'fastify';
import { config } from '../../config.js';
import { generateAndSaveBrief } from '../analysis/brief.js';
import { handleAttioEvents, type AttioEvent } from '../attio/connector.js';
import { verifyStripeSignature } from '../stripe/client.js';

interface StripeEvent {
  type?: string;
  data?: { object?: { status?: string; metadata?: Record<string, string>; customer?: string } };
}

/**
 * Resolve the Attio company id for a Stripe event. Prefer the
 * `metadata.attio_company_id` we stamp on customers/subscriptions at link time;
 * fall back to looking up the company by its stored Stripe customer id.
 */
async function resolveCompanyId(event: StripeEvent): Promise<string | null> {
  const obj = event.data?.object;
  const fromMetadata = obj?.metadata?.attio_company_id;
  if (fromMetadata) return fromMetadata;
  if (obj?.customer) return companyIdByStripeCustomer(obj.customer);
  return null;
}

/**
 * Inbound webhooks that produce churn signals:
 *   - Stripe -> cancellation (instant red)
 *   - n8n    -> usage drop / support sentiment (later)
 *   - Twilio -> voice/SMS status (later)
 */
export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  // Stripe signature verification needs the exact raw bytes, so parse the body
  // as a Buffer. Encapsulated to this plugin so other /api routes keep JSON.
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) =>
    done(null, body),
  );

  app.post('/webhooks/stripe', async (request, reply) => {
    const raw = (request.body as Buffer | undefined)?.toString('utf8') ?? '';

    // Verify the Stripe-Signature header when a webhook secret is configured.
    // Without a secret (local dev before `stripe listen`) we log and proceed.
    if (config.STRIPE_WEBHOOK_SECRET) {
      const sig = request.headers['stripe-signature'] as string | undefined;
      if (!verifyStripeSignature(raw, sig, config.STRIPE_WEBHOOK_SECRET)) {
        return reply.unauthorized('Invalid Stripe signature');
      }
    } else {
      request.log.warn('STRIPE_WEBHOOK_SECRET not set — skipping signature verification');
    }

    let event: StripeEvent;
    try {
      event = JSON.parse(raw) as StripeEvent;
    } catch {
      return reply.badRequest('Invalid JSON body');
    }

    const cancelled =
      event.type === 'customer.subscription.deleted' ||
      (event.type === 'customer.subscription.updated' && event.data?.object?.status === 'canceled');
    if (!cancelled) return { ok: true, ignored: event.type ?? 'unknown' };

    const companyId = await resolveCompanyId(event);
    if (!companyId) return reply.badRequest('Could not resolve Attio company from Stripe event');

    const churn = await ingestSignal({
      companyId,
      source: 'stripe',
      type: 'stripe_cancellation',
      active: true,
      metadata: { stripeEventType: event.type },
    });
    if (churn.escalated) await generateAndSaveBrief(churn.companyId);
    return { ok: true, churn };
  });

  // Attio -> our API connector. Attio posts events (contract won, support-flow
  // entries, churn-list status changes); we route them (track account / place call).
  app.post('/webhooks/attio', async (request, reply) => {
    const raw = (request.body as Buffer | undefined)?.toString('utf8') ?? '';
    let payload: { events?: AttioEvent[] } & AttioEvent;
    try {
      payload = JSON.parse(raw);
    } catch {
      return reply.badRequest('Invalid JSON body');
    }
    // Attio may send {events:[...]}; tolerate a single-event body too.
    const events = payload.events ?? (payload.event_type ? [payload] : []);
    const result = await handleAttioEvents(events);
    return { ok: true, ...result };
  });

  // *PLACEHOLDER* n8n automations -> usage/sentiment signals
  app.post('/webhooks/n8n', async (_request, reply) => reply.notImplemented());
  // *PLACEHOLDER* Twilio voice/SMS status callbacks
  app.post('/webhooks/twilio', async (_request, reply) => reply.notImplemented());
}
