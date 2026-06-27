import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

// Single source of truth is the repo-root .env; allow an app-local override.
loadEnv({ path: ['../../.env', '.env'] });

// Treat empty .env values ("FOO=") as unset for optional fields.
const optionalSecret = z.preprocess(
  (v) => (v === '' ? undefined : v),
  z.string().min(1).optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Database (see packages/db)
  DATABASE_DRIVER: z.enum(['sqlite', 'postgres']).default('sqlite'),
  DATABASE_URL: optionalSecret,
  SQLITE_PATH: z.string().default('./data/attio.local.db'),

  // Attio CRM
  ATTIO_API_KEY: optionalSecret,
  ATTIO_API_BASE_URL: z.string().url().default('https://api.attio.com/v2'),
  // Where churn write-back lands in Attio.
  ATTIO_CHURN_LIST: z.string().default('attio_churn'),
  // Workspace member to assign call tasks to; if unset, the first member is used.
  ATTIO_TASK_ASSIGNEE_ID: optionalSecret,
  // Signing secret for inbound Attio webhooks (the connector); verified if set.
  ATTIO_WEBHOOK_SECRET: optionalSecret,
  // Voice service base URL — the connector forwards "place a call" here.
  VOICE_BASE_URL: optionalSecret,
  // Demo override: when set, syncAttio forces every contact's email/phone to
  // these so all outreach (calls/email) routes to one inbox/number for the demo.
  DEMO_CONTACT_EMAIL: optionalSecret,
  DEMO_CONTACT_PHONE: optionalSecret,

  // Stripe
  STRIPE_API_KEY: optionalSecret,
  STRIPE_WEBHOOK_SECRET: optionalSecret,
  // Where the customer lands after exiting the Stripe Billing Portal.
  STRIPE_PORTAL_RETURN_URL: optionalSecret,
  // Recurring price used when linking Attio companies to Stripe (test mode).
  // If unset, the link service creates a product + price on first use.
  STRIPE_PRICE_ID: optionalSecret,

  // Analysis layer: Superlink (LLM provider) + Mubit (agent memory)
  SUPERLINK_API_KEY: optionalSecret,
  // OpenAI-compatible chat base URL for the Superlinked SIE gateway (must end in /v1).
  SUPERLINK_BASE_URL: optionalSecret,
  // Default to a model that's reliably warm on the shared default pool. To use a
  // dedicated hot lane instead, set SUPERLINK_GPU (e.g. rtx6000-qwen27 for the 27B).
  SUPERLINK_MODEL: z.string().default('Qwen/Qwen3-4B-Instruct-2507'),
  // Optional GPU machine profile (hot lane), or "pool/profile" for a dedicated pool.
  // When set, sent as X-SIE-MACHINE-PROFILE (+ X-SIE-Pool). Empty = default routing.
  SUPERLINK_GPU: z.string().default(''),
  // Admin token for SIE pool management / model pinning (POST /v1/pools). NOT used
  // on the request path — only by admin tooling (see scripts/superlink-pool.ts).
  SUPERLINK_ADMIN_KEY: optionalSecret,
  MUBIT_API_KEY: optionalSecret,
  MUBIT_BASE_URL: z.string().default('https://api.mubit.ai'),
  MUBIT_AGENT: z.string().default('head-of-data'),

  // Churn-rescue orchestration: when set, escalations POST a churn.escalated
  // event (with the brief) to the n8n WF-4 webhook -> voice/email/queue routing.
  N8N_WEBHOOK_BASE_URL: optionalSecret,
});

/** Parsed, validated environment. Fails fast on misconfiguration. */
export const config = (() => {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
})();

export type AppConfig = typeof config;
