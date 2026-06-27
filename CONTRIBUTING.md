# Contributing

Conventions so the whole team works consistently. Read this before your first PR.

## Prerequisites

- **Node 20** (`nvm use`)
- **pnpm 9** (`corepack enable`)
- Docker (only for running n8n locally)

## Project structure

- `apps/web` — Vite + React app. Pages live in `src/routes`, shared UI in `src/components`.
- `apps/api` — Fastify API. One folder per domain in `src/modules`; cross-cutting
  concerns (db, auth) are Fastify plugins in `src/plugins`.
- `packages/shared` — domain types + Zod schemas. **Source of truth** for shapes.
- `packages/db` — Drizzle schema + client. Keep `sqlite.ts` and `pg.ts` in sync.
- `packages/config` — shared ESLint / TS / Prettier presets. Don't fork configs per app.

## Daily workflow

```bash
pnpm install
pnpm dev          # web + api in watch mode
```

Before pushing:

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test
```

## Code standards

- **TypeScript strict.** No `any` without a comment explaining why.
- **Validation at boundaries.** Parse external input (HTTP bodies, webhooks) with
  the Zod schemas in `@attio/shared`. Never trust raw payloads.
- **Imports.** Use `import type` for type-only imports (enforced by ESLint).
- **Formatting** is Prettier; **do not** hand-format. CI checks `pnpm format:check`.
- **Env vars** go in `.env.example` (documented) and are read through a validated
  config (`apps/api/src/config.ts`). Never read `process.env` ad hoc in features.
- **Secrets** never get committed. `.env` is gitignored — keep it that way.

## Database changes

1. Edit **both** `packages/db/src/schema/sqlite.ts` and `.../pg.ts`.
2. Update the matching Zod schema in `packages/shared` if the shape changes.
3. `pnpm db:generate` then `pnpm db:migrate`.
4. Commit the generated migration files.

## Branches & commits

- Branch from `main`: `feat/<short-name>`, `fix/<short-name>`, `chore/<short-name>`.
- Commits: [Conventional Commits](https://www.conventionalcommits.org)
  (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- Keep PRs small and focused. Fill in the summary + test plan.

## Pull requests

A PR must pass `lint`, `typecheck`, `test`, and `format:check` (see CI) and have
at least one review before merge.
