import { sql } from 'drizzle-orm';
import {
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
