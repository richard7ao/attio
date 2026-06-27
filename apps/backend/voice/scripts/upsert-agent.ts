/**
 * Create or update the SLNG voice agent used for outreach calls.
 *
 *   npm run upsert-agent           # create a new agent (prints the id)
 *   SLNG_AGENT_ID=... npm run upsert-agent   # update that agent (partial PATCH)
 *
 * Wires up the system prompt, the mid-call `lookup_account` tool (-> our /tools
 * webhook), and the call lifecycle system webhook (-> our /events). On UPDATE we
 * deliberately omit `models` so the agent's dashboard-configured voice/STT/LLM is
 * preserved; on CREATE we set sensible defaults.
 *
 * Schema per https://docs.slng.ai/api-reference/agents/agents.oas.yaml — every
 * tool needs a UUID `id`; system webhooks live in `tools` with source:"system"
 * and need name/description/parameters; argument `type` is the data type and the
 * real binding is under `source.type`.
 */
import { randomUUID } from "node:crypto";
import { config, requireEnv, webhookUrl } from "../src/config.js";
import { AGENT_SYSTEM_PROMPT } from "../src/agent/prompts.js";

/** GET the current agent so we can reuse its (account-valid) models config. */
async function fetchAgent(agentId: string, apiKey: string): Promise<any | null> {
  try {
    const res = await fetch(`${config.slng.apiBase}/v1/agents/${agentId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      console.warn(`Could not fetch agent ${agentId} (${res.status}); skipping models merge.`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn("Could not fetch agent:", err);
    return null;
  }
}

async function main() {
  const apiKey = requireEnv(config.slng.apiKey, "SLNG_API_KEY");
  const agentId = config.slng.agentId; // empty => create

  const tools = [
    {
      type: "webhook",
      id: randomUUID(),
      name: "lookup_account",
      description:
        "Look up accurate, up-to-date account facts (plan, seats, pricing, renewal date, usage) before answering a customer question.",
      url: `${webhookUrl("/tools/lookup_account")}?call_id={{call_id}}`,
      parameters: {
        type: "object",
        properties: {
          question: { type: "string", description: "What the customer asked about" },
        },
        required: ["question"],
      },
      webhook_format: "raw", // deliver the params as a flat JSON body
      timeout_seconds: 10,
      // Auth only if a secret is set (our /tools route skips auth when unset).
      ...(config.slng.toolWebhookSecret
        ? { auth: { type: "bearer", token: config.slng.toolWebhookSecret } }
        : {}),
    },
    { type: "template", id: randomUUID(), template: "hangup" },
    {
      type: "webhook",
      id: randomUUID(),
      name: "post_call_event",
      description: "Posts call lifecycle events and the transcript to the Attio voice backend.",
      url: webhookUrl("/webhooks/slng/events"),
      // Must declare every system argument we send, or SLNG rejects them as
      // "unexpected argument(s)" and terminates the call.
      parameters: {
        type: "object",
        properties: {
          event: { type: "string" },
          call_id: { type: "string" },
          call_end_reason: { type: "string" },
          transcript: { type: "array", items: { type: "object" } },
        },
      },
      source: "system",
      webhook_format: "raw",
      wait_for_response: false,
      // Sign only if a secret is set (our event route skips verification when unset).
      ...(config.slng.webhookSecret
        ? { auth: { type: "hmac", secret: config.slng.webhookSecret } }
        : {}),
      system: {
        triggers: [{ event: "call_start" }, { event: "first_user_message" }, { event: "call_end" }],
        arguments: [
          { name: "event", type: "string", source: { type: "trigger_event" } },
          { name: "call_id", type: "string", required: true, source: { type: "call_id" } },
          { name: "call_end_reason", type: "string", source: { type: "call_end_reason" } },
          {
            name: "transcript",
            type: "transcript_messages",
            source: { type: "transcript_messages", max_messages: 200 },
          },
        ],
      },
    },
  ];

  const body: Record<string, unknown> = {
    system_prompt: AGENT_SYSTEM_PROMPT,
    template_defaults: {
      company_name: "Attio",
      account_name: "the account",
      contact_name: "there",
      call_goal: "check in about their renewal",
      account_context: "no additional context",
    },
    tools,
  };

  // Optional model override for experimenting — e.g. in .env:
  //   SLNG_LLM=bedrock-mantle/nvidia.nemotron-nano-3-30b:latest
  const llmOverride = process.env.SLNG_LLM?.trim();

  if (agentId) {
    // Read the agent's existing (valid) models, raise the first-token timeout, and
    // optionally swap the llm. Super is hard-failing (APITimeoutError) with no
    // fallback configured, so a working alternate model is the real fix.
    const current = await fetchAgent(agentId, apiKey);
    console.log("current models:", JSON.stringify(current?.models ?? null, null, 2));
    if (current?.models) {
      body.models = {
        ...current.models,
        llm_first_token_timeout_s: 30,
        ...(llmOverride ? { llm: llmOverride } : {}),
      };
    }
    console.log("→ writing models:", JSON.stringify(body.models ?? null, null, 2));
  } else {
    body.name = "Attio Outreach — Renewals & Upsell";
    // Best-effort defaults for a fresh agent (adjust to your provisioned models).
    body.models = {
      stt: "slng/deepgram/nova:3-en",
      llm: "bedrock-mantle/nvidia.nemotron-super-3-120b",
      llm_first_token_timeout_s: 20,
      tts: "slng/deepgram/aura:2-en",
      tts_voice: "aura-2-thalia-en",
    };
  }

  const url = agentId
    ? `${config.slng.apiBase}/v1/agents/${agentId}`
    : `${config.slng.apiBase}/v1/agents`;
  const method = agentId ? "PATCH" : "POST";

  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`upsert-agent failed (${res.status}):\n${text}`);
    process.exit(1);
  }
  const json = JSON.parse(text);
  const id = json.id ?? json.agent_id ?? agentId;
  console.log(`✓ agent ${agentId ? "updated" : "created"}: ${id}`);
  if (!agentId) console.log(`→ set SLNG_AGENT_ID=${id} in apps/backend/voice/.env`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
