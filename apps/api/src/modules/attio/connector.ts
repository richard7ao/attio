import { getCompanyContext, getCompanyPrimaryContact, recomputeCompanyChurn } from '@attio/db';
import { config } from '../../config.js';
import { generateAndSaveBrief } from '../analysis/brief.js';
import { attio } from './client.js';

// ===========================================================================
// ATTIO -> OUR API CONNECTOR
// Receives Attio webhook events and routes them:
//   - sales (Won) list-entry.created           -> contract won  -> track + brief
//   - customer_success list-entry.created      -> support flow  -> track + brief
//   - churn list-entry status = "Human Required" -> place a voice call
// All handlers are best-effort so a bad event never fails the webhook response.
// ===========================================================================

export interface AttioEvent {
  event_type?: string;
  id?: { list_id?: string; entry_id?: string };
  parent_record_id?: string;
}

/** The churn-list status that means "a human should call this account". */
const CALL_TRIGGER_STATUS = 'Human Required';

let listSlugById: Map<string, string> | undefined;
async function slugForListId(listId: string | undefined): Promise<string | undefined> {
  if (!listId) return undefined;
  if (!listSlugById) {
    const lists = await attio.lists();
    listSlugById = new Map(lists.map((l) => [l.id.list_id, l.api_slug]));
  }
  return listSlugById.get(listId);
}

/** Read a churn-list entry's RAG/Human-Required status title. */
async function entryStatusTitle(entryId: string): Promise<string | undefined> {
  const entries = await attio.queryListEntries(config.ATTIO_CHURN_LIST);
  const entry = entries.find((e) => e.id.entry_id === entryId);
  const status = entry?.entry_values?.green?.[0] as { status?: { title?: string } } | undefined;
  return status?.status?.title ?? undefined;
}

/** A won contract / new support-flow account — make sure we're tracking it. */
async function trackAccount(companyId: string): Promise<void> {
  await recomputeCompanyChurn(companyId); // ensure a churn row exists
  await generateAndSaveBrief(companyId); // brief + Attio write-back + n8n dispatch
}

/** Forward a "place a call" request to the voice service (SLNG). */
async function placeCall(companyId: string): Promise<void> {
  if (!config.VOICE_BASE_URL) return;
  const [ctx, contact] = await Promise.all([
    getCompanyContext(companyId),
    getCompanyPrimaryContact(companyId),
  ]);
  if (!ctx || !contact?.phone) return; // need someone to call
  await fetch(`${config.VOICE_BASE_URL}/calls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      signal: {
        accountId: companyId,
        accountName: ctx.name ?? companyId,
        contactName: contact.name ?? 'there',
        toNumber: contact.phone,
        goal: `Churn rescue for ${ctx.name ?? companyId} (${ctx.churnStatus}).`,
        notes: ctx.churnReason ?? undefined,
      },
    }),
  });
}

/** Route a batch of Attio webhook events. Returns how many we acted on. */
export async function handleAttioEvents(events: AttioEvent[]): Promise<{ handled: number }> {
  let handled = 0;
  for (const ev of events) {
    const companyId = ev.parent_record_id;
    if (!companyId) continue;
    const slug = await slugForListId(ev.id?.list_id);

    try {
      if (ev.event_type === 'list-entry.created' && slug === 'sales') {
        await trackAccount(companyId);
        handled++;
      } else if (ev.event_type === 'list-entry.created' && slug === 'customer_success') {
        await trackAccount(companyId);
        handled++;
      } else if (slug === config.ATTIO_CHURN_LIST && ev.id?.entry_id) {
        const title = await entryStatusTitle(ev.id.entry_id);
        if (title === CALL_TRIGGER_STATUS) {
          await placeCall(companyId);
          handled++;
        }
      }
    } catch {
      // best-effort: one bad event must not fail the whole delivery
    }
  }
  return { handled };
}
