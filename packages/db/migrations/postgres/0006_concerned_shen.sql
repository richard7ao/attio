CREATE TABLE IF NOT EXISTS "communications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"action_id" text,
	"channel" text NOT NULL,
	"direction" text DEFAULT 'outbound' NOT NULL,
	"status" text DEFAULT 'initiated' NOT NULL,
	"call_sid" text,
	"duration_sec" integer,
	"summary" text,
	"sentiment" text,
	"transcript" text,
	"outcome" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"logged_at" timestamp with time zone DEFAULT now() NOT NULL
);
