ALTER TABLE "escalations" ADD COLUMN "brief_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "escalations" ADD COLUMN "brief_summary" text;--> statement-breakpoint
ALTER TABLE "escalations" ADD COLUMN "brief_churn_drivers" text;--> statement-breakpoint
ALTER TABLE "escalations" ADD COLUMN "brief_recommended_play" text;--> statement-breakpoint
ALTER TABLE "escalations" ADD COLUMN "brief_arr_at_risk" double precision;--> statement-breakpoint
ALTER TABLE "escalations" ADD COLUMN "brief_source" text;--> statement-breakpoint
ALTER TABLE "escalations" ADD COLUMN "brief_generated_at" timestamp with time zone;