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

  // Stripe
  STRIPE_API_KEY: optionalSecret,
  STRIPE_WEBHOOK_SECRET: optionalSecret,
  // Recurring price used when linking Attio companies to Stripe (test mode).
  // If unset, the link service creates a product + price on first use.
  STRIPE_PRICE_ID: optionalSecret,

  // Analysis layer: Superlink (LLM provider) + Mubit (agent memory)
  SUPERLINK_API_KEY: optionalSecret,
  // OpenAI-compatible chat base URL for the Superlinked SIE gateway (must end in /v1).
  SUPERLINK_BASE_URL: optionalSecret,
  // Default to the warm "larger generation" hot lane (preloaded by the cluster).
  SUPERLINK_MODEL: z.string().default('Qwen/Qwen3.6-27B:rtx-pro-6000'),
  // GPU machine profile (hot lane), or "pool/profile" to target a dedicated pool.
  // Sent as the X-SIE-MACHINE-PROFILE (+ X-SIE-Pool) header so requests hit warm GPUs.
  SUPERLINK_GPU: z.string().default('rtx6000-qwen27'),
  MUBIT_API_KEY: optionalSecret,
  MUBIT_BASE_URL: z.string().default('https://api.mubit.ai'),
  MUBIT_AGENT: z.string().default('head-of-data'),
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
