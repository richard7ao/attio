import { existsSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';

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

/** Walk up from cwd to find the monorepo root (where pnpm-workspace.yaml lives). */
function findRepoRoot(start = process.cwd()): string {
  let dir = start;
  for (;;) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return start;
    dir = parent;
  }
}

/**
 * Resolves the SQLite file. Relative paths anchor to the repo root so the same
 * file is used no matter which package directory the command runs from.
 */
export function getSqlitePath(): string {
  const path = process.env.SQLITE_PATH ?? './data/attio.local.db';
  return isAbsolute(path) ? path : resolve(findRepoRoot(), path);
}

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required when DATABASE_DRIVER=postgres.');
  }
  return url;
}
