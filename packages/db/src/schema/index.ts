/**
 * Two dialect-specific schemas live side by side because Drizzle column
 * builders are dialect-bound (sqliteTable vs pgTable). Keep both in sync:
 * any column added to one MUST be added to the other.
 *
 * Consumers should import tables through the db client (src/client.ts),
 * which selects the correct schema for the active driver.
 */
export * as sqliteSchema from './sqlite.js';
export * as pgSchema from './pg.js';
