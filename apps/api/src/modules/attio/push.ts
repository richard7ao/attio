import { getCompanyContext } from '@attio/db';
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

  // 3 + 4) churn list entry + call task, at-risk only, deduped by list membership
  let listEntryId: string | null = null;
  let taskId: string | null = null;
  let addedToChurnList = false;
  if (atRisk) {
    const list = config.ATTIO_CHURN_LIST;
    const onList = (await attio.queryListEntries(list)).some(
      (e) => e.parent_record_id === companyId,
    );
    if (!onList) {
      listEntryId = (await attio.addListEntry(list, companyId)).id.entry_id;
      addedToChurnList = true;
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
  }

  return { companyId, noteId: note.id.note_id, taskId, listEntryId, addedToChurnList };
}
