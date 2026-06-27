import { getCompanyContext, listCompaniesWithChurn } from '@attio/db';
import type { AccountBrief } from '@attio/shared';
import { config } from '../../config.js';
import { attio, type AttioAttributeDef } from './client.js';

// ===========================================================================
// ATTIO WRITE-BACK ("our data comes up into Attio")
// For an at-risk account we push, onto its Attio company record:
//   1. structured churn fields (status / score / ARR at risk / summary)
//   2. a note carrying the full Head-of-Data brief
//   3. a "call this customer" task (at-risk only, deduped by churn-list membership)
//   4. an entry on the churn list (at-risk only, deduped)
// All writes target the Attio company record_id, which is our companyId.
// ===========================================================================

const CHURN_ATTRIBUTES: AttioAttributeDef[] = [
  { title: 'Churn status', api_slug: 'churn_status', type: 'text', description: 'Derived churn status (red/amber/green)' },
  { title: 'Churn score', api_slug: 'churn_score', type: 'number', description: '0-100 churn score' },
  { title: 'ARR at risk', api_slug: 'churn_arr_at_risk', type: 'number', description: 'ARR at risk (USD)' },
  { title: 'Churn brief summary', api_slug: 'churn_summary', type: 'text', description: 'Head-of-Data brief summary' },
];

let attributesEnsured = false;
/** Create the churn custom attributes on the Company object if they're missing. */
async function ensureChurnAttributes(): Promise<void> {
  if (attributesEnsured) return;
  const existing = new Set(await attio.listAttributeSlugs('companies'));
  for (const def of CHURN_ATTRIBUTES) {
    if (!existing.has(def.api_slug)) await attio.createAttribute('companies', def);
  }
  attributesEnsured = true;
}

let cachedAssignee: string | undefined;
async function resolveAssignee(): Promise<string | undefined> {
  if (config.ATTIO_TASK_ASSIGNEE_ID) return config.ATTIO_TASK_ASSIGNEE_ID;
  if (cachedAssignee) return cachedAssignee;
  cachedAssignee = (await attio.workspaceMemberIds())[0];
  return cachedAssignee;
}

export function attioPushEnabled(): boolean {
  return Boolean(config.ATTIO_API_KEY);
}

export interface AttioPushResult {
  companyId: string;
  noteId: string | null;
  taskId: string | null;
  listEntryId: string | null;
  addedToChurnList: boolean;
}

/** Push a company's churn state + brief into Attio. */
export async function pushBriefToAttio(
  companyId: string,
  brief: AccountBrief,
): Promise<AttioPushResult> {
  await ensureChurnAttributes();
  const ctx = await getCompanyContext(companyId);
  const status = ctx?.churnStatus ?? 'green';
  const score = Math.round(ctx?.churnScore ?? 0);
  const atRisk = status === 'red' || status === 'amber';

  // 1) structured fields on the company record. Attio rejects null for number
  // fields, so only include ARR when we actually have a value.
  const values: Record<string, unknown> = {
    churn_status: status,
    churn_score: score,
    churn_summary: brief.summary,
  };
  if (brief.arrAtRisk != null) values.churn_arr_at_risk = brief.arrAtRisk;
  await attio.updateRecordValues('companies', companyId, values);

  // 2) note with the full brief
  const note = await attio.createNote({
    parentRecordId: companyId,
    title: `Churn brief — ${status.toUpperCase()} (${new Date().toISOString().slice(0, 10)})`,
    content: [
      `Status: ${status.toUpperCase()} (score ${score})`,
      ``,
      `Summary: ${brief.summary}`,
      `Drivers: ${brief.churnDrivers}`,
      `Recommended play: ${brief.recommendedPlay}`,
      `ARR at risk: ${brief.arrAtRisk ?? 'n/a'}`,
      ``,
      `— Head of Data agent (${brief.source})`,
    ].join('\n'),
  });

  // 3) churn list entry — upserted for EVERY status (red/amber/green) so the list
  // mirrors the dashboard; clicking an entry shows the full record data.
  const { entryId: listEntryId, added: addedToChurnList } = await upsertChurnListEntry(
    companyId,
    status,
  );

  // 4) call task — at-risk only, and only when first added to the list (dedup).
  let taskId: string | null = null;
  if (atRisk && addedToChurnList) {
    const assignee = await resolveAssignee();
    if (assignee) {
      const deadlineAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      const task = await attio.createTask({
        content: `Call ${ctx?.name ?? companyId} re: churn (${status.toUpperCase()}). ${brief.recommendedPlay}`,
        deadlineAt,
        linkedRecordId: companyId,
        assigneeId: assignee,
      });
      taskId = task.id.task_id;
    }
  }

  return { companyId, noteId: note.id.note_id, taskId, listEntryId, addedToChurnList };
}

// The churn list's status attribute (slug "green") maps our RAG status.
const STATUS_TITLE: Record<string, string> = { red: 'Red', amber: 'Amber', green: 'Green' };

/** Create or update a company's churn-list entry, setting its RAG status. */
async function upsertChurnListEntry(
  companyId: string,
  status: string,
): Promise<{ entryId: string; added: boolean }> {
  const list = config.ATTIO_CHURN_LIST;
  const entryValues = { green: STATUS_TITLE[status] ?? 'Green' };
  const existing = (await attio.queryListEntries(list)).find(
    (e) => e.parent_record_id === companyId,
  );
  if (existing) {
    await attio.updateListEntry(list, existing.id.entry_id, entryValues);
    return { entryId: existing.id.entry_id, added: false };
  }
  const created = await attio.addListEntry(list, companyId, entryValues);
  return { entryId: created.id.entry_id, added: true };
}

/**
 * Bulk-upsert every company onto the churn list with its current RAG status, so
 * the list shows everything the dashboard shows. Fetches existing entries once.
 */
export async function syncAllCompaniesToList(): Promise<{ upserted: number }> {
  await ensureChurnAttributes();
  const list = config.ATTIO_CHURN_LIST;
  const [companies, entries] = await Promise.all([
    listCompaniesWithChurn(),
    attio.queryListEntries(list),
  ]);
  const entryByCompany = new Map(entries.map((e) => [e.parent_record_id, e.id.entry_id]));

  let upserted = 0;
  for (const c of companies) {
    const entryValues = { green: STATUS_TITLE[c.status] ?? 'Green' };
    const entryId = entryByCompany.get(c.companyId);
    if (entryId) await attio.updateListEntry(list, entryId, entryValues);
    else await attio.addListEntry(list, c.companyId, entryValues);
    upserted++;
  }
  return { upserted };
}
