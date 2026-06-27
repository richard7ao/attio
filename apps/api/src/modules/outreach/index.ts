import type { FastifyInstance } from 'fastify';

/**
 * *PLACEHOLDER* — Outreach: all transactions & messaging scoped to a user.
 * Mounted under /api/users/:userId/outreach.
 */
export async function outreachRoutes(app: FastifyInstance): Promise<void> {
  // *PLACEHOLDER* list a user's outreach
  app.get('/users/:userId/outreach', async (_request, reply) => {
    // *PLACEHOLDER* query app.db for outreach where user_id = :userId
    return reply.notImplemented();
  });
}
