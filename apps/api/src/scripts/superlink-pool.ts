/* eslint-disable no-console */
import { config } from '../config.js';

// ===========================================================================
// Superlink (SIE) pool admin — model pinning to keep a model warm.
// Requires SUPERLINK_ADMIN_KEY (the restricted SL- key gets 403 on /v1/pools).
//
//   pnpm --filter @attio/api superlink:pool list
//   pnpm --filter @attio/api superlink:pool create <name> <profile> <model> [minWorkers]
//   pnpm --filter @attio/api superlink:pool delete <name>
//
// ⚠️  Pinning a model onto the *only* GPU of a SHARED hot lane (e.g.
// rtx6000-qwen27) takes that worker over and BREAKS the shared lane for
// everyone until the pool is deleted and the worker recovers. Only pin on a
// spare/dedicated machine profile, or coordinate with the cluster owner.
// ===========================================================================

const ADMIN = config.SUPERLINK_ADMIN_KEY;
const READ = config.SUPERLINK_API_KEY; // GET /pools uses the regular SL- key
const BASE = config.SUPERLINK_BASE_URL; // ends in /v1

// Reads (GET) authenticate with the regular key; writes (POST/DELETE) need the admin token.
async function api(method: string, path: string, body?: unknown): Promise<unknown> {
  if (!BASE) throw new Error('SUPERLINK_BASE_URL is not set');
  const token = method === 'GET' ? READ : ADMIN;
  if (!token) {
    throw new Error(method === 'GET' ? 'SUPERLINK_API_KEY is not set' : 'SUPERLINK_ADMIN_KEY is not set');
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`SIE ${res.status} ${method} ${path}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function main(): Promise<void> {
  const [cmd, ...args] = process.argv.slice(2);

  if (cmd === 'list') {
    console.log(JSON.stringify(await api('GET', '/pools'), null, 2));
    return;
  }
  if (cmd === 'delete') {
    const [name] = args;
    if (!name) throw new Error('usage: delete <name>');
    console.log(JSON.stringify(await api('DELETE', `/pools/${encodeURIComponent(name)}`), null, 2));
    return;
  }
  if (cmd === 'create') {
    const [name, profile, model, minWorkers] = args;
    if (!name || !profile || !model) throw new Error('usage: create <name> <profile> <model> [minWorkers]');
    const body = {
      name,
      gpus: { [profile]: 1 },
      bundle: 'sglang',
      minimum_worker_count: Number(minWorkers ?? 1),
      pinned_models: [model],
    };
    console.log('⚠️  Pinning on a shared single-GPU profile will disrupt that hot lane.');
    console.log(JSON.stringify(await api('POST', '/pools', body), null, 2));
    return;
  }

  console.error('usage: superlink-pool <list|create|delete> ...');
  process.exit(1);
}

main().catch((err) => {
  console.error((err as Error).message);
  process.exit(1);
});
