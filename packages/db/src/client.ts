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
export async function createDb(): Promise<Db> {
  if (getDatabaseDriver() === 'postgres') {
    const { default: postgres } = await import('postgres');
    const client = postgres(getDatabaseUrl(), { prepare: false });
    return drizzlePg(client, { schema: pgSchema });
  }

  const { default: Database } = await import('better-sqlite3');
  const sqlite = new Database(getSqlitePath());
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return drizzleSqlite(sqlite, { schema: sqliteSchema });
}
