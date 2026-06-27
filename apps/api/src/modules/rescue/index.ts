import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
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

  // "Place Call" in the dashboard. Triggers the WF-4 churn-rescue workflow,
  // which builds the rescue plan and (on the high-priority path) dispatches
  // WF-6 -> the SLNG voice service to actually call the customer.
  app.post('/rescue/call', async (request, reply) => {
    const parsed = z
      .object({ companyId: z.string().min(1).optional(), accountId: z.string().min(1).optional() })
      .safeParse(request.body);
    if (!parsed.success) return reply.badRequest(parsed.error.message);
    const accountId = parsed.data.accountId ?? parsed.data.companyId;
    if (!accountId) return reply.badRequest('companyId (account_id) is required');
    if (!config.N8N_WEBHOOK_BASE_URL) {
      return reply.serviceUnavailable('N8N_WEBHOOK_BASE_URL not configured');
    }

    const res = await fetch(`${config.N8N_WEBHOOK_BASE_URL}/webhook/churn-rescue/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_id: accountId }),
    });
    if (!res.ok) return reply.badGateway(`WF-4 trigger failed (${res.status})`);
    const result = (await res.json().catch(() => ({}))) as unknown;
    return { ok: true, triggered: 'WF-4', accountId, result };
  });
}
