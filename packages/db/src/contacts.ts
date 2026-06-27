import { and, eq, isNotNull } from 'drizzle-orm';
import { createDb, type PostgresDb, type SqliteDb } from './client.js';
import { getDatabaseDriver } from './env.js';
import * as pg from './schema/pg.js';
import * as sqlite from './schema/sqlite.js';

export interface PrimaryContact {
  name: string | null;
  email: string | null;
  phone: string | null;
}

/**
 * Best-effort primary contact for a company: prefer a person with a phone
 * number (for voice outreach), otherwise the first known person.
 */
export async function getCompanyPrimaryContact(companyId: string): Promise<PrimaryContact | null> {
  const db = await createDb();

  if (getDatabaseDriver() === 'postgres') {
    const t = pg.attioPeople;
    const cols = { name: t.name, email: t.email, phone: t.phone };
    const withPhone = await (db as PostgresDb)
      .select(cols)
      .from(t)
      .where(and(eq(t.companyId, companyId), isNotNull(t.phone)))
      .limit(1);
    if (withPhone[0]) return withPhone[0];
    const any = await (db as PostgresDb)
      .select(cols)
      .from(t)
      .where(eq(t.companyId, companyId))
      .limit(1);
    return any[0] ?? null;
  }

  const t = sqlite.attioPeople;
  const cols = { name: t.name, email: t.email, phone: t.phone };
  const withPhone = (db as SqliteDb)
    .select(cols)
    .from(t)
    .where(and(eq(t.companyId, companyId), isNotNull(t.phone)))
    .limit(1)
    .all();
  if (withPhone[0]) return withPhone[0];
  const any = (db as SqliteDb)
    .select(cols)
    .from(t)
    .where(eq(t.companyId, companyId))
    .limit(1)
    .all();
  return any[0] ?? null;
}
