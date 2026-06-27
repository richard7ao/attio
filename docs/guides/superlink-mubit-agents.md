# Superlink + Mubit for Agentic Work

A practical guide to wiring **Superlink** (Superlinked SIE — the LLM) into **Mubit**
(durable agent memory), and running them as a **race** for low-latency, robust
agent calls. Everything here is verified against the live services and mirrors the
working implementation in `apps/api/src/modules/analysis/`.

- Reference implementation:
  - Superlink client: `apps/api/src/modules/analysis/superlink.ts`
  - Mubit client: `apps/api/src/modules/analysis/mubit.ts`
  - The race + memory loop: `apps/api/src/modules/analysis/brief.ts`

---

## 1. Mental model

| Service | Role | Endpoint shape |
| --- | --- | --- |
| **Superlink (SIE)** | The LLM. Generates text/JSON. | OpenAI-compatible `POST {BASE}/chat/completions` |
| **Mubit** | The memory. Recalls prior lessons; stores outcomes. | Control-plane `POST /v2/control/query` and `/v2/control/ingest` |

The agent loop ("routing Superlink into Mubit") is:

```
recall lessons (Mubit)  →  generate with those lessons (Superlink)  →  remember the outcome (Mubit)
```

Mubit gets smarter over time because every outcome you `ingest` becomes grounded
context for the next `query`.

---

## 2. Configuration

Set these in your env (never commit real keys — they live in `.env`, which is
git-ignored):

```bash
# Superlink (SIE) — the LLM
SUPERLINK_API_KEY=SL-...                      # provided key
SUPERLINK_BASE_URL=http://<sie-host>:8080/v1  # MUST end in /v1
# Warm "hot lane" — see §3. Larger model:
SUPERLINK_MODEL=Qwen/Qwen3.6-27B:rtx-pro-6000
SUPERLINK_GPU=rtx6000-qwen27
# Fast alternative: SUPERLINK_MODEL=Qwen/Qwen3.5-4B  SUPERLINK_GPU=rtx6000

# Mubit — the memory
MUBIT_API_KEY=mbt_<instance>_<keyid>_<secret>
MUBIT_BASE_URL=https://api.mubit.ai
MUBIT_AGENT=head-of-data
```

Both APIs authenticate with `Authorization: Bearer <key>`.

---

## 3. Superlink (the LLM): always hit a WARM GPU lane

SIE preloads some generation models on dedicated GPU "hot lanes". A cold model
returns `503 {"code":"MODEL_LOADING"}` and can take 60–90s to load. **Always pin
your request to a warm lane** or you'll eat cold starts.

The lane is selected with the **`X-SIE-MACHINE-PROFILE` header** (and `X-SIE-Pool`
for dedicated pools) — *not* a body field (`gpu` in the body is rejected with `400`).

Known warm hot lanes:

| Use case | `SUPERLINK_MODEL` | `X-SIE-MACHINE-PROFILE` |
| --- | --- | --- |
| Larger generation | `Qwen/Qwen3.6-27B:rtx-pro-6000` | `rtx6000-qwen27` |
| Fast generation | `Qwen/Qwen3.5-4B` | `rtx6000` |

Minimal client (mirrors `superlink.ts`):

```ts
function laneHeaders(gpu: string): Record<string, string> {
  // "profile" or "pool/profile"
  const parts = gpu.split('/');
  const pool = parts.length > 1 ? parts[0] : undefined;
  const profile = parts.length > 1 ? parts[1] : parts[0];
  const h: Record<string, string> = {};
  if (pool) h['X-SIE-Pool'] = pool;
  if (profile) h['X-SIE-MACHINE-PROFILE'] = profile;
  return h;
}

export async function superlinkGenerate(system: string, user: string): Promise<string> {
  const body = {
    model: process.env.SUPERLINK_MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format: { type: 'json_object' }, // ask for strict JSON
    max_tokens: 512, // cap output -> lower latency
  };

  // wait_for_capacity == client-side retry on cold lanes
  let res!: Response;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(`${process.env.SUPERLINK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SUPERLINK_API_KEY}`,
        'Content-Type': 'application/json',
        ...laneHeaders(process.env.SUPERLINK_GPU ?? 'rtx6000-qwen27'),
      },
      body: JSON.stringify(body),
    });
    if (res.status !== 503) break; // only a cold lane is worth retrying
    if (attempt < 2) await new Promise((r) => setTimeout(r, 2000));
  }
  if (!res.ok) throw new Error(`Superlink ${res.status}: ${await res.text()}`);

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('Superlink returned no content');
  return content;
}
```

On a warm lane this returns in ~2.5–4s. Tips:
- Use `response_format: { type: 'json_object' }` for structured output and `JSON.parse` the content.
- Set `max_tokens` — the 27B will otherwise generate more than you need.
- Discover models with `GET {BASE}/models`. Other models exist but may cold-load.

### Dedicated pools / model pinning (admin token)

To keep a specific model warm on your own worker, create a pool. **This needs an
admin token** (the restricted `SL-` key returns `403 Admin token required`):

```bash
# create + pin (admin token in Authorization)
curl -X POST "$SUPERLINK_BASE_URL/pools" \
  -H "Authorization: Bearer $SUPERLINK_ADMIN_KEY" -H "Content-Type: application/json" \
  -d '{"name":"my-pool","gpus":{"<profile>":1},"bundle":"sglang",
       "minimum_worker_count":1,"pinned_models":["<model>"]}'

# then route requests to it
#   header  X-SIE-Pool: my-pool   +   X-SIE-MACHINE-PROFILE: <profile>
#   i.e.    SUPERLINK_GPU=my-pool/<profile>

curl -X DELETE "$SUPERLINK_BASE_URL/pools/my-pool" \
  -H "Authorization: Bearer $SUPERLINK_ADMIN_KEY"   # clean up when done
```

In this repo: `pnpm --filter @attio/api superlink:pool create|delete|list`
(reads `SUPERLINK_ADMIN_KEY`).

> ### ⚠️ DANGER: pinning a shared hot lane breaks it for everyone
> A hot-lane profile like `rtx6000-qwen27` may have **exactly one** GPU. Creating a
> pinned pool on that profile **takes that worker over**, and the shared lane then
> returns `500 inference_error ("SGLang stream terminated")` for *all* teams until
> the pool is deleted **and** the worker recovers (which is not instant). We hit
> this live. Rules:
> - Don't pin on the single GPU of a shared hot lane unless you own the cluster.
> - Pin only on a **spare/dedicated** machine profile, or coordinate first.
> - For most work you don't need a pool at all — the documented hot lanes are
>   already cluster-warm. Just set `SUPERLINK_GPU` to the profile.

---

## 4. Mubit (the memory): recall + remember

Mubit is a **memory engine, not a JSON LLM**. `query` returns a natural-language
`final_answer` grounded in stored items (plus `confidence`, `routing_summary`,
`evidence`). It **abstains** ("I do not know", low `confidence`) when it has no
grounded memory yet — handle that explicitly.

Use one **stable `run_id` per logical thread** (per account, ticket, workflow…)
so memory accumulates in the right place.

### Recall — `POST /v2/control/query`

```ts
async function mubitRecall(runId: string, query: string): Promise<string | undefined> {
  const res = await fetch(`${process.env.MUBIT_BASE_URL}/v2/control/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.MUBIT_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ run_id: runId, query }),
  });
  if (!res.ok) return undefined; // memory is best-effort; never block the agent
  const out = (await res.json()) as { final_answer?: string; confidence?: number };
  // Treat low-confidence abstentions as "no prior lessons".
  if (!out.final_answer || (out.confidence ?? 0) < 0.2) return undefined;
  return out.final_answer;
}
```

### Remember — `POST /v2/control/ingest`

The item shape is strict: each item needs `item_id`, `content_type`, and `content`.

```ts
async function mubitRemember(runId: string, lesson: string): Promise<void> {
  try {
    await fetch(`${process.env.MUBIT_BASE_URL}/v2/control/ingest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MUBIT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        run_id: runId,
        agent_id: process.env.MUBIT_AGENT ?? 'agent',
        items: [
          {
            item_id: `lesson-${Date.now()}`, // unique per write
            content_type: 'text',
            intent: 'lesson', // fact | lesson | rule | trace | ...
            content: lesson,
          },
        ],
      }),
    });
  } catch {
    // best-effort: a memory write must never fail the agent
  }
}
```

`ingest` returns `{ accepted, job_id, status:"queued" }` — it's async, so a freshly
written lesson may take a moment to become recallable.

---

## 5. Routing Superlink INTO Mubit (the agent loop)

This is the core pattern: **recall → generate → remember**.

```ts
async function runAgentStep(runId: string, task: string): Promise<string> {
  // 1) RECALL prior lessons from Mubit
  const lessons = await mubitRecall(runId, `Relevant lessons for: ${task}`);

  // 2) GENERATE with Superlink, grounding the prompt on those lessons
  const system =
    'You are a CRM agent. Respond ONLY with JSON: {"answer": string, "action": string}.';
  const user = lessons
    ? `Prior lessons:\n${lessons}\n\nTask: ${task}`
    : `Task: ${task}`;
  const content = await superlinkGenerate(system, user);
  const result = JSON.parse(content) as { answer: string; action: string };

  // 3) REMEMBER the outcome so the next run is grounded
  await mubitRemember(runId, `Task: ${task} -> action: ${result.action} (${result.answer})`);

  return result.answer;
}
```

That's "routing Superlink into Mubit": Superlink does the reasoning, Mubit supplies
the memory before and captures the outcome after.

---

## 6. The race (use this!)

For latency and robustness, run **two duplicate providers concurrently and take
whichever returns a valid result first** (`Promise.any`), with a deterministic
fallback if both fail. In our app we race the Mubit-grounded answer against the
Superlink answer — see `brief.ts`.

### Generic, reusable race helper

```ts
/**
 * Race N async providers; resolve with the first that FULFILLS.
 * Falls back only if all reject. Never throws.
 */
export async function raceProviders<T>(
  providers: Array<() => Promise<T>>,
  fallback: () => T,
): Promise<T> {
  const racers = providers.map((p) => p()); // start them all at once
  if (racers.length === 0) return fallback();
  try {
    return await Promise.any(racers); // first to FULFILL wins; rejects are ignored
  } catch {
    return fallback(); // AggregateError => every provider rejected
  }
}
```

### Using it (mirrors `brief.ts`)

```ts
const result = await raceProviders<MyResult>(
  [
    () => superlinkProvider(ctx), // LLM path
    () => mubitProvider(ctx),     // memory-grounded path (rejects when it abstains)
  ],
  () => deterministicFallback(ctx), // always-available default
);

// Best-effort: record the winning result back into memory for next time.
await mubitRemember(runId, summarize(result));
```

### Why `Promise.any` (not `race`/`all`)

- `Promise.any` ignores rejections and resolves on the **first success** — so a
  provider that *correctly fails* (e.g. Mubit abstaining with no memory, or a cold
  Superlink lane) simply loses the race instead of breaking it.
- Make losing providers **reject** rather than return junk (e.g. Mubit throws when
  `confidence < 0.2`), so the race only ever yields a real answer.
- Keep a **deterministic fallback** so the system always produces *something*.

---

## 7. Gotchas (learned the hard way)

| Gotcha | Fix |
| --- | --- |
| Superlink `gpu` in the request body → `400 unsupported_field` | Pass the lane via the **`X-SIE-MACHINE-PROFILE` header**, not the body. |
| `503 MODEL_LOADING` on first call | You hit a cold lane. Use a warm hot-lane model+profile; retry on 503 (`wait_for_capacity`). |
| `SUPERLINK_BASE_URL` without `/v1` | The base URL **must end in `/v1`** (we call `${BASE}/chat/completions`). |
| Mubit `query` returns "I do not know." | Expected with no grounded memory — treat low `confidence`/abstain as "no lessons" and (in a race) **reject** so the other provider wins. |
| Mubit `ingest` → `422 missing field` | Each item needs `item_id`, `content_type:"text"`, and `content`. |
| Mubit `ingest` is async | A just-written lesson isn't instantly recallable (`status:"queued"`). |
| Creating a Superlink pool → `403 Admin token required` | The restricted `SL-` key can't create pools — use `SUPERLINK_ADMIN_KEY` (admin token). But **don't pin a shared hot lane** (see the DANGER box in §3): it 500s the lane for everyone. Prefer the cluster-warm hot lanes. |
| Treating memory as required | Recall/remember are **best-effort** — never let them block or fail the agent. |

---

## 8. Checklist for your agent

- [ ] `SUPERLINK_*` and `MUBIT_*` env set; base URL ends in `/v1`.
- [ ] Superlink calls send `X-SIE-MACHINE-PROFILE` (warm lane) + retry on 503.
- [ ] One stable `run_id` per logical thread.
- [ ] Loop is recall → generate → remember.
- [ ] Providers raced with `Promise.any` + deterministic fallback.
- [ ] Losing/empty providers reject (don't return junk).
- [ ] Memory writes are best-effort (wrapped in try/catch).
