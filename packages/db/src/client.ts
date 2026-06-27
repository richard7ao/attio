import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { getDatabaseDriver, getDatabaseUrl, getSqlitePath } from './env.js';
import * as pgSchema from './schema/pg.js';
import * as sqliteSchema from './schema/sqlite.js';

export type SqliteDb = ReturnType<typeof drizzleSqlite<typeof sqliteSchema>>;
export type PostgresDb = ReturnType<typeof drizzlePg<typeof pgSchema>>;
export type Db = SqliteDb | PostgresDb;

/**
 * Build a Drizzle client for the active driver. Driver libraries are loaded
 * lazily so dev installs never pay for the postgres driver (and vice versa).
 */
async function buildDb(): Promise<Db> {
  if (getDatabaseDriver() === 'postgres') {
    const { default: postgres } = await import('postgres');
    // Bounded pool: Supabase poolers cap client connections, so keep `max` low
    // and release idle/old connections. `prepare:false` is required by the pooler.
    const client = postgres(getDatabaseUrl(), {
      prepare: false,
      max: 5,
      idle_timeout: 20,
      max_lifetime: 60 * 30,
    });
    return drizzlePg(client, { schema: pgSchema });
  }

  const { default: Database } = await import('better-sqlite3');
  const { mkdirSync } = await import('node:fs');
  const { dirname } = await import('node:path');
  const sqlitePath = getSqlitePath();
  mkdirSync(dirname(sqlitePath), { recursive: true });
  const sqlite = new Database(sqlitePath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return drizzleSqlite(sqlite, { schema: sqliteSchema });
}

let dbPromise: Promise<Db> | undefined;

/**
 * Process-wide singleton Drizzle client (one connection pool), built lazily.
 *
 * Critical for Postgres: callers invoke this on every query, so creating a new
 * pool each time exhausts Supabase's pooler (EMAXCONNSESSION). Caching the
 * in-flight promise also makes concurrent first-callers share one pool.
 */
export function createDb(): Promise<Db> {
  dbPromise ??= buildDb();
  return dbPromise;
}
