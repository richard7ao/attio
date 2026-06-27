import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import Fastify, { type FastifyInstance } from 'fastify';
import { config } from './config.js';
import { dbPlugin } from './plugins/db.js';
import { attioRoutes } from './modules/attio/index.js';
import { churnRoutes } from './modules/churn/index.js';
import { healthRoutes } from './modules/health/index.js';
import { outreachRoutes } from './modules/outreach/index.js';
import { triageRoutes } from './modules/triage/index.js';
import { voiceRoutes } from './modules/voice/index.js';
import { webhookRoutes } from './modules/webhooks/index.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  });

  await app.register(sensible);
  await app.register(cors, { origin: config.CORS_ORIGIN, credentials: true });
  await app.register(dbPlugin);

  // Health is unprefixed; everything else lives under /api.
  await app.register(healthRoutes);
  await app.register(
    async (api) => {
      await api.register(outreachRoutes);
      await api.register(triageRoutes);
      await api.register(attioRoutes);
      await api.register(churnRoutes);
      await api.register(voiceRoutes);
      await api.register(webhookRoutes);
    },
    { prefix: '/api' },
  );

  return app;
}
