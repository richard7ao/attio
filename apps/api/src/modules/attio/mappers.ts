import type { AttioListEntry, AttioRecord, AttioValue, AttioValues } from './client.js';

// ---- low-level value extractors --------------------------------------------

function first(values: AttioValues, slug: string): AttioValue | undefined {
  return values[slug]?.[0];
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function num(v: unknown): number | null {
  return typeof v === 'number' ? v : null;
}

/** Normalize Attio's nanosecond timestamps to ISO millis (Postgres-safe). */
function toIso(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const text = (vs: AttioValues, slug: string) => str(first(vs, slug)?.value);
const statusTitle = (vs: AttioValues, slug: string) =>
  str((first(vs, slug)?.status as { title?: string } | undefined)?.title);
const selectTitle = (vs: AttioValues, slug: string) =>
  str((first(vs, slug)?.option as { title?: string } | undefined)?.title);
const recordRef = (vs: AttioValues, slug: string) => str(first(vs, slug)?.target_record_id);
const actorRef = (vs: AttioValues, slug: string) => str(first(vs, slug)?.referenced_actor_id);
const currencyValue = (vs: AttioValues, slug: string) => num(first(vs, slug)?.currency_value);
const currencyCode = (vs: AttioValues, slug: string) => str(first(vs, slug)?.currency_code);

// ---- row shapes (dialect-agnostic plain objects) ---------------------------

export interface CompanyRow {
  id: string;
  name: string | null;
  domain: string | null;
}

export interface PersonRow {
  id: string;
  name: string | null;
  email: string | null;
  companyId: string | null;
  jobTitle: string | null;
  phone: string | null;
}

export interface WonContractRow {
  entryId: string;
  companyId: string | null;
  contactId: string | null;
  ownerActorId: string | null;
  estimatedContractValue: number | null;
  currencyCode: string | null;
  priority: string | null;
  projectedCloseDate: string | null;
  wonAt: string | null;
  createdAt: string | null;
}

export interface CustomerSuccessRow {
  entryId: string;
  companyId: string | null;
  stage: string | null;
  onboardingStage: string | null;
  primaryCsmActorId: string | null;
  arr: number | null;
  arrCurrency: string | null;
  health: string | null;
  notes: string | null;
  createdAt: string | null;
}

// ---- record/entry mappers --------------------------------------------------

export function mapCompany(rec: AttioRecord): CompanyRow {
  const vs = rec.values;
  const domain = str((first(vs, 'domains') as { domain?: string } | undefined)?.domain);
  return { id: rec.id.record_id, name: text(vs, 'name'), domain };
}

export function mapPerson(rec: AttioRecord): PersonRow {
  const vs = rec.values;
  const name = str((first(vs, 'name') as { full_name?: string } | undefined)?.full_name);
  const email = str(
    (first(vs, 'email_addresses') as { email_address?: string } | undefined)?.email_address,
  );
  const phoneVal = first(vs, 'phone_numbers') as
    { phone_number?: string; original_phone_number?: string } | undefined;
  return {
    id: rec.id.record_id,
    name,
    email,
    companyId: recordRef(vs, 'company'),
    jobTitle: text(vs, 'job_title'),
    phone: str(phoneVal?.phone_number ?? phoneVal?.original_phone_number),
  };
}

/** active_from of the currently-active "Won" stage value. */
function wonAt(vs: AttioValues): string | null {
  const active = vs.stage?.find(
    (v) => (v.status as { title?: string } | undefined)?.title === 'Won' && v.active_until === null,
  );
  return toIso(active?.active_from);
}

export function mapWonContract(entry: AttioListEntry): WonContractRow {
  const vs = entry.entry_values;
  return {
    entryId: entry.id.entry_id,
    companyId: entry.parent_object === 'companies' ? entry.parent_record_id : null,
    contactId: recordRef(vs, 'main_point_of_contact'),
    ownerActorId: actorRef(vs, 'owner'),
    estimatedContractValue: currencyValue(vs, 'estimated_contract_value'),
    currencyCode: currencyCode(vs, 'estimated_contract_value'),
    priority: selectTitle(vs, 'priority'),
    projectedCloseDate: text(vs, 'projected_close_date'),
    wonAt: wonAt(vs),
    createdAt: toIso(entry.created_at),
  };
}

export function mapCustomerSuccess(entry: AttioListEntry): CustomerSuccessRow {
  const vs = entry.entry_values;
  return {
    entryId: entry.id.entry_id,
    companyId: entry.parent_object === 'companies' ? entry.parent_record_id : null,
    stage: statusTitle(vs, 'stage'),
    onboardingStage: statusTitle(vs, 'onboarding_stage'),
    primaryCsmActorId: actorRef(vs, 'primary_csm'),
    arr: currencyValue(vs, 'arr'),
    arrCurrency: currencyCode(vs, 'arr'),
    health: selectTitle(vs, 'health'),
    notes: text(vs, 'notes'),
    createdAt: toIso(entry.created_at),
  };
}
