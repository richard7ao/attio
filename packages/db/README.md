# @attio/db

Drizzle ORM data layer with a **dual-driver** setup:

| Env (`DATABASE_DRIVER`) | Driver           | Use case             |
| ----------------------- | ---------------- | -------------------- |
| `sqlite` (default)      | `better-sqlite3` | Local dev, CI, tests |
| `postgres`              | `postgres-js`    | Prod / Supabase      |

A fresh checkout runs on SQLite with **zero external services**.

## Why two schema files?

Drizzle column builders are dialect-bound (`sqliteTable` vs `pgTable`), so the
schema is defined twice: `src/schema/sqlite.ts` and `src/schema/pg.ts`. They must
be kept in sync — any column change to one must be mirrored in the other. The
domain shapes themselves live in `@attio/shared` (Zod) and are the source of truth.

## Commands

```bash
pnpm db:generate   # generate migrations for the active driver
pnpm db:migrate    # apply migrations
pnpm db:studio     # open Drizzle Studio
```

Switch driver per command, e.g.:

```bash
DATABASE_DRIVER=postgres DATABASE_URL=postgres://... pnpm db:migrate
```

## Supabase Auth (prod)

In prod, Supabase Auth owns `auth.users`. The `users` table here mirrors it for
app-level fields (role, display name). Wire a Supabase trigger to insert into
`users` on signup, or sync on first login from the API.
