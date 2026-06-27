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
    kind: (env.AGENT_BRAIN ?? "claude") as "mubit" | "claude" | "openai" | "gemini",
    mubit: {
      apiBase: (env.MUBIT_API_BASE ?? "").replace(/\/$/, ""),
      apiKey: env.MUBIT_API_KEY ?? "",
      model: env.MUBIT_MODEL ?? "",
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
    // Google Gemini via its OpenAI-compatible endpoint — only needs GEMINI_API_KEY.
    gemini: {
      baseUrl: (env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai").replace(/\/$/, ""),
      apiKey: env.GEMINI_API_KEY ?? "",
      model: env.GEMINI_MODEL ?? "gemini-2.5-flash",
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
