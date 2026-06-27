import { and, eq, isNotNull, sql } from 'drizzle-orm';
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

/**
 * Demo override: force EVERY contact's email/phone to the given values, and add a
 * "Base Contact" for any company that has no people — so all outreach routes to a
 * single inbox/number. Idempotent; called at the end of syncAttio so a re-sync
 * never reverts the demo contact details.
 */
export async function seedDemoContacts(
  email: string,
  phone: string,
): Promise<{ updated: number; inserted: number }> {
  const db = await createDb();
  const insertMissing = sql`
    insert into attio_people (id, name, email, phone, company_id)
    select 'seed-' || c.id, 'Base Contact', ${email}, ${phone}, c.id
    from attio_companies c
    where not exists (select 1 from attio_people p where p.company_id = c.id)
    on conflict (id) do nothing
  `;
  const updateAll = sql`update attio_people set email = ${email}, phone = ${phone}`;

  if (getDatabaseDriver() === 'postgres') {
    const pdb = db as PostgresDb;
    const upd = await pdb.execute(updateAll);
    const ins = await pdb.execute(insertMissing);
    return { updated: (upd as { count?: number }).count ?? 0, inserted: (ins as { count?: number }).count ?? 0 };
  }
  const sdb = db as SqliteDb;
  const upd = sdb.run(updateAll);
  const ins = sdb.run(insertMissing);
  return { updated: upd.changes, inserted: ins.changes };
}
