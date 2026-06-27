CREATE TABLE `attio_companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`domain` text,
	`synced_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `attio_customer_success` (
	`entry_id` text PRIMARY KEY NOT NULL,
	`company_id` text,
	`stage` text,
	`onboarding_stage` text,
	`primary_csm_actor_id` text,
	`arr` real,
	`arr_currency` text,
	`health` text,
	`notes` text,
	`created_at` text,
	`synced_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `attio_companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `attio_people` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text,
	`company_id` text,
	`job_title` text,
	`phone` text,
	`synced_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `attio_companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `attio_won_contracts` (
	`entry_id` text PRIMARY KEY NOT NULL,
	`company_id` text,
	`contact_id` text,
	`owner_actor_id` text,
	`estimated_contract_value` real,
	`currency_code` text,
	`priority` text,
	`projected_close_date` text,
	`won_at` text,
	`created_at` text,
	`synced_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `attio_companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contact_id`) REFERENCES `attio_people`(`id`) ON UPDATE no action ON DELETE no action
);
