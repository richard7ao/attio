import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getCompanyContext, getCompanyPrimaryContact } from '@attio/db';
import { attio } from '../attio/client.js';
import { attioPushEnabled } from '../attio/push.js';
import { buildRescueEvent } from './dispatch.js';
import { generateAccountBrief } from '../analysis/brief.js';
import { config } from '../../config.js';

const outcomeBody = z.object({
  companyId: z.string().min(1),
  disposition: z
    .enum(['completed', 'no_answer', 'voicemail', 'failed', 'scheduled_callback'])
    .default('completed'),
  summary: z.string().min(1),
  transcript: z.string().optional(),
});

/**
 * Rescue orchestration boundary. The n8n WF-4 workflow / voice service call back
 * here to (a) preview the event payload we would send, and (b) report the
 * outcome of an outreach attempt, which we record onto the Attio company.
 */
export async function rescueRoutes(app: FastifyInstance): Promise<void> {
  // Preview the churn.escalated event for a company (debugging / n8n wiring).
  app.get('/rescue/event/:companyId', async (request, reply) => {
    const { companyId } = request.params as { companyId: string };
    const brief = await generateAccountBrief(companyId);
    if (!brief) return reply.notFound('Unknown company');
    return await buildRescueEvent(companyId, brief);
  });

  // Record a voice/outreach outcome back onto the Attio company as a note.
  app.post('/rescue/outcome', async (request, reply) => {
    const parsed = outcomeBody.safeParse(request.body);
    if (!parsed.success) return reply.badRequest(parsed.error.message);
    const { companyId, disposition, summary, transcript } = parsed.data;

    if (!attioPushEnabled()) return reply.serviceUnavailable('ATTIO_API_KEY not configured');
    const note = await attio.createNote({
      parentRecordId: companyId,
      title: `Voice outreach — ${disposition} (${new Date().toISOString().slice(0, 10)})`,
      content: [`Disposition: ${disposition}`, ``, summary, transcript ? `\nTranscript:\n${transcript}` : '']
        .filter(Boolean)
        .join('\n'),
    });
    return { ok: true, companyId, noteId: note.id.note_id };
  });

  // "Place Call" in the dashboard. Two paths:
  //   1. If N8N_WEBHOOK_BASE_URL is set → trigger the WF-4 churn-rescue workflow.
  //   2. Otherwise, if VOICE_BASE_URL is set → dispatch directly to the voice
  //      service (SLNG), which is the common path without n8n.
  app.post('/rescue/call', async (request, reply) => {
    const parsed = z
      .object({ companyId: z.string().min(1).optional(), accountId: z.string().min(1).optional() })
      .safeParse(request.body);
    if (!parsed.success) return reply.badRequest(parsed.error.message);
    const accountId = parsed.data.accountId ?? parsed.data.companyId;
    if (!accountId) return reply.badRequest('companyId (account_id) is required');

    // Path 1: n8n WF-4 workflow.
    if (config.N8N_WEBHOOK_BASE_URL) {
      const res = await fetch(`${config.N8N_WEBHOOK_BASE_URL}/webhook/churn-rescue/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId }),
      });
      if (!res.ok) return reply.badGateway(`WF-4 trigger failed (${res.status})`);
      const result = (await res.json().catch(() => ({}))) as unknown;
      return { ok: true, triggered: 'WF-4', accountId, result };
    }

    // Path 2: direct dispatch to the voice service.
    if (!config.VOICE_BASE_URL) {
      return reply.serviceUnavailable('Neither N8N_WEBHOOK_BASE_URL nor VOICE_BASE_URL is configured');
    }

    const [ctx, contact] = await Promise.all([
      getCompanyContext(accountId),
      getCompanyPrimaryContact(accountId),
    ]);
    if (!ctx) return reply.notFound('Unknown company');
    const toNumber = contact?.phone ?? '';
    if (!toNumber) return reply.badRequest('No phone number on the primary contact');

    const res = await fetch(`${config.VOICE_BASE_URL}/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signal: {
          accountId,
          accountName: ctx.name ?? accountId,
          contactName: contact?.name ?? 'there',
          toNumber,
          goal: `Churn rescue for ${ctx.name ?? accountId} (${ctx.churnStatus}).`,
          notes: ctx.churnReason ?? undefined,
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return reply.badGateway(`Voice service error (${res.status}): ${body}`);
    }
    const result = (await res.json().catch(() => ({}))) as unknown;
    return { ok: true, triggered: 'voice', accountId, result };
  });
}
