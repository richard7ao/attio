import { sql } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  role: text('role', { enum: ['admin', 'csm', 'viewer'] })
    .notNull()
    .default('csm'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id),
  attioRecordId: text('attio_record_id'),
  name: text('name').notNull(),
  domain: text('domain'),
  mrr: doublePrecision('mrr').notNull().default(0),
  seats: integer('seats').notNull().default(0),
  seatsUsed: integer('seats_used').notNull().default(0),
  renewalDate: timestamp('renewal_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const signals = pgTable('signals', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id),
  type: text('type').notNull(),
  direction: text('direction', { enum: ['risk', 'opportunity'] }).notNull(),
  severity: text('severity', { enum: ['major', 'medium', 'minor'] }).notNull(),
  metadata: jsonb('metadata')
    .notNull()
    .default(sql`'{}'::jsonb`),
  detectedAt: timestamp('detected_at', { withTimezone: true }).notNull().defaultNow(),
});

export const outreach = pgTable('outreach', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  accountId: uuid('account_id').references(() => accounts.id),
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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Attio import/mirror layer. Raw data pulled from the Attio CRM API. Primary
// keys are Attio's own record/entry ids (stored as text). Keep in sync with
// schema/sqlite.ts.
// ---------------------------------------------------------------------------

export const attioCompanies = pgTable('attio_companies', {
  id: text('id').primaryKey(), // Attio company record_id
  name: text('name'),
  domain: text('domain'),
  syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow(),
});

export const attioPeople = pgTable('attio_people', {
  id: text('id').primaryKey(), // Attio person record_id
  name: text('name'),
  email: text('email'),
  companyId: text('company_id').references(() => attioCompanies.id),
  jobTitle: text('job_title'),
  phone: text('phone'),
  syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow(),
});

export const attioWonContracts = pgTable('attio_won_contracts', {
  entryId: text('entry_id').primaryKey(), // Attio list entry_id
  companyId: text('company_id').references(() => attioCompanies.id),
  contactId: text('contact_id').references(() => attioPeople.id),
  ownerActorId: text('owner_actor_id'),
  estimatedContractValue: doublePrecision('estimated_contract_value'),
  currencyCode: text('currency_code'),
  priority: text('priority'),
  projectedCloseDate: text('projected_close_date'),
  wonAt: timestamp('won_at', { withTimezone: true, mode: 'string' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }),
  syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow(),
});

export const attioCustomerSuccess = pgTable('attio_customer_success', {
  entryId: text('entry_id').primaryKey(), // Attio list entry_id
  companyId: text('company_id').references(() => attioCompanies.id),
  stage: text('stage'),
  onboardingStage: text('onboarding_stage'),
  primaryCsmActorId: text('primary_csm_actor_id'),
  arr: doublePrecision('arr'),
  arrCurrency: text('arr_currency'),
  health: text('health'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }),
  syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Churn engine: incoming signals, derived per-company state, and the
// escalation outbox consumed by the voice-call poller. Keep in sync with
// sqlite.ts. A trigger on company_signals/company_churn emits pg_notify
// (see custom migration) which the long-running worker LISTENs on.
// ---------------------------------------------------------------------------

export const companySignals = pgTable('company_signals', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull(),
  source: text('source', { enum: ['stripe', 'usage', 'support', 'mubit', 'manual'] }).notNull(),
  type: text('type', { enum: ['stripe_cancellation', 'usage_drop', 'support_ticket'] }).notNull(),
  active: boolean('active').notNull().default(true),
  value: doublePrecision('value'),
  metadata: jsonb('metadata')
    .notNull()
    .default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const companyChurn = pgTable('company_churn', {
  companyId: text('company_id').primaryKey(),
  score: doublePrecision('score').notNull().default(0),
  status: text('status', { enum: ['red', 'amber', 'green'] })
    .notNull()
    .default('green'),
  reason: text('reason'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const escalations = pgTable('escalations', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull(),
  status: text('status', { enum: ['red', 'amber', 'green'] }).notNull(),
  score: doublePrecision('score').notNull(),
  reason: text('reason'),
  acked: boolean('acked').notNull().default(false),
  ackedAt: timestamp('acked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
