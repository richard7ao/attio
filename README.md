# Attio

Monorepo for the Attio outreach platform — frontend apps, backend services, and a
Supabase-backed database with Auth.

## Structure

```
apps/
  frontend/
    landing/                 # marketing site, navigates to demo
    dashboard/
    auditing/
    triage-good/
    triage-bad/
    [user-id]/
      all-reach-outs/        # dynamic per-user route: all transactions & messaging
  backend/
    api/                     # core REST/edge API
    n8n/                     # n8n workflow definitions & webhooks
    attio/                   # Attio CRM integration service
    voice/                   # voice outreach service
packages/
  db/
    supabase/                # SQL schema & migrations
docs/
```

## Database

Supabase provides Auth and Postgres. Apply the schema with:

```bash
supabase db push
# or paste packages/db/supabase/schema.sql into the Supabase SQL editor
```

### Tables

- **`profiles`** — 1:1 with `auth.users`. Created automatically on signup via a
  trigger. Holds display name, avatar, and role.
- **`outreach`** — all transactions and messaging, scoped to a user via
  `user_id` FK → `profiles(id)`. Channels: `email`, `voice`, `sms`, `n8n`,
  `attio`. Row Level Security restricts every row to its owning user.

## Auth

Supabase Auth is the single source of truth. The `auth.users` table is managed
by Supabase; `profiles` mirrors it for app-level fields.
