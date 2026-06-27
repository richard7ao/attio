/**
 * Central env access. We deliberately DON'T hard-fail at boot on missing keys —
 * the server should still come up so `/health` and the demo page work during a
 * hackathon with partial config. Instead, each feature calls `requireEnv()` for the
 * keys it actually needs and fails loudly only then.
 */
import { log } from "./logger.js";

const env = process.env;

export const config = {
  port: Number(env.PORT ?? 8787),
  publicBaseUrl: (env.PUBLIC_BASE_URL ?? "").replace(/\/$/, ""),

  supabase: {
    url: env.SUPABASE_URL ?? "",
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  },

  slng: {
    apiBase: (env.SLNG_API_BASE ?? "https://api.agents.slng.ai").replace(/\/$/, ""),
    apiKey: env.SLNG_API_KEY ?? "",
    agentId: env.SLNG_AGENT_ID ?? "",
    sipOutboundTrunkId: env.SLNG_SIP_OUTBOUND_TRUNK_ID ?? "",
    webhookSecret: env.SLNG_WEBHOOK_SECRET ?? "",
    webhookSignatureHeader: (env.SLNG_WEBHOOK_SIGNATURE_HEADER ?? "x-slng-signature").toLowerCase(),
    toolWebhookSecret: env.TOOL_WEBHOOK_SECRET ?? "",
  },

  brain: {
    kind: (env.AGENT_BRAIN ?? "claude") as "superlink" | "mubit" | "claude" | "openai",
    // Superlink (the LLM) grounded by Mubit (durable memory) — the default brain.
    // See docs/guides/superlink-mubit-agents.md. BASE URL must end in /v1.
    superlink: {
      baseUrl: (env.SUPERLINK_BASE_URL ?? "").replace(/\/$/, ""),
      apiKey: env.SUPERLINK_API_KEY ?? "",
      model: env.SUPERLINK_MODEL ?? "Qwen/Qwen3-4B-Instruct-2507",
      // Warm GPU hot lane: a machine profile (`rtx6000-qwen27`) or `pool/profile`.
      gpu: env.SUPERLINK_GPU ?? "",
    },
    // Mubit memory layer: recall/remember for the Superlink brain (best-effort).
    mubit: {
      baseUrl: (env.MUBIT_BASE_URL ?? "https://api.mubit.ai").replace(/\/$/, ""),
      apiKey: env.MUBIT_API_KEY ?? "",
      agent: env.MUBIT_AGENT ?? "voice-account-manager",
    },
    claude: {
      apiKey: env.ANTHROPIC_API_KEY ?? "",
      model: env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    },
    // Generic OpenAI-compatible provider (OpenAI, Groq, OpenRouter, …).
    openai: {
      baseUrl: (env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, ""),
      apiKey: env.OPENAI_API_KEY ?? "",
      model: env.OPENAI_MODEL ?? "gpt-4o-mini",
    },
  },
} as const;

/** Throw a clear error if a required value is empty. Use at feature entry points. */
export function requireEnv(value: string, name: string): string {
  if (!value) {
    const msg = `Missing required config: ${name}. Set it in apps/backend/voice/.env`;
    log.error(msg);
    throw new Error(msg);
  }
  return value;
}

/** Build a public URL for a webhook path. Requires PUBLIC_BASE_URL. */
export function webhookUrl(path: string): string {
  const base = requireEnv(config.publicBaseUrl, "PUBLIC_BASE_URL");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
