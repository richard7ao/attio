import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '../../config.js';

const STRIPE_API = 'https://api.stripe.com/v1';

/** Whether Stripe API calls are configured. */
export function stripeEnabled(): boolean {
  return Boolean(config.STRIPE_API_KEY);
}

type FormValue = string | number | boolean | null | undefined;
export type StripeParams = Record<string, FormValue | Record<string, FormValue>>;

/** Flatten a (one-level-nested) params object into Stripe's bracket form encoding. */
function encodeForm(params: StripeParams): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    if (typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) {
        if (v != null) sp.append(`${key}[${k}]`, String(v));
      }
    } else {
      sp.append(key, String(value));
    }
  }
  return sp.toString();
}

interface StripeError {
  error?: { message?: string; type?: string };
}

/** Call the Stripe REST API with the configured secret key. */
export async function stripeRequest<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  params?: StripeParams,
): Promise<T> {
  if (!config.STRIPE_API_KEY) throw new Error('STRIPE_API_KEY is not configured');

  const body = params && method !== 'GET' ? encodeForm(params) : undefined;
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.STRIPE_API_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const json = (await res.json()) as T & StripeError;
  if (!res.ok) {
    throw new Error(`Stripe ${res.status}: ${json.error?.message ?? 'unknown error'}`);
  }
  return json;
}

/**
 * Verify a Stripe webhook signature (`Stripe-Signature` header) against the raw
 * request body, mirroring Stripe's scheme: signedPayload = `${t}.${body}`,
 * HMAC-SHA256 with the endpoint secret, compared to the `v1` signature.
 * Returns true when valid and within the freshness tolerance.
 */
export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  secret: string,
  toleranceSeconds = 300,
): boolean {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((kv) => {
      const [k, v] = kv.split('=');
      return [k, v] as const;
    }),
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const age = Math.floor(Date.now() / 1000) - Number(timestamp);
  return Number.isFinite(age) && age <= toleranceSeconds;
}
