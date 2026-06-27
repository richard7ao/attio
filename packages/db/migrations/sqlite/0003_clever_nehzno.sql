ALTER TABLE `escalations` ADD `brief_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `escalations` ADD `brief_summary` text;--> statement-breakpoint
ALTER TABLE `escalations` ADD `brief_churn_drivers` text;--> statement-breakpoint
ALTER TABLE `escalations` ADD `brief_recommended_play` text;--> statement-breakpoint
ALTER TABLE `escalations` ADD `brief_arr_at_risk` real;--> statement-breakpoint
ALTER TABLE `escalations` ADD `brief_source` text;--> statement-breakpoint
ALTER TABLE `escalations` ADD `brief_generated_at` text;