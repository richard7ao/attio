/* eslint-disable no-console */
import { attio } from '../modules/attio/client.js';

// Registers the Attio -> our-API connector webhooks.
//   pnpm --filter @attio/api register:attio-webhooks https://<public-api-host>
// (the /api/webhooks/attio path is appended). The printed secret should be set
// as ATTIO_WEBHOOK_SECRET. We subscribe to all list-entry create/update events
// and route by list inside the receiver, so no fragile subscription filters.

async function main(): Promise<void> {
  const base = process.argv[2] ?? process.env.ATTIO_WEBHOOK_TARGET;
  if (!base) {
    console.error('usage: register-attio-webhooks <https://public-api-host>');
    process.exit(1);
  }
  const url = `${base.replace(/\/$/, '')}/api/webhooks/attio`;

  for (const w of await attio.listWebhooks()) {
    if (w.target_url === url) {
      await attio.deleteWebhook(w.id.webhook_id);
      console.log('removed existing webhook', w.id.webhook_id);
    }
  }

  const created = await attio.createWebhook(url, [
    { event_type: 'list-entry.created', filter: null },
    { event_type: 'list-entry.updated', filter: null },
  ]);
  console.log('webhook created :', created.id.webhook_id);
  console.log('target_url      :', url);
  console.log('ATTIO_WEBHOOK_SECRET =', created.secret);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
