/* eslint-disable no-console */
import { getDatabaseDriver, getDatabaseUrl, getSqlitePath } from './env.js';

/** Applies generated migrations for the active driver. */
async function main(): Promise<void> {
  const driver = getDatabaseDriver();

  if (driver === 'postgres') {
    const { default: postgres } = await import('postgres');
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const { migrate } = await import('drizzle-orm/postgres-js/migrator');
    const client = postgres(getDatabaseUrl(), { max: 1 });
    await migrate(drizzle(client), { migrationsFolder: './migrations/postgres' });
    await client.end();
  } else {
    const { default: Database } = await import('better-sqlite3');
    const { drizzle } = await import('drizzle-orm/better-sqlite3');
    const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');
    const sqlite = new Database(getSqlitePath());
    migrate(drizzle(sqlite), { migrationsFolder: './migrations/sqlite' });
    sqlite.close();
  }

  console.log(`Migrations applied (${driver}).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
