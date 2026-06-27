import { ackEscalation, ingestSignal, listCompaniesWithChurn, listEscalations } from '@attio/db';
import { churnSignalTypeSchema, churnStatusSchema, signalSourceSchema } from '@attio/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const ingestBody = z.object({
  companyId: z.string().min(1),
  source: signalSourceSchema,
  type: churnSignalTypeSchema,
  active: z.boolean().optional(),
  value: z.number().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const escalationQuery = z.object({
  status: churnStatusSchema.optional().default('red'),
  unclaimed: z
    .enum(['true', 'false'])
    .optional()
    .default('true')
    .transform((v) => v === 'true'),
});

export async function churnRoutes(app: FastifyInstance): Promise<void> {
  // Generic signal ingest used by the simulator, usage mock and support tickets.
  app.post('/signals', async (request, reply) => {
    const parsed = ingestBody.safeParse(request.body);
    if (!parsed.success) return reply.badRequest(parsed.error.message);
    const outcome = await ingestSignal(parsed.data);
    return { ok: true, churn: outcome };
  });

  // Dashboard data: every company's churn colour, worst first.
  app.get('/companies/churn', async () => ({ data: await listCompaniesWithChurn() }));

  // ===========================================================================
  // *CHECK THIS* — VOICE TEAM INTEGRATION POINT
  // The status poller should poll this endpoint to find companies that just
  // turned red, then trigger a voice call for each, then POST the ack below.
  //   GET  /api/escalations?status=red&unclaimed=true   -> rows to action
  //   POST /api/escalations/:id/ack                     -> mark as handled
  // Each row: { id, companyId, status, score, reason, createdAt, acked }.
  // ===========================================================================
  app.get('/escalations', async (request) => {
    const q = escalationQuery.parse(request.query);
    return { data: await listEscalations({ status: q.status, unclaimedOnly: q.unclaimed }) };
  });

  app.post('/escalations/:id/ack', async (request) => {
    const { id } = request.params as { id: string };
    await ackEscalation(id);
    return { ok: true };
  });
}
