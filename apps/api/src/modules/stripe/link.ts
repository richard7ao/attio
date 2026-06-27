import {
  getCompanyStripeIds,
  listCompaniesNeedingStripeLink,
  listLinkedStripeCompanies,
  setCompanyStripeIds,
  type StripeLink,
} from '@attio/db';
import { config } from '../../config.js';
import { stripeRequest } from './client.js';

const PRICE_LOOKUP_KEY = 'attio_test_monthly';

let cachedPriceId: string | undefined = config.STRIPE_PRICE_ID;

interface StripeList<T> {
  data: T[];
}
interface StripePrice {
  id: string;
}
interface StripeCustomer {
  id: string;
}
interface StripeSubscription {
  id: string;
  status: string;
}

/**
 * Resolve the recurring price to subscribe linked companies to. Prefers
 * STRIPE_PRICE_ID, then an existing price with our lookup key, otherwise
 * creates a $50/mo test product + price. Cached for the process lifetime.
 */
async function ensurePriceId(): Promise<string> {
  if (cachedPriceId) return cachedPriceId;

  const existing = await stripeRequest<StripeList<StripePrice>>(
    'GET',
    `/prices?lookup_keys[]=${PRICE_LOOKUP_KEY}&limit=1`,
  );
  if (existing.data[0]) {
    cachedPriceId = existing.data[0].id;
    return cachedPriceId;
  }

  const product = await stripeRequest<{ id: string }>('POST', '/products', {
    name: 'Attio CRM (test plan)',
  });
  const price = await stripeRequest<StripePrice>('POST', '/prices', {
    product: product.id,
    unit_amount: 5000,
    currency: 'usd',
    'recurring[interval]': 'month',
    lookup_key: PRICE_LOOKUP_KEY,
  });
  cachedPriceId = price.id;
  return cachedPriceId;
}

export interface LinkedCompany {
  companyId: string;
  name: string | null;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
}

/**
 * Link one Attio company to Stripe: create a test customer + trialing
 * subscription, both stamped with metadata.attio_company_id, then persist the
 * ids back onto the company. Idempotent — returns the existing link if present.
 */
export async function linkCompanyToStripe(company: StripeLink): Promise<LinkedCompany> {
  if (company.stripeCustomerId && company.stripeSubscriptionId) {
    return {
      companyId: company.companyId,
      name: company.name,
      stripeCustomerId: company.stripeCustomerId,
      stripeSubscriptionId: company.stripeSubscriptionId,
    };
  }

  const priceId = await ensurePriceId();
  const customer = await stripeRequest<StripeCustomer>('POST', '/customers', {
    name: company.name ?? company.companyId,
    metadata: { attio_company_id: company.companyId },
  });
  const subscription = await stripeRequest<StripeSubscription>('POST', '/subscriptions', {
    customer: customer.id,
    'items[0][price]': priceId,
    trial_period_days: 30,
    metadata: { attio_company_id: company.companyId },
  });

  await setCompanyStripeIds(company.companyId, customer.id, subscription.id);
  return {
    companyId: company.companyId,
    name: company.name,
    stripeCustomerId: customer.id,
    stripeSubscriptionId: subscription.id,
  };
}

/** Link up to `limit` not-yet-linked companies to Stripe. */
export async function linkCompanies(limit: number): Promise<LinkedCompany[]> {
  const companies = await listCompaniesNeedingStripeLink(limit);
  const linked: LinkedCompany[] = [];
  for (const company of companies) {
    linked.push(await linkCompanyToStripe(company));
  }
  return linked;
}

/** Companies currently linked to a Stripe subscription. */
export function listLinked(): Promise<StripeLink[]> {
  return listLinkedStripeCompanies();
}

/**
 * Cancel a linked company's Stripe subscription (a real Stripe action). Stripe
 * then emits `customer.subscription.deleted`, which our webhook turns into a
 * churn signal. Returns the canceled subscription's status.
 */
export async function cancelCompanySubscription(companyId: string): Promise<{ status: string }> {
  const link = await getCompanyStripeIds(companyId);
  if (!link?.stripeSubscriptionId) {
    throw new Error(`Company ${companyId} is not linked to a Stripe subscription`);
  }
  const sub = await stripeRequest<StripeSubscription>(
    'DELETE',
    `/subscriptions/${link.stripeSubscriptionId}`,
  );
  return { status: sub.status };
}
