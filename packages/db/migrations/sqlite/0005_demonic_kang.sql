CREATE TABLE `communications` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`action_id` text,
	`channel` text NOT NULL,
	`direction` text DEFAULT 'outbound' NOT NULL,
	`status` text DEFAULT 'initiated' NOT NULL,
	`call_sid` text,
	`duration_sec` integer,
	`summary` text,
	`sentiment` text,
	`transcript` text,
	`outcome` text,
	`occurred_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`logged_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
