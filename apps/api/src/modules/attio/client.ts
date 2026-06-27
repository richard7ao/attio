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

export const attio = {
  queryRecords: (object: string, filter?: unknown) =>
    queryAll<AttioRecord>(`/objects/${object}/records/query`, filter),
  queryListEntries: (list: string, filter?: unknown) =>
    queryAll<AttioListEntry>(`/lists/${list}/entries/query`, filter),
};
