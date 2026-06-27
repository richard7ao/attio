import { createDb, type Db } from '@attio/db';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
  }
}

/** Decorates the Fastify instance with a ready-to-use Drizzle client. */
export const dbPlugin = fp(async (app: FastifyInstance) => {
  const db = await createDb();
  app.decorate<Db>('db', db);
});
