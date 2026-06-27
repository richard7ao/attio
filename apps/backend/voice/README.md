# @attio/voice

Voice outreach service for enterprise account management — renewals & upsells.
Orchestrates **SLNG** voice-agent calls, uses an agent **brain** (Mubit, with a
Claude fallback) for pre-call planning / mid-call tools / post-call summaries, and
streams a **live transcript** to a demo page.

## Architecture (important)

SLNG is a **managed voice-agent platform**: it runs the conversation LLM + STT +
TTS itself. We do **not** bridge audio and there is **no per-turn webhook**. Our
job is the three points *outside* the audio loop:

```
POST /calls ─► plan (brain) ─► SLNG.dispatch(number, {{args}})
                                   │
              SLNG ◄──► SIP/phone (LLM · STT · TTS · turn-taking)
                                   │
   mid-call:  SLNG ──► POST /tools/lookup_account ──► brain.runTool ──► spoken answer
   events:    SLNG ──► POST /webhooks/slng/events (call_start | first_user_message | call_end)
                                   │  persist segments → SSE → demo page
                                   │  on call_end: brain.summarize → update CRM
   live UI:   GET /calls/:id/stream (SSE) ──► /demo/call.html?id=…
```

## Setup

```bash
cp .env.example .env        # fill in Supabase + SLNG (+ ANTHROPIC_API_KEY for fallback)
npm install                 # from repo root (workspaces) or here
# apply DB schema (once): run packages/db/supabase/schema.sql then voice.sql in Supabase
npm run dev                 # starts on :8787
```

Expose the server so SLNG can reach the webhooks, and set `PUBLIC_BASE_URL`:

```bash
ngrok http 8787             # put the https URL in PUBLIC_BASE_URL
npm run upsert-agent        # create the SLNG agent (prints SLNG_AGENT_ID)
```

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET  | `/health` | liveness + config sanity |
| POST | `/calls` | create + dispatch a call (`{ mock \| signal, toNumber?, userId? }`) |
| GET  | `/calls` | recent calls |
| GET  | `/calls/:id` | call record + full transcript |
| GET  | `/calls/:id/stream` | **SSE** live transcript / status / tool / ended |
| POST | `/tools/:tool` | mid-call tool webhook (SLNG → brain) |
| POST | `/webhooks/slng/events` | SLNG system webhook (HMAC-verified) |
| GET  | `/demo/call.html?id=…` | live transcript demo page |

## Try it without SLNG

The brain + DB work standalone. With `ANTHROPIC_API_KEY` set and the schema
applied:

```bash
DEMO_USER_ID=<a profiles.id> npm run dev
npm run dispatch-test -- northwind     # creates a call, returns the demo URL
```

Dispatch will report `warning: not dispatched` until SLNG creds are set — the
call row, planning, and demo page still work.

## Booth-confirmed decisions

1. **Recording — NOT available** (SLNG compliance). `recording_url` stays null;
   the demo page's audio player simply never renders. Playback feature dropped.
2. **Live transcript — post-call only.** SLNG shows live captions on its own
   dashboard; via API we receive the full transcript at `call_end`. Our page fills
   in then (word-by-word "live" effect remains available via the dev simulator).
   LiveKit observer path is not used.
3. **Dialing — Twilio SIP trunk.** Set `SLNG_SIP_OUTBOUND_TRUNK_ID`. Validate the
   agent on SLNG's **browser session interface first**, then wire telephony.
   Externally-started sessions are captured via webhook **auto-ingest** (needs
   `DEMO_USER_ID`).

## Still open

- **Mubit API** — exact endpoint/shape in `src/agent/mubit.ts` (`complete()`),
  currently an OpenAI-style placeholder; falls back to Claude until configured.
