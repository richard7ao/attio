# Consolidation & Integration Plan

How the pieces the team built fit together, the conflicts to resolve, and a phased
plan to wire it all into one system. Written after reviewing every branch/commit.

## 1. What exists today (inventory)

| Component | Where | Owner | Status |
| --- | --- | --- | --- |
| **Core API** | `apps/api` (Fastify) | (us) | Churn engine, Stripe link/webhook, brief **race (Superlink+Mubit)**, escalations, **Attio write-back** (fields/note/task/list) |
| **Web app** | `apps/web` | (us) | Dashboard, Churn/Upsell triage, standalone Simulator |
| **Rick Account Cockpit** | `apps/web/public/rick-account-cockpit.html` → React | teammate | HTML→React conversion in progress — *leave to them* |
| **WF-3 Dashboard API** | `infra/n8n/workflows/WF-3_*.json` | Ethan | n8n webhook `GET /dashboard/:resource` → **Postgres** queries. **Already uses our schema** (`company_churn`, `attio_companies`, `attio_customer_success`, `escalations`) ✓ |
| **WF-4 Churn Rescue** | `WF-4_ Churn Rescue Action.json` (repo root) | Martin | n8n webhook `POST /churn-rescue/run` → Supabase reads → **Gemini plan** → save → priority routing → **voice (WF-6) / email / queue** |
| **Voice service (WF-6)** | `apps/backend/voice` (branch `voice`) | teammate | Standalone Fastify svc (`:8787`), **SLNG** outbound AI caller, Supabase, pluggable brain (mubit/claude/openai/gemini), `packages/db/supabase/voice.sql` |

## 2. The core conflicts to resolve

1. **Two databases.** WF-3 uses n8n **Postgres** nodes; WF-4 + voice use **Supabase**.
   → Standardize on **one Supabase Postgres** as the single source of truth.
2. **Two schemas.** Our schema (`attio_companies`, `company_churn`, `company_signals`,
   `escalations`, `attio_customer_success`, …) vs WF-4's idealized tables
   (`accounts`, `account_health`, `usage_metrics`, `communications`,
   `support_tickets`, `account_plans`, `churn_rescue_queue`). WF-3 already speaks
   our schema; WF-4 does not.
3. **Duplicate plan/brief generation.** WF-4 calls **Gemini** to write the account
   plan; our API already produces the brief via the **Superlink/Mubit race** (warm
   GPU lanes + durable memory) and writes it to `escalations.brief_*` and into Attio.
   → **Our API is authoritative.** WF-4 should consume our brief, not regenerate it.
4. **Branch divergence.** `voice` branched from an old commit; its diff against
   `main` *removes* WF-3 and our recent `Dashboard.tsx` / `TriageBad.tsx` / guide
   edits. Merging as-is would clobber them. → **Rebase `voice` onto `main` first.**
5. **File hygiene.** `WF-4_ Churn Rescue Action.json` sits at the repo root; it
   belongs in `infra/n8n/workflows/`.

## 3. Target architecture (ownership boundaries)

```
 Stripe / usage / support
        │  (signals)
        ▼
 ┌──────────────────────────── apps/api (authoritative) ────────────────────────────┐
 │ churn engine → escalation → BRIEF (Superlink+Mubit race) → Attio write-back        │
 │                                   │                                                 │
 │                                   └─ emit "churn escalated" event ──────────┐       │
 └────────────────────────────────────────────────────────────────────────────┼──────┘
                                                                                ▼
                                                              n8n WF-4 (orchestration only)
                                                              route by priority:
                                                               • high → voice service POST /calls
                                                               • email account owner
                                                               • write churn_rescue_queue + log
                                                                                │
                                                                                ▼
                                                              apps/backend/voice (SLNG caller)
                                                              places AI call → posts outcome back
                                                              (→ Attio note + DB signal)

 Reads:  Supabase Postgres  ←  WF-3 dashboard API (optional) / our API / Rick Cockpit
```

**Principles**
- One DB: **Supabase Postgres** (`DATABASE_DRIVER=postgres`). Seed via the existing
  `packages/db/scripts/seed-supabase-from-sqlite.mjs`.
- One brain for the plan: **our API** (Superlink/Mubit). n8n = side-effects/orchestration.
- n8n and the voice service are **consumers**, triggered by our API; they don't
  re-derive churn or re-write the plan.

## 4. Integration steps

### Phase 0 — Hygiene (unblock merges)
- [ ] Rebase `voice` onto `main`; resolve so it does **not** delete WF-3 or our
      `Dashboard.tsx` / `TriageBad.tsx` / `superlink-mubit-agents.md` changes.
- [ ] `git mv "WF-4_ Churn Rescue Action.json" infra/n8n/workflows/WF-4_churn-rescue-action.json`.
- [ ] Add `apps/backend/voice` to the pnpm workspace + Turbo pipeline; align its
      tsconfig/eslint with `packages/config`.

### Phase 1 — One database
- [ ] Provision Supabase; set `DATABASE_URL` (api), `SUPABASE_URL` + service-role key
      (voice, n8n), `DATABASE_DRIVER=postgres`.
- [ ] Run `pnpm db:migrate` (postgres) + apply `packages/db/supabase/voice.sql`.
- [ ] Seed: `DATABASE_URL=… node packages/db/scripts/seed-supabase-from-sqlite.mjs`.
- [ ] Smoke-test WF-3 (`GET /dashboard/summary|accounts|account/:id`) — should work
      unchanged since it already targets our schema.

### Phase 2 — Emit churn events from our API
- [ ] Add `N8N_WEBHOOK_BASE_URL` to config/env.
- [ ] In `generateAndSaveBrief` (after the Attio push), best-effort `POST` to
      `${N8N_WEBHOOK_BASE_URL}/webhook/churn-rescue/run` with:
      `{ companyId, name, status, score, priority, brief, ownerEmail, phone }`.
      Derive `priority` from status + ARR (red+high-ARR = high). Reuse the
      Attio owner/`attio_people.phone` we already mirror.

### Phase 3 — Rework WF-4 into pure orchestration
- [ ] **Delete** the Gemini node + the 5 Supabase data-fetch nodes + Build Context.
      The brief now arrives in the webhook payload from Phase 2.
- [ ] Keep: **Route by Priority** → (high) trigger voice, (any) email owner, write
      `churn_rescue_queue`, log to WF-7.
- [ ] Reconcile the two tables WF-4 still needs:
      - `churn_rescue_queue`: either add this table, or repoint the node to our
        `escalations` (preferred — single queue).
      - owner email: from the trigger payload (Phase 2) instead of a Supabase read.
- [ ] (Optional, if you prefer keeping WF-4's reads) add Postgres **views**
      mapping our tables to `accounts` / `account_health` / `usage_metrics` /
      `support_tickets` so its nodes work without rewrites.

### Phase 4 — Voice
- [ ] WF-4 "Trigger WF-6 Voice Call" → `POST {VOICE_BASE_URL}/calls` with
      `{ companyId, name, phone, brief }`.
- [ ] Voice service places the SLNG call (set `SLNG_API_KEY`, `SLNG_AGENT_ID`,
      `SLNG_SIP_OUTBOUND_TRUNK_ID`); pick `AGENT_BRAIN` (mubit to reuse our memory).
- [ ] On call completion (voice webhook), post the outcome back: an Attio **note**
      on the company + a `company_signals` row, so it shows in our UI + Attio.

### Phase 5 — Dashboard & cockpit
- [ ] Decide: web reads our **API** (current) vs WF-3. Recommend keeping our API as
      the app's data source; expose WF-3 only if an external/n8n-hosted endpoint is
      needed. Avoid two divergent dashboard contracts.
- [ ] Point the Rick Account Cockpit (React) at our API endpoints
      (`/companies/churn`, `/triage/*`, `/analysis/*`).

### Phase 6 — End-to-end test
- [ ] Stripe cancel → webhook → escalation → brief → Attio (note/task/list) →
      n8n WF-4 → voice call placed → outcome logged back to Attio + DB.

## 5. Env / secrets to consolidate (single `.env`)
```
# routing
N8N_WEBHOOK_BASE_URL=          # our API -> WF-4
VOICE_BASE_URL=                # WF-4 -> voice service (:8787)
# data
DATABASE_DRIVER=postgres
DATABASE_URL=                  # Supabase pooled connection
SUPABASE_URL= / SUPABASE_SERVICE_ROLE_KEY=   # voice + n8n
# voice (SLNG) + agent brain
SLNG_API_KEY= / SLNG_AGENT_ID= / SLNG_SIP_OUTBOUND_TRUNK_ID= / SLNG_WEBHOOK_SECRET=
AGENT_BRAIN=mubit             # reuse our memory layer for the caller
# (Gemini key only if WF-4 keeps any LLM step — recommended: none)
```

## 6. Recommendation summary
- Make **our API authoritative** for churn + brief; n8n and voice are consumers.
- **Drop WF-4's Gemini/plan** generation; feed it our brief via a webhook event.
- **One Supabase Postgres**; WF-3 already fits it.
- **Rebase `voice`** before merge; move WF-4 into `infra/n8n/workflows/`.
- Single queue (`escalations`) and single owner of side-effects (n8n) to avoid drift.
