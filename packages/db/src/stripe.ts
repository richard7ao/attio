import { desc, eq, isNotNull, isNull } from 'drizzle-orm';
import { createDb, type PostgresDb, type SqliteDb } from './client.js';
import { getDatabaseDriver } from './env.js';
import * as pg from './schema/pg.js';
import * as sqlite from './schema/sqlite.js';

export interface StripeLink {
  companyId: string;
  name: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

/** Companies not yet linked to Stripe, worst-churn first, capped at `limit`. */
export async function listCompaniesNeedingStripeLink(limit: number): Promise<StripeLink[]> {
  const db = await createDb();
  if (getDatabaseDriver() === 'postgres') {
    const t = pg.attioCompanies;
    return (db as PostgresDb)
      .select({
        companyId: t.id,
        name: t.name,
        stripeCustomerId: t.stripeCustomerId,
        stripeSubscriptionId: t.stripeSubscriptionId,
      })
      .from(t)
      .where(isNull(t.stripeSubscriptionId))
      .limit(limit);
  }
  const t = sqlite.attioCompanies;
  return (db as SqliteDb)
    .select({
      companyId: t.id,
      name: t.name,
      stripeCustomerId: t.stripeCustomerId,
      stripeSubscriptionId: t.stripeSubscriptionId,
    })
    .from(t)
    .where(isNull(t.stripeSubscriptionId))
    .limit(limit)
    .all();
}

/** All companies already linked to a Stripe subscription, newest first. */
export async function listLinkedStripeCompanies(): Promise<StripeLink[]> {
  const db = await createDb();
  if (getDatabaseDriver() === 'postgres') {
    const t = pg.attioCompanies;
    return (db as PostgresDb)
      .select({
        companyId: t.id,
        name: t.name,
        stripeCustomerId: t.stripeCustomerId,
        stripeSubscriptionId: t.stripeSubscriptionId,
      })
      .from(t)
      .where(isNotNull(t.stripeSubscriptionId))
      .orderBy(desc(t.syncedAt));
  }
  const t = sqlite.attioCompanies;
  return (db as SqliteDb)
    .select({
      companyId: t.id,
      name: t.name,
      stripeCustomerId: t.stripeCustomerId,
      stripeSubscriptionId: t.stripeSubscriptionId,
    })
    .from(t)
    .where(isNotNull(t.stripeSubscriptionId))
    .orderBy(desc(t.syncedAt))
    .all();
}

/** Persist the Stripe customer + subscription ids on a company. */
export async function setCompanyStripeIds(
  companyId: string,
  customerId: string,
  subscriptionId: string,
): Promise<void> {
  const db = await createDb();
  const set = { stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId };
  if (getDatabaseDriver() === 'postgres') {
    await (db as PostgresDb)
      .update(pg.attioCompanies)
      .set(set)
      .where(eq(pg.attioCompanies.id, companyId));
    return;
  }
  (db as SqliteDb)
    .update(sqlite.attioCompanies)
    .set(set)
    .where(eq(sqlite.attioCompanies.id, companyId))
    .run();
}

/** Look up a company's Stripe ids (for cancel / unlink). */
export async function getCompanyStripeIds(companyId: string): Promise<StripeLink | null> {
  const db = await createDb();
  if (getDatabaseDriver() === 'postgres') {
    const t = pg.attioCompanies;
    const rows = await (db as PostgresDb)
      .select({
        companyId: t.id,
        name: t.name,
        stripeCustomerId: t.stripeCustomerId,
        stripeSubscriptionId: t.stripeSubscriptionId,
      })
      .from(t)
      .where(eq(t.id, companyId))
      .limit(1);
    return rows[0] ?? null;
  }
  const t = sqlite.attioCompanies;
  const rows = (db as SqliteDb)
    .select({
      companyId: t.id,
      name: t.name,
      stripeCustomerId: t.stripeCustomerId,
      stripeSubscriptionId: t.stripeSubscriptionId,
    })
    .from(t)
    .where(eq(t.id, companyId))
    .limit(1)
    .all();
  return rows[0] ?? null;
}

/**
 * Resolve an Attio company id from a Stripe customer id. Used by the webhook
 * as a fallback when the Stripe event has no metadata.attio_company_id.
 */
export async function companyIdByStripeCustomer(customerId: string): Promise<string | null> {
  const db = await createDb();
  if (getDatabaseDriver() === 'postgres') {
    const t = pg.attioCompanies;
    const rows = await (db as PostgresDb)
      .select({ companyId: t.id })
      .from(t)
      .where(eq(t.stripeCustomerId, customerId))
      .limit(1);
    return rows[0]?.companyId ?? null;
  }
  const t = sqlite.attioCompanies;
  const rows = (db as SqliteDb)
    .select({ companyId: t.id })
    .from(t)
    .where(eq(t.stripeCustomerId, customerId))
    .limit(1)
    .all();
  return rows[0]?.companyId ?? null;
}
