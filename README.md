# Attio

A **CRM extension** for enterprise account management, upselling and renewals.
Import clients from Attio, watch churn & expansion signals, let agents reach out
first, and escalate to a human CSM when it matters.

> SaaS Churn Rescue + Expansion: risk signals (Stripe cancel = major, usage drop =
> medium, negative ticket = minor) feed the churn board; the inverse signals feed
> the upsell/renewal board.

## Stack

| Layer      | Tech                                                   |
| ---------- | ------------------------------------------------------ |
| Frontend   | Vite + React + React Router (`apps/web`)               |
| API        | Fastify + TypeScript (`apps/api`)                      |
| Data       | Drizzle ORM — SQLite in dev, Postgres/Supabase in prod |
| Auth       | Supabase Auth (prod)                                   |
| Automation | n8n (`infra/n8n`)                                      |
| Monorepo   | pnpm workspaces + Turborepo                            |

## Layout

```
apps/
  web/                  # single Vite + React app (all routes)
    src/routes/         # landing, demo, dashboard, auditing, triage/*, users/:id/reach-outs
  api/                  # Fastify API
    src/modules/        # health, outreach, triage, attio, voice, webhooks
packages/
  shared/               # domain types + Zod schemas (source of truth)
  db/                   # Drizzle schema + client (sqlite/postgres)
  config/               # shared eslint / tsconfig / prettier presets
infra/
  n8n/                  # n8n docker-compose + workflow exports
```

> Note: the frontend areas (dashboard, auditing, triage-good/bad, per-user
> reach-outs) are **routes within one app**, not separate apps. The backend
> integrations (attio, voice, n8n) are **modules within the API**; n8n itself runs
> as an external service under `infra/`.

## Routes (web)

| Path                        | Page              |
| --------------------------- | ----------------- |
| `/`                         | Landing → demo    |
| `/demo`                     | Demo entry        |
| `/dashboard`                | Analytics         |
| `/auditing`                 | Agent audit trail |
| `/triage/bad`               | Churn triage      |
| `/triage/good`              | Upsell triage     |
| `/users/:userId/reach-outs` | All reach-outs    |

## Getting started

```bash
nvm use                 # Node 20
corepack enable         # provides pnpm
pnpm install
cp .env.example .env     # fill in keys

# create the local SQLite schema
pnpm db:generate && pnpm db:migrate

pnpm dev                # runs web (5173) + api (3001) via Turborepo
```

The web dev server proxies `/api/*` to the API, so no CORS setup is needed locally.

## Common commands

```bash
pnpm dev          # all apps in watch mode
pnpm build        # build everything
pnpm lint         # eslint across the workspace
pnpm typecheck    # tsc across the workspace
pnpm format       # prettier --write
pnpm db:studio    # Drizzle Studio
```

## Attio integration

Pulls **won contracts** (the `sales` list, stage = Won), **customer-support
accounts** (the `customer_success` list), and all **companies + people (users)**
they reference into mirror tables: `attio_companies`, `attio_people`,
`attio_won_contracts`, `attio_customer_success`.

Set `ATTIO_API_KEY` in `.env`, then:

### Local (SQLite)

```bash
pnpm db:migrate                      # DATABASE_DRIVER defaults to sqlite
pnpm --filter @attio/api sync:attio  # fetch + upsert into data/attio.local.db
```

### Prod (Postgres / Supabase)

```bash
export DATABASE_DRIVER=postgres
export DATABASE_URL=postgres://...   # Supabase connection string
pnpm db:migrate
pnpm --filter @attio/api sync:attio
```

Or hit the API: `POST /api/attio/sync`. Read endpoints:
`GET /api/attio/won-contracts`, `GET /api/attio/customer-success`,
`GET /api/attio/customer-success/users` (all users on customer-support accounts).

See [CONTRIBUTING.md](./CONTRIBUTING.md) for team conventions.
