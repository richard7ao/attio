CREATE TABLE IF NOT EXISTS "attio_companies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"domain" text,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attio_customer_success" (
	"entry_id" text PRIMARY KEY NOT NULL,
	"company_id" text,
	"stage" text,
	"onboarding_stage" text,
	"primary_csm_actor_id" text,
	"arr" double precision,
	"arr_currency" text,
	"health" text,
	"notes" text,
	"created_at" timestamp with time zone,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attio_people" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"company_id" text,
	"job_title" text,
	"phone" text,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attio_won_contracts" (
	"entry_id" text PRIMARY KEY NOT NULL,
	"company_id" text,
	"contact_id" text,
	"owner_actor_id" text,
	"estimated_contract_value" double precision,
	"currency_code" text,
	"priority" text,
	"projected_close_date" text,
	"won_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attio_customer_success" ADD CONSTRAINT "attio_customer_success_company_id_attio_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."attio_companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attio_people" ADD CONSTRAINT "attio_people_company_id_attio_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."attio_companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attio_won_contracts" ADD CONSTRAINT "attio_won_contracts_company_id_attio_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."attio_companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attio_won_contracts" ADD CONSTRAINT "attio_won_contracts_contact_id_attio_people_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."attio_people"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
