import type { FastifyInstance } from 'fastify';
import { generateAccountBrief, generateAndSaveBrief } from './brief.js';

/** Head-of-Data analysis: generate account briefs (Mubit agent + Superlink LLM). */
export async function analysisRoutes(app: FastifyInstance): Promise<void> {
  // Generate a brief and attach it to the company's open escalation.
  app.post('/analysis/companies/:id/brief', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await generateAndSaveBrief(id);
    if (!result.brief) return reply.notFound('Unknown company');
    return result;
  });

  // Generate a brief without persisting (preview).
  app.get('/analysis/companies/:id/brief', async (request, reply) => {
    const { id } = request.params as { id: string };
    const brief = await generateAccountBrief(id);
    if (!brief) return reply.notFound('Unknown company');
    return { brief };
  });
}
