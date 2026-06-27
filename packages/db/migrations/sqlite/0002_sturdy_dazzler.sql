CREATE TABLE `company_churn` (
	`company_id` text PRIMARY KEY NOT NULL,
	`score` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'green' NOT NULL,
	`reason` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `company_signals` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`source` text NOT NULL,
	`type` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`value` real,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `escalations` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`status` text NOT NULL,
	`score` real NOT NULL,
	`reason` text,
	`acked` integer DEFAULT false NOT NULL,
	`acked_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
