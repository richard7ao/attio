/* eslint-disable no-console */
/**
 * One-shot seed: copy all rows from the local SQLite dev DB into the Supabase
 * Postgres DB. Idempotent — uses ON CONFLICT DO NOTHING so re-running is safe.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... pnpm --filter @attio/db tsx scripts/seed-supabase-from-sqlite.mjs
 *
 * Defaults to ./data/attio.local.db for the SQLite source.
 */
import Database from 'better-sqlite3';
import postgres from 'postgres';

const SQLITE_PATH = process.env.SQLITE_PATH ?? './data/attio.local.db';
const PG_URL = process.env.DATABASE_URL;

if (!PG_URL) {
  console.error('DATABASE_URL is required (postgres connection string).');
  process.exit(1);
}

// Tables in dependency order (parents first). FKs: attio_people -> attio_companies,
// attio_customer_success -> attio_companies, attio_won_contracts -> attio_companies,
// company_churn -> attio_companies, company_signals -> attio_companies,
// escalations -> attio_companies. accounts/users/outreach/signs are empty locally
// but included for completeness.
const TABLES = [
  'attio_companies',
  'attio_people',
  'attio_customer_success',
  'attio_won_contracts',
  'company_churn',
  'company_signals',
  'escalations',
  'accounts',
  'users',
  'outreach',
  'signals',
];

// Per-table column overrides for sqlite->pg type coercion.
// 'bool'   : sqlite INTEGER 0/1  -> pg boolean
// 'jsonb'  : sqlite TEXT (json)  -> pg jsonb
const COLUMN_COERCIONS = {
  company_signals: { active: 'bool', metadata: 'jsonb' },
  escalations: { acked: 'bool' },
};

function coerceValue(table, col, value) {
  const rule = COLUMN_COERCIONS[table]?.[col];
  if (value === null || value === undefined) return null;
  if (rule === 'bool') return value === 1 || value === true;
  if (rule === 'jsonb') {
    // postgres-js accepts objects for jsonb columns; parse the stored string.
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

async function main() {
  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  const sql = postgres(PG_URL, { max: 1, prepare: false });

  let totalInserted = 0;
  const perTable = {};

  for (const table of TABLES) {
    const sqliteCols = sqlite.prepare(`pragma table_info(${table})`).all();
    if (sqliteCols.length === 0) {
      console.log(`skip ${table}: not present in sqlite`);
      continue;
    }
    const cols = sqliteCols.map((c) => c.name);
    const rows = sqlite.prepare(`select * from ${table}`).all();

    if (rows.length === 0) {
      console.log(`${table}: 0 rows (skipped)`);
      perTable[table] = 0;
      continue;
    }

    // Build a multi-row INSERT with ON CONFLICT DO NOTHING (idempotent re-runs).
    const colList = cols.map((c) => `"${c}"`).join(', ');
    const conflictTarget = cols[0]; // first column is the PK in every table here

    // Insert in batches of 100 to keep parameter counts reasonable.
    const BATCH = 100;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const values = [];
      const placeholders = batch
        .map((_, rIdx) => {
          return `(${cols.map((_, cIdx) => `$${rIdx * cols.length + cIdx + 1}`).join(', ')})`;
        })
        .join(', ');

      for (const row of batch) {
        for (const col of cols) {
          values.push(coerceValue(table, col, row[col]));
        }
      }

      const query = `
        insert into "${table}" (${colList})
        values ${placeholders}
        on conflict ("${conflictTarget}") do nothing
      `;
      const result = await sql.unsafe(query, values);
      inserted += result.count ?? 0;
    }

    perTable[table] = inserted;
    totalInserted += inserted;
    console.log(`${table}: ${rows.length} source -> ${inserted} inserted`);
  }

  sqlite.close();
  await sql.end();

  console.log(`\nDone. Total inserted: ${totalInserted}`);
  console.log('Per-table:', perTable);
}

main().catch((e) => {
  console.error('SEED FAILED:', e);
  process.exit(1);
});
