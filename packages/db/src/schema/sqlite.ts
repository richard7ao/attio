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
