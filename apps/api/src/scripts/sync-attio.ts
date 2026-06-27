/* eslint-disable no-console */
import { syncAttio } from '../modules/attio/sync.js';

async function main(): Promise<void> {
  console.warn('Syncing from Attio...');
  const result = await syncAttio();
  console.warn('Done:', JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
