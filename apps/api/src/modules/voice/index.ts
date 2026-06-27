import type { FastifyInstance } from 'fastify';

/** *PLACEHOLDER* — Voice outreach via Twilio (call placement, recordings, transcripts). */
export async function voiceRoutes(app: FastifyInstance): Promise<void> {
  // *PLACEHOLDER* place an outbound voice call
  app.post('/voice/call', async (_request, reply) => reply.notImplemented());
}
