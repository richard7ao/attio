# @attio/voice

Autonomous **voice outreach** for enterprise account management — renewals & upsells.
The backend evaluates an account's *need* (a **signal**), then has an AI agent **call the
customer over the phone**, hold an account-aware conversation, decide the next step,
and write the transcript + outcome back to the CRM — no human in the loop.

It orchestrates **SLNG** (managed voice-agent platform: telephony + STT + LLM + TTS) and
uses a pluggable **brain** (Gemini by default; Claude / OpenAI / Mubit) for the reasoning
*outside* the live call: pre-call planning, the mid-call lookup tool, and the post-call
summary/disposition.

## How a call gets made (the important part)

A call is driven by a **signal** — the "need" the backend evaluates. A signal describes
*who* to call, *why*, and *what to achieve*:

```ts
{
  accountName: "Northwind Logistics",
  contactName: "Priya",
  toNumber:    "+447442645845",        // E.164
  plan: "Growth (annual)", seats: 45, renewalDate: "2026-07-15",
  usageTrend: "up", healthScore: 82,
  goal: "Secure the annual renewal and pitch the Scale tier (SSO + analytics).",
  notes: "Seat usage up 30% this quarter; champion is the VP Ops."
}
```

That signal flows through the pipeline:

```
signal ─► POST /calls ─► brain.planCall (talking points + template args)
                       ─► SLNG dispatch ──► real phone call ◄──► customer
                                   │  (SLNG runs LLM · STT · TTS · turn-taking)
   mid-call:  SLNG ──► POST /tools/lookup_account ──► real account facts ──► agent speaks them
   on hangup: SLNG ──► POST /webhooks/slng/events (call_end + transcript)
                                   │  persist → brain.summarize → disposition + next action
   view:      GET /calls/:id/stream (SSE) ──► /demo/call.html?id=…
```

In production the signal is produced by an upstream evaluation (e.g. the churn /
renewal-risk flow emitting `churn.escalated`); for demos use a built-in mock or your own.

## Three ways to run a call

### 1. Real outbound phone call — the product path
The backend places an actual call to the customer's phone via SLNG. **No SIP trunk or
caller-ID config in the request** — SLNG owns the telephony (caller ID is the SLNG/Twilio
number configured on their side).

```bash
# uses the built-in "northwind" signal, dials the number you pass
pnpm dispatch-test -- northwind +447442645845
```
or hit the API directly with your own signal:
```bash
curl -sX POST localhost:8787/calls -H 'content-type: application/json' -d '{
  "signal": { "accountName":"Acme", "contactName":"Dan", "toNumber":"+447…",
              "goal":"Re-engage before renewal; offer a success review." }
}'
```
The phone rings, the agent runs the conversation account-aware (asking "what plan am I
on?" triggers `lookup_account`, which returns real facts), and on hangup the transcript +
Gemini summary + disposition + next action are saved. The response/script prints a
`…/demo/call.html?id=…` URL to watch it.

### 2. Browser web session — validate the agent without dialing
Open the agent in the **SLNG dashboard** and start a *web session* (mic ↔ speaker). The
same `call_start` / `first_user_message` / `call_end` webhooks fire, so the transcript +
summary still land on our page (the call is **auto-ingested** since it didn't start via
our API — requires `DEMO_USER_ID`). Best for iterating on the prompt/voice quickly.

### 3. Simulator — no SLNG, no telephony
Drives the exact same DB → SSE → page pipeline with a scripted conversation. Bulletproof
for demos on flaky wifi.
```bash
pnpm demo          # or: pnpm demo -- acme
```

## Setup

```bash
cp .env.example .env        # fill in Supabase + SLNG + GEMINI_API_KEY (see comments)
pnpm install                # from the repo root (pnpm workspace)
# apply DB once in Supabase: packages/db/supabase/schema.sql then voice.sql
pnpm dev                    # starts on :8787  (pnpm --filter @attio/voice dev from root)
```

For real calls / browser sessions, SLNG must reach our webhooks — expose the server and
register the agent:
```bash
cloudflared tunnel --url http://localhost:8787   # copy the https URL → PUBLIC_BASE_URL
pnpm upsert-agent                                 # create/point the SLNG agent at that URL
```
The quick-tunnel URL changes on every restart — when it does, update `PUBLIC_BASE_URL`
and re-run `pnpm upsert-agent`, or webhooks (transcript capture) silently break.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET  | `/health` | liveness + config sanity |
| POST | `/calls` | evaluate a signal → plan → dispatch (`{ signal \| mock, toNumber?, userId? }`) |
| GET  | `/calls` | recent calls |
| GET  | `/calls/:id` | call record + full transcript |
| GET  | `/calls/:id/stream` | **SSE** live transcript / status / tool / ended |
| POST | `/tools/:tool` | mid-call tool (SLNG → real account facts / brain) |
| POST | `/webhooks/slng/events` | SLNG lifecycle webhook (transcript at call_end) |
| GET  | `/demo/call.html?id=…` | live transcript view page |

## Agent brain

`AGENT_BRAIN` selects the reasoning model for planning / tools / summaries (not the live
voice — that's SLNG's own LLM): `gemini` (default) · `claude` · `openai` · `mubit`. An
unset/failed key falls back to Claude; if that's unset too, summaries are skipped and the
transcript still saves. See `.env.example` for keys.

## Notes from building this

- **No call recording** (SLNG compliance) — `recording_url` stays null.
- **Transcript is post-call** — SLNG delivers it at `call_end`; the page fills in then.
  (SLNG shows live captions only on its own dashboard.)
- **Model availability varies per SLNG account** — the conversation LLM is set on the
  agent; if it times out, `upsert-agent` reuses the agent's models and bumps the
  first-token timeout (override with `SLNG_LLM=…`).

## Integration TODO (handoff)

- Decide: keep standalone vs. fold logic into `apps/api/src/modules/voice` (Fastify).
- Convert `packages/db/supabase/voice.sql` into a Drizzle migration.
- Trigger calls from the churn/escalation flow (`churn.escalated` → a signal → `POST /calls`).
- Wire `SLNG_*` / `GEMINI_API_KEY` / `PUBLIC_BASE_URL` into the team's secrets + a stable
  webhook URL for deploy.
