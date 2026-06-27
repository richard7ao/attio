-- WF-4 churn-rescue tables: account_plans + churn_rescue_queue.
-- Source of truth for the n8n WF-4 "Churn Rescue Action" workflow.

CREATE TABLE IF NOT EXISTS "account_plans" (
  "id"                 uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id"         text NOT NULL,
  "executive_summary"  text,
  "risk_factors"       jsonb DEFAULT '[]'::jsonb,
  "account_plan"       jsonb DEFAULT '[]'::jsonb,
  "call_script"        text,
  "objection_handling" jsonb DEFAULT '[]'::jsonb,
  "email_draft"        text,
  "success_metric"     text,
  "priority"           text CHECK (priority IN ('high', 'medium', 'low')),
  "generated_at"       timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS account_plans_account_idx ON "account_plans" ("account_id");

CREATE TABLE IF NOT EXISTS "churn_rescue_queue" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id"      text NOT NULL,
  "company_name"    text,
  "arr"             double precision,
  "rag_status"      text,
  "priority"        text CHECK (priority IN ('high', 'medium', 'low')),
  "days_to_renewal" integer,
  "usage_latest"    double precision,
  "last_contact"    text,
  "plan_id"         uuid REFERENCES "account_plans"("id") ON DELETE SET NULL,
  "status"          text DEFAULT 'pending' NOT NULL
                    CHECK (status IN ('pending', 'in_progress', 'resolved', 'dismissed')),
  "created_at"      timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at"      timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT churn_rescue_queue_account_id_unique UNIQUE ("account_id")
);

CREATE INDEX IF NOT EXISTS churn_rescue_queue_status_idx ON "churn_rescue_queue" ("status");
CREATE INDEX IF NOT EXISTS churn_rescue_queue_priority_idx ON "churn_rescue_queue" ("priority");
