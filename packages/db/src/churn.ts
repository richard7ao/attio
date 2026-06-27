import { randomUUID } from 'node:crypto';
import {
  computeChurn,
  type ChurnResult,
  type ChurnSignalInput,
  type ChurnSignalType,
  type SignalSource,
} from '@attio/shared';
import { and, desc, eq } from 'drizzle-orm';
import { createDb, type PostgresDb, type SqliteDb } from './client.js';
import { getDatabaseDriver } from './env.js';
import * as pg from './schema/pg.js';
import * as sqlite from './schema/sqlite.js';

export interface IngestSignalInput {
  companyId: string;
  source: SignalSource;
  type: ChurnSignalType;
  active?: boolean;
  value?: number | null;
  metadata?: Record<string, unknown>;
}

export interface RecomputeOutcome extends ChurnResult {
  companyId: string;
  escalated: boolean;
}

function toSignalInput(
  rows: { type: string; active: boolean; value: number | null }[],
): ChurnSignalInput[] {
  return rows.map((r) => ({
    type: r.type as ChurnSignalType,
    active: r.active,
    value: r.value,
  }));
}

// --- Postgres implementation ------------------------------------------------

async function recomputePg(db: PostgresDb, companyId: string): Promise<RecomputeOutcome> {
  const rows = await db
    .select({
      type: pg.companySignals.type,
      active: pg.companySignals.active,
      value: pg.companySignals.value,
    })
    .from(pg.companySignals)
    .where(eq(pg.companySignals.companyId, companyId));

  const result = computeChurn(toSignalInput(rows));
  const prev = await db
    .select({ status: pg.companyChurn.status })
    .from(pg.companyChurn)
    .where(eq(pg.companyChurn.companyId, companyId));
  const prevStatus = prev[0]?.status ?? 'green';

  const churnRow = {
    companyId,
    score: result.score,
    status: result.status,
    reason: result.reason,
    updatedAt: new Date(),
  };
  await db
    .insert(pg.companyChurn)
    .values(churnRow)
    .onConflictDoUpdate({ target: pg.companyChurn.companyId, set: churnRow });

  const escalated = result.status === 'red' && prevStatus !== 'red';
  if (escalated) {
    await db.insert(pg.escalations).values({
      id: randomUUID(),
      companyId,
      status: result.status,
      score: result.score,
      reason: result.reason,
    });
  }
  return { companyId, ...result, escalated };
}

// --- SQLite implementation --------------------------------------------------

function recomputeSqlite(db: SqliteDb, companyId: string): RecomputeOutcome {
  const rows = db
    .select({
      type: sqlite.companySignals.type,
      active: sqlite.companySignals.active,
      value: sqlite.companySignals.value,
    })
    .from(sqlite.companySignals)
    .where(eq(sqlite.companySignals.companyId, companyId))
    .all();

  const result = computeChurn(toSignalInput(rows));
  const prev = db
    .select({ status: sqlite.companyChurn.status })
    .from(sqlite.companyChurn)
    .where(eq(sqlite.companyChurn.companyId, companyId))
    .all();
  const prevStatus = prev[0]?.status ?? 'green';

  const churnRow = {
    companyId,
    score: result.score,
    status: result.status,
    reason: result.reason,
    updatedAt: new Date().toISOString(),
  };
  db.insert(sqlite.companyChurn)
    .values(churnRow)
    .onConflictDoUpdate({ target: sqlite.companyChurn.companyId, set: churnRow })
    .run();

  const escalated = result.status === 'red' && prevStatus !== 'red';
  if (escalated) {
    db.insert(sqlite.escalations)
      .values({
        id: randomUUID(),
        companyId,
        status: result.status,
        score: result.score,
        reason: result.reason,
      })
      .run();
  }
  return { companyId, ...result, escalated };
}

// --- public API -------------------------------------------------------------

/** Recompute a single company's churn state from its current signals. */
export async function recomputeCompanyChurn(companyId: string): Promise<RecomputeOutcome> {
  const db = await createDb();
  return getDatabaseDriver() === 'postgres'
    ? recomputePg(db as PostgresDb, companyId)
    : recomputeSqlite(db as SqliteDb, companyId);
}

/** Insert a signal then recompute the affected company. */
export async function ingestSignal(input: IngestSignalInput): Promise<RecomputeOutcome> {
  const db = await createDb();
  const row = {
    id: randomUUID(),
    companyId: input.companyId,
    source: input.source,
    type: input.type,
    active: input.active ?? true,
    value: input.value ?? null,
    metadata: input.metadata ?? {},
  };

  if (getDatabaseDriver() === 'postgres') {
    await (db as PostgresDb).insert(pg.companySignals).values(row);
    return recomputePg(db as PostgresDb, input.companyId);
  }
  (db as SqliteDb).insert(sqlite.companySignals).values(row).run();
  return recomputeSqlite(db as SqliteDb, input.companyId);
}

// --- reads (for the dashboard + escalation poller) --------------------------

/** Company churn state joined with the company name, worst first. */
export async function listCompanyChurn(): Promise<unknown[]> {
  const db = await createDb();
  if (getDatabaseDriver() === 'postgres') {
    return (db as PostgresDb)
      .select({
        companyId: pg.companyChurn.companyId,
        name: pg.attioCompanies.name,
        score: pg.companyChurn.score,
        status: pg.companyChurn.status,
        reason: pg.companyChurn.reason,
        updatedAt: pg.companyChurn.updatedAt,
      })
      .from(pg.companyChurn)
      .leftJoin(pg.attioCompanies, eq(pg.attioCompanies.id, pg.companyChurn.companyId))
      .orderBy(desc(pg.companyChurn.score));
  }
  return (db as SqliteDb)
    .select({
      companyId: sqlite.companyChurn.companyId,
      name: sqlite.attioCompanies.name,
      score: sqlite.companyChurn.score,
      status: sqlite.companyChurn.status,
      reason: sqlite.companyChurn.reason,
      updatedAt: sqlite.companyChurn.updatedAt,
    })
    .from(sqlite.companyChurn)
    .leftJoin(sqlite.attioCompanies, eq(sqlite.attioCompanies.id, sqlite.companyChurn.companyId))
    .orderBy(desc(sqlite.companyChurn.score))
    .all();
}

/** All companies (from the Attio mirror) with their churn state, worst first. */
export async function listCompaniesWithChurn(): Promise<
  { companyId: string; name: string | null; score: number; status: string; reason: string | null }[]
> {
  const db = await createDb();
  const map = (r: {
    companyId: string;
    name: string | null;
    score: number | null;
    status: string | null;
    reason: string | null;
  }) => ({
    companyId: r.companyId,
    name: r.name,
    score: r.score ?? 0,
    status: r.status ?? 'green',
    reason: r.reason,
  });

  if (getDatabaseDriver() === 'postgres') {
    const rows = await (db as PostgresDb)
      .select({
        companyId: pg.attioCompanies.id,
        name: pg.attioCompanies.name,
        score: pg.companyChurn.score,
        status: pg.companyChurn.status,
        reason: pg.companyChurn.reason,
      })
      .from(pg.attioCompanies)
      .leftJoin(pg.companyChurn, eq(pg.companyChurn.companyId, pg.attioCompanies.id));
    return rows.map(map).sort((a, b) => b.score - a.score);
  }
  const rows = (db as SqliteDb)
    .select({
      companyId: sqlite.attioCompanies.id,
      name: sqlite.attioCompanies.name,
      score: sqlite.companyChurn.score,
      status: sqlite.companyChurn.status,
      reason: sqlite.companyChurn.reason,
    })
    .from(sqlite.attioCompanies)
    .leftJoin(sqlite.companyChurn, eq(sqlite.companyChurn.companyId, sqlite.attioCompanies.id))
    .all();
  return rows.map(map).sort((a, b) => b.score - a.score);
}

export interface ListEscalationsOptions {
  status?: 'red' | 'amber' | 'green';
  unclaimedOnly?: boolean;
}

/** Escalation outbox rows for the voice-call poller. */
export async function listEscalations(opts: ListEscalationsOptions = {}): Promise<unknown[]> {
  const db = await createDb();
  if (getDatabaseDriver() === 'postgres') {
    const t = pg.escalations;
    const where = and(
      opts.status ? eq(t.status, opts.status) : undefined,
      opts.unclaimedOnly ? eq(t.acked, false) : undefined,
    );
    return (db as PostgresDb).select().from(t).where(where).orderBy(desc(t.createdAt));
  }
  const t = sqlite.escalations;
  const where = and(
    opts.status ? eq(t.status, opts.status) : undefined,
    opts.unclaimedOnly ? eq(t.acked, false) : undefined,
  );
  return (db as SqliteDb).select().from(t).where(where).orderBy(desc(t.createdAt)).all();
}

/** Mark an escalation as picked up by the poller. */
export async function ackEscalation(id: string): Promise<void> {
  const db = await createDb();
  if (getDatabaseDriver() === 'postgres') {
    await (db as PostgresDb)
      .update(pg.escalations)
      .set({ acked: true, ackedAt: new Date() })
      .where(eq(pg.escalations.id, id));
    return;
  }
  (db as SqliteDb)
    .update(sqlite.escalations)
    .set({ acked: true, ackedAt: new Date().toISOString() })
    .where(eq(sqlite.escalations.id, id))
    .run();
}
