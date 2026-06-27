import { createDb, getDatabaseDriver, schema, type PostgresDb, type SqliteDb } from '@attio/db';
import { attio } from './client.js';
import {
  mapCompany,
  mapCustomerSuccess,
  mapPerson,
  mapWonContract,
  type CompanyRow,
  type CustomerSuccessRow,
  type PersonRow,
  type WonContractRow,
} from './mappers.js';

export interface SyncResult {
  companies: number;
  people: number;
  wonContracts: number;
  customerSuccess: number;
}

interface SyncData {
  companies: CompanyRow[];
  people: PersonRow[];
  wonContracts: WonContractRow[];
  customerSuccess: CustomerSuccessRow[];
}

/** Pull won contracts + customer-support accounts + their companies/users. */
async function fetchFromAttio(): Promise<SyncData> {
  const [companyRecords, peopleRecords, wonEntries, csEntries] = await Promise.all([
    attio.queryRecords('companies'),
    attio.queryRecords('people'),
    attio.queryListEntries('sales', { stage: 'Won' }),
    attio.queryListEntries('customer_success'),
  ]);

  return {
    companies: companyRecords.map(mapCompany),
    people: peopleRecords.map(mapPerson),
    wonContracts: wonEntries.map(mapWonContract),
    customerSuccess: csEntries.map(mapCustomerSuccess),
  };
}

async function persistPostgres(db: PostgresDb, data: SyncData): Promise<void> {
  const s = schema.pgSchema;
  for (const r of data.companies)
    await db
      .insert(s.attioCompanies)
      .values(r)
      .onConflictDoUpdate({ target: s.attioCompanies.id, set: r });
  for (const r of data.people)
    await db
      .insert(s.attioPeople)
      .values(r)
      .onConflictDoUpdate({ target: s.attioPeople.id, set: r });
  for (const r of data.wonContracts)
    await db
      .insert(s.attioWonContracts)
      .values(r)
      .onConflictDoUpdate({ target: s.attioWonContracts.entryId, set: r });
  for (const r of data.customerSuccess)
    await db
      .insert(s.attioCustomerSuccess)
      .values(r)
      .onConflictDoUpdate({ target: s.attioCustomerSuccess.entryId, set: r });
}

function persistSqlite(db: SqliteDb, data: SyncData): void {
  const s = schema.sqliteSchema;
  for (const r of data.companies)
    db.insert(s.attioCompanies)
      .values(r)
      .onConflictDoUpdate({ target: s.attioCompanies.id, set: r })
      .run();
  for (const r of data.people)
    db.insert(s.attioPeople)
      .values(r)
      .onConflictDoUpdate({ target: s.attioPeople.id, set: r })
      .run();
  for (const r of data.wonContracts)
    db.insert(s.attioWonContracts)
      .values(r)
      .onConflictDoUpdate({ target: s.attioWonContracts.entryId, set: r })
      .run();
  for (const r of data.customerSuccess)
    db.insert(s.attioCustomerSuccess)
      .values(r)
      .onConflictDoUpdate({ target: s.attioCustomerSuccess.entryId, set: r })
      .run();
}

/** Fetch from Attio and upsert into the active database (sqlite or postgres). */
export async function syncAttio(): Promise<SyncResult> {
  const data = await fetchFromAttio();
  const db = await createDb();

  if (getDatabaseDriver() === 'postgres') {
    await persistPostgres(db as PostgresDb, data);
  } else {
    persistSqlite(db as SqliteDb, data);
  }

  return {
    companies: data.companies.length,
    people: data.people.length,
    wonContracts: data.wonContracts.length,
    customerSuccess: data.customerSuccess.length,
  };
}
