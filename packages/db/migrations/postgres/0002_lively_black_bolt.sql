CREATE TABLE IF NOT EXISTS "company_churn" (
	"company_id" text PRIMARY KEY NOT NULL,
	"score" double precision DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'green' NOT NULL,
	"reason" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_signals" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"source" text NOT NULL,
	"type" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"value" double precision,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "escalations" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"status" text NOT NULL,
	"score" double precision NOT NULL,
	"reason" text,
	"acked" boolean DEFAULT false NOT NULL,
	"acked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
