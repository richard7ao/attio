import { createDb, getDatabaseDriver, schema, type PostgresDb, type SqliteDb } from '@attio/db';
import { inArray } from 'drizzle-orm';

export async function listWonContracts(): Promise<unknown[]> {
  const db = await createDb();
  if (getDatabaseDriver() === 'postgres') {
    return (db as PostgresDb).select().from(schema.pgSchema.attioWonContracts);
  }
  return (db as SqliteDb).select().from(schema.sqliteSchema.attioWonContracts).all();
}

export async function listCustomerSuccess(): Promise<unknown[]> {
  const db = await createDb();
  if (getDatabaseDriver() === 'postgres') {
    return (db as PostgresDb).select().from(schema.pgSchema.attioCustomerSuccess);
  }
  return (db as SqliteDb).select().from(schema.sqliteSchema.attioCustomerSuccess).all();
}

/** All users (people) belonging to companies on the customer-support list. */
export async function listCustomerSupportUsers(): Promise<unknown[]> {
  const db = await createDb();
  if (getDatabaseDriver() === 'postgres') {
    const s = schema.pgSchema;
    const cs = await (db as PostgresDb)
      .select({ companyId: s.attioCustomerSuccess.companyId })
      .from(s.attioCustomerSuccess);
    const ids = cs.map((r) => r.companyId).filter((id): id is string => id !== null);
    if (ids.length === 0) return [];
    return (db as PostgresDb)
      .select()
      .from(s.attioPeople)
      .where(inArray(s.attioPeople.companyId, ids));
  }
  const s = schema.sqliteSchema;
  const cs = (db as SqliteDb)
    .select({ companyId: s.attioCustomerSuccess.companyId })
    .from(s.attioCustomerSuccess)
    .all();
  const ids = cs.map((r) => r.companyId).filter((id): id is string => id !== null);
  if (ids.length === 0) return [];
  return (db as SqliteDb)
    .select()
    .from(s.attioPeople)
    .where(inArray(s.attioPeople.companyId, ids))
    .all();
}
