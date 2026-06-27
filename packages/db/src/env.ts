/**
 * Resolves which database driver to use.
 *   DATABASE_DRIVER=sqlite   -> local dev (better-sqlite3)
 *   DATABASE_DRIVER=postgres -> prod / Supabase (postgres-js)
 *
 * Defaults to sqlite so a fresh checkout runs with zero external services.
 */
export type DatabaseDriver = 'sqlite' | 'postgres';

export function getDatabaseDriver(): DatabaseDriver {
  const driver = process.env.DATABASE_DRIVER ?? 'sqlite';
  if (driver !== 'sqlite' && driver !== 'postgres') {
    throw new Error(`Invalid DATABASE_DRIVER "${driver}". Expected "sqlite" or "postgres".`);
  }
  return driver;
}

export function getSqlitePath(): string {
  return process.env.SQLITE_PATH ?? './data/attio.local.db';
}

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required when DATABASE_DRIVER=postgres.');
  }
  return url;
}
