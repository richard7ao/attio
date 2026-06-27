/* eslint-disable no-console */
import { config as loadEnv } from 'dotenv';
import { getDatabaseDriver, getDatabaseUrl, recomputeCompanyChurn } from '@attio/db';

loadEnv({ path: ['../../.env', '.env'] });

const CHANNEL = 'company_changed';

/**
 * Long-running worker for the EC2 box. On Postgres it LISTENs for the
 * `company_changed` NOTIFY (emitted by the trigger in migration 0003) and
 * recomputes churn for only the affected company.
 *
 * On SQLite (local dev) there is no LISTEN/NOTIFY, so recompute happens inline
 * in the API on signal ingest and this worker has nothing to do.
 */
async function main(): Promise<void> {
  if (getDatabaseDriver() !== 'postgres') {
    console.warn('Worker: DATABASE_DRIVER is not postgres; nothing to listen to in local dev.');
    console.warn('Churn is recomputed inline by the API on each signal. Exiting.');
    return;
  }

  const { default: postgres } = await import('postgres');
  const sql = postgres(getDatabaseUrl());

  await sql.listen(CHANNEL, (companyId) => {
    void (async () => {
      try {
        const outcome = await recomputeCompanyChurn(companyId);
        console.warn(
          `recomputed ${companyId}: ${outcome.status} (${Math.round(outcome.score)})` +
            (outcome.escalated ? ' -> ESCALATED' : ''),
        );
      } catch (error) {
        console.error(`recompute failed for ${companyId}:`, error);
      }
    })();
  });

  console.warn(`Worker listening on "${CHANNEL}". Press Ctrl+C to stop.`);
  process.on('SIGINT', () => {
    void sql.end().then(() => process.exit(0));
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
