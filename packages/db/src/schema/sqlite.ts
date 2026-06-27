import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  role: text('role', { enum: ['admin', 'csm', 'viewer'] })
    .notNull()
    .default('csm'),
  createdAt: text('created_at').notNull().default(now),
});

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id),
  attioRecordId: text('attio_record_id'),
  name: text('name').notNull(),
  domain: text('domain'),
  mrr: real('mrr').notNull().default(0),
  seats: integer('seats').notNull().default(0),
  seatsUsed: integer('seats_used').notNull().default(0),
  renewalDate: text('renewal_date'),
  createdAt: text('created_at').notNull().default(now),
});

export const signals = sqliteTable('signals', {
  id: text('id').primaryKey(),
  accountId: text('account_id')
    .notNull()
    .references(() => accounts.id),
  type: text('type').notNull(),
  direction: text('direction', { enum: ['risk', 'opportunity'] }).notNull(),
  severity: text('severity', { enum: ['major', 'medium', 'minor'] }).notNull(),
  metadata: text('metadata', { mode: 'json' }).notNull().default('{}'),
  detectedAt: text('detected_at').notNull().default(now),
});

export const outreach = sqliteTable('outreach', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  accountId: text('account_id').references(() => accounts.id),
  channel: text('channel', { enum: ['email', 'voice', 'sms', 'n8n', 'attio'] }).notNull(),
  direction: text('direction', { enum: ['inbound', 'outbound'] }).notNull(),
  actor: text('actor', { enum: ['agent', 'csm'] })
    .notNull()
    .default('agent'),
  status: text('status', { enum: ['queued', 'sent', 'delivered', 'failed', 'replied'] })
    .notNull()
    .default('queued'),
  subject: text('subject'),
  body: text('body'),
  createdAt: text('created_at').notNull().default(now),
});

// ---------------------------------------------------------------------------
// Attio import/mirror layer. Raw data pulled from the Attio CRM API. Primary
// keys are Attio's own record/entry ids (stored as text). Keep in sync with
// schema/pg.ts.
// ---------------------------------------------------------------------------

export const attioCompanies = sqliteTable('attio_companies', {
  id: text('id').primaryKey(), // Attio company record_id
  name: text('name'),
  domain: text('domain'),
  syncedAt: text('synced_at').notNull().default(now),
});

export const attioPeople = sqliteTable('attio_people', {
  id: text('id').primaryKey(), // Attio person record_id
  name: text('name'),
  email: text('email'),
  companyId: text('company_id').references(() => attioCompanies.id),
  jobTitle: text('job_title'),
  phone: text('phone'),
  syncedAt: text('synced_at').notNull().default(now),
});

export const attioWonContracts = sqliteTable('attio_won_contracts', {
  entryId: text('entry_id').primaryKey(), // Attio list entry_id
  companyId: text('company_id').references(() => attioCompanies.id),
  contactId: text('contact_id').references(() => attioPeople.id),
  ownerActorId: text('owner_actor_id'),
  estimatedContractValue: real('estimated_contract_value'),
  currencyCode: text('currency_code'),
  priority: text('priority'),
  projectedCloseDate: text('projected_close_date'),
  wonAt: text('won_at'),
  createdAt: text('created_at'),
  syncedAt: text('synced_at').notNull().default(now),
});

export const attioCustomerSuccess = sqliteTable('attio_customer_success', {
  entryId: text('entry_id').primaryKey(), // Attio list entry_id
  companyId: text('company_id').references(() => attioCompanies.id),
  stage: text('stage'),
  onboardingStage: text('onboarding_stage'),
  primaryCsmActorId: text('primary_csm_actor_id'),
  arr: real('arr'),
  arrCurrency: text('arr_currency'),
  health: text('health'),
  notes: text('notes'),
  createdAt: text('created_at'),
  syncedAt: text('synced_at').notNull().default(now),
});

// ---------------------------------------------------------------------------
// Churn engine: incoming signals, derived per-company state, and the
// escalation outbox consumed by the voice-call poller. Keep in sync with pg.ts.
// ---------------------------------------------------------------------------

export const companySignals = sqliteTable('company_signals', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull(),
  source: text('source', { enum: ['stripe', 'usage', 'support', 'mubit', 'manual'] }).notNull(),
  type: text('type', { enum: ['stripe_cancellation', 'usage_drop', 'support_ticket'] }).notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  value: real('value'),
  metadata: text('metadata', { mode: 'json' }).notNull().default('{}'),
  createdAt: text('created_at').notNull().default(now),
});

export const companyChurn = sqliteTable('company_churn', {
  companyId: text('company_id').primaryKey(),
  score: real('score').notNull().default(0),
  status: text('status', { enum: ['red', 'amber', 'green'] })
    .notNull()
    .default('green'),
  reason: text('reason'),
  updatedAt: text('updated_at').notNull().default(now),
});

export const escalations = sqliteTable('escalations', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull(),
  status: text('status', { enum: ['red', 'amber', 'green'] }).notNull(),
  score: real('score').notNull(),
  reason: text('reason'),
  acked: integer('acked', { mode: 'boolean' }).notNull().default(false),
  ackedAt: text('acked_at'),
  createdAt: text('created_at').notNull().default(now),
});
