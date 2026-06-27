import { defineConfig } from 'drizzle-kit';

const driver = process.env.DATABASE_DRIVER ?? 'sqlite';

export default driver === 'postgres'
  ? defineConfig({
      dialect: 'postgresql',
      schema: './src/schema/pg.ts',
      out: './migrations/postgres',
      dbCredentials: { url: process.env.DATABASE_URL ?? '' },
    })
  : defineConfig({
      dialect: 'sqlite',
      schema: './src/schema/sqlite.ts',
      out: './migrations/sqlite',
      dbCredentials: { url: process.env.SQLITE_PATH ?? './data/attio.local.db' },
    });
