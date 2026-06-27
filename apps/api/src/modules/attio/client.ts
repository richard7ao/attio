import { config } from '../../config.js';

export class AttioError extends Error {}

/** Raw Attio attribute value (one element of an attribute's value array). */
export type AttioValue = Record<string, unknown>;
export type AttioValues = Record<string, AttioValue[] | undefined>;

export interface AttioRecord {
  id: { record_id: string };
  values: AttioValues;
}

export interface AttioListEntry {
  id: { entry_id: string };
  parent_record_id: string;
  parent_object: string;
  created_at: string;
  entry_values: AttioValues;
}

function authHeaders(): Record<string, string> {
  if (!config.ATTIO_API_KEY) {
    throw new AttioError('ATTIO_API_KEY is not set. Add it to .env.');
  }
  return {
    Authorization: `Bearer ${config.ATTIO_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function post<T>(path: string, body: unknown): Promise<{ data: T[] }> {
  const res = await fetch(`${config.ATTIO_API_BASE_URL}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new AttioError(`Attio ${res.status} on ${path}: ${await res.text()}`);
  }
  return res.json() as Promise<{ data: T[] }>;
}

/** GET an Attio collection endpoint (returns the `data` array). */
async function get<T>(path: string): Promise<T[]> {
  const res = await fetch(`${config.ATTIO_API_BASE_URL}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new AttioError(`Attio ${res.status} on ${path}: ${await res.text()}`);
  return (await res.json() as { data: T[] }).data;
}

/** Write to an Attio endpoint (returns the single `data` object). */
async function mutate<T>(method: 'POST' | 'PATCH' | 'PUT', path: string, body: unknown): Promise<T> {
  const res = await fetch(`${config.ATTIO_API_BASE_URL}${path}`, {
    method,
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new AttioError(`Attio ${res.status} on ${path}: ${await res.text()}`);
  return (await res.json() as { data: T }).data;
}

const PAGE_SIZE = 500;

/** Pages through an Attio query endpoint until all rows are fetched. */
async function queryAll<T>(path: string, filter?: unknown): Promise<T[]> {
  const out: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data } = await post<T>(path, {
      limit: PAGE_SIZE,
      offset,
      ...(filter ? { filter } : {}),
    });
    out.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return out;
}

export interface AttioAttributeDef {
  title: string;
  api_slug: string;
  type: 'text' | 'number';
  description?: string;
}

export interface CreateNoteInput {
  parentRecordId: string;
  title: string;
  content: string;
  parentObject?: string;
}

export interface CreateTaskInput {
  content: string;
  deadlineAt: string;
  linkedRecordId: string;
  assigneeId: string;
  parentObject?: string;
}

export const attio = {
  // --- reads ---
  queryRecords: (object: string, filter?: unknown) =>
    queryAll<AttioRecord>(`/objects/${object}/records/query`, filter),
  queryListEntries: (list: string, filter?: unknown) =>
    queryAll<AttioListEntry>(`/lists/${list}/entries/query`, filter),
  listAttributeSlugs: async (object: string): Promise<string[]> =>
    (await get<{ api_slug: string }>(`/objects/${object}/attributes`)).map((a) => a.api_slug),
  workspaceMemberIds: async (): Promise<string[]> =>
    (await get<{ id: { workspace_member_id: string } }>(`/workspace_members`)).map(
      (m) => m.id.workspace_member_id,
    ),

  // --- writes ---
  createAttribute: (object: string, def: AttioAttributeDef) =>
    mutate('POST', `/objects/${object}/attributes`, {
      data: { ...def, is_required: false, is_unique: false, is_multiselect: false, config: {} },
    }),
  updateRecordValues: (object: string, recordId: string, values: Record<string, unknown>) =>
    mutate('PATCH', `/objects/${object}/records/${recordId}`, { data: { values } }),
  createNote: (input: CreateNoteInput) =>
    mutate<{ id: { note_id: string } }>('POST', `/notes`, {
      data: {
        parent_object: input.parentObject ?? 'companies',
        parent_record_id: input.parentRecordId,
        title: input.title,
        format: 'plaintext',
        content: input.content,
      },
    }),
  createTask: (input: CreateTaskInput) =>
    mutate<{ id: { task_id: string } }>('POST', `/tasks`, {
      data: {
        content: input.content,
        format: 'plaintext',
        deadline_at: input.deadlineAt,
        is_completed: false,
        linked_records: [
          { target_object: input.parentObject ?? 'companies', target_record_id: input.linkedRecordId },
        ],
        assignees: [
          { referenced_actor_type: 'workspace-member', referenced_actor_id: input.assigneeId },
        ],
      },
    }),
  addListEntry: (list: string, parentRecordId: string, parentObject = 'companies') =>
    mutate<{ id: { entry_id: string } }>('POST', `/lists/${list}/entries`, {
      data: { parent_record_id: parentRecordId, parent_object: parentObject, entry_values: {} },
    }),
};
