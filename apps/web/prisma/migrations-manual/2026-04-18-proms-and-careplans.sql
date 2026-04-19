-- Manual migration: PROMs (Phase 4) + ERAS CarePlans (Phase 5).
-- Idempotent: drops + recreates. Uses prisma db execute because an
-- unrelated pre-existing enum drift blocks `prisma db push`.

DROP TABLE IF EXISTS "patient_care_plan_tasks" CASCADE;
DROP TABLE IF EXISTS "patient_care_plans" CASCADE;
DROP TABLE IF EXISTS "care_plan_template_tasks" CASCADE;
DROP TABLE IF EXISTS "care_plan_templates" CASCADE;
DROP TABLE IF EXISTS "prom_responses" CASCADE;
DROP TABLE IF EXISTS "prom_questions" CASCADE;
DROP TABLE IF EXISTS "prom_instruments" CASCADE;

DROP TYPE IF EXISTS "PromDomain" CASCADE;
DROP TYPE IF EXISTS "PromResponseStatus" CASCADE;
DROP TYPE IF EXISTS "CarePlanPhase" CASCADE;
DROP TYPE IF EXISTS "CarePlanTaskStatus" CASCADE;
DROP TYPE IF EXISTS "CarePlanTaskKind" CASCADE;

CREATE TYPE "PromDomain" AS ENUM (
  'PHYSICAL_FUNCTION', 'ANXIETY', 'DEPRESSION', 'FATIGUE',
  'SLEEP_DISTURBANCE', 'SOCIAL_ROLE', 'PAIN_INTERFERENCE',
  'PAIN_INTENSITY', 'OTHER'
);

CREATE TYPE "PromResponseStatus" AS ENUM (
  'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED'
);

CREATE TYPE "CarePlanPhase" AS ENUM (
  'PRE_OP', 'INTRA_OP', 'POST_OP', 'FOLLOW_UP'
);

CREATE TYPE "CarePlanTaskStatus" AS ENUM (
  'PENDING', 'COMPLETED', 'SKIPPED', 'OVERDUE'
);

CREATE TYPE "CarePlanTaskKind" AS ENUM (
  'SYMPTOM_CHECK', 'MOBILIZATION', 'DIETARY', 'WOUND_CARE',
  'MEDICATION', 'PROM_ASSESSMENT', 'APPOINTMENT', 'EDUCATION'
);

-- ── prom_instruments ─────────────────────────────────────────────────────
CREATE TABLE "prom_instruments" (
  "id"             TEXT PRIMARY KEY,
  "slug"           TEXT UNIQUE NOT NULL,
  "name"           TEXT NOT NULL,
  "display_en"     TEXT NOT NULL,
  "display_pt"     TEXT,
  "display_es"     TEXT,
  "description"    TEXT NOT NULL,
  "version"        TEXT NOT NULL,
  "licensing_note" TEXT,
  "citation_pmid"  TEXT,
  "item_count"     INTEGER NOT NULL,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "prom_instruments_slug_idx" ON "prom_instruments"("slug");

-- ── prom_questions ───────────────────────────────────────────────────────
CREATE TABLE "prom_questions" (
  "id"               TEXT PRIMARY KEY,
  "instrument_id"    TEXT NOT NULL REFERENCES "prom_instruments"("id") ON DELETE CASCADE,
  "order_index"      INTEGER NOT NULL,
  "item_code"        TEXT NOT NULL,
  "domain"           "PromDomain" NOT NULL,
  "recall_period"    TEXT,
  "text_en"          TEXT NOT NULL,
  "text_pt"          TEXT,
  "text_es"          TEXT,
  "response_options" JSONB NOT NULL,
  "reverse_scored"   BOOLEAN NOT NULL DEFAULT false,
  UNIQUE ("instrument_id", "order_index"),
  UNIQUE ("instrument_id", "item_code")
);
CREATE INDEX "prom_questions_instrument_idx" ON "prom_questions"("instrument_id");
CREATE INDEX "prom_questions_domain_idx" ON "prom_questions"("domain");

-- ── prom_responses ───────────────────────────────────────────────────────
CREATE TABLE "prom_responses" (
  "id"                 TEXT PRIMARY KEY,
  "instrument_id"      TEXT NOT NULL REFERENCES "prom_instruments"("id"),
  "patient_id"         TEXT NOT NULL,
  "care_plan_task_id"  TEXT,
  "scheduled_for"      TIMESTAMP(3),
  "started_at"         TIMESTAMP(3),
  "completed_at"       TIMESTAMP(3),
  "answers"            JSONB,
  "domain_scores"      JSONB,
  "status"             "PromResponseStatus" NOT NULL DEFAULT 'SCHEDULED',
  "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "prom_responses_patient_idx"    ON "prom_responses"("patient_id");
CREATE INDEX "prom_responses_scheduled_idx"  ON "prom_responses"("scheduled_for");
CREATE INDEX "prom_responses_status_idx"     ON "prom_responses"("status");
CREATE INDEX "prom_responses_instrument_idx" ON "prom_responses"("instrument_id");

-- ── care_plan_templates ──────────────────────────────────────────────────
CREATE TABLE "care_plan_templates" (
  "id"              TEXT PRIMARY KEY,
  "slug"            TEXT UNIQUE NOT NULL,
  "procedure_name"  TEXT NOT NULL,
  "description"     TEXT NOT NULL,
  "protocol_source" TEXT NOT NULL,
  "citation_url"    TEXT,
  "version"         TEXT NOT NULL,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "care_plan_templates_slug_idx" ON "care_plan_templates"("slug");

-- ── care_plan_template_tasks ─────────────────────────────────────────────
CREATE TABLE "care_plan_template_tasks" (
  "id"                   TEXT PRIMARY KEY,
  "template_id"          TEXT NOT NULL REFERENCES "care_plan_templates"("id") ON DELETE CASCADE,
  "order_index"          INTEGER NOT NULL,
  "phase"                "CarePlanPhase" NOT NULL,
  "day_offset"           INTEGER NOT NULL,
  "kind"                 "CarePlanTaskKind" NOT NULL,
  "title"                TEXT NOT NULL,
  "instructions"         TEXT NOT NULL,
  "prom_instrument_slug" TEXT,
  UNIQUE ("template_id", "order_index")
);
CREATE INDEX "care_plan_template_tasks_template_idx" ON "care_plan_template_tasks"("template_id");
CREATE INDEX "care_plan_template_tasks_phase_idx"    ON "care_plan_template_tasks"("phase");
CREATE INDEX "care_plan_template_tasks_kind_idx"     ON "care_plan_template_tasks"("kind");

-- ── patient_care_plans ───────────────────────────────────────────────────
CREATE TABLE "patient_care_plans" (
  "id"                        TEXT PRIMARY KEY,
  "template_id"               TEXT NOT NULL REFERENCES "care_plan_templates"("id"),
  "patient_id"                TEXT NOT NULL,
  "index_date"                TIMESTAMP(3) NOT NULL,
  "assigned_by_physician_id"  TEXT,
  "active"                    BOOLEAN NOT NULL DEFAULT true,
  "created_at"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "patient_care_plans_patient_idx"  ON "patient_care_plans"("patient_id");
CREATE INDEX "patient_care_plans_index_idx"    ON "patient_care_plans"("index_date");
CREATE INDEX "patient_care_plans_active_idx"   ON "patient_care_plans"("active");

-- ── patient_care_plan_tasks ──────────────────────────────────────────────
CREATE TABLE "patient_care_plan_tasks" (
  "id"               TEXT PRIMARY KEY,
  "care_plan_id"     TEXT NOT NULL REFERENCES "patient_care_plans"("id") ON DELETE CASCADE,
  "template_task_id" TEXT NOT NULL,
  "scheduled_for"    TIMESTAMP(3) NOT NULL,
  "phase"            "CarePlanPhase" NOT NULL,
  "kind"             "CarePlanTaskKind" NOT NULL,
  "title"            TEXT NOT NULL,
  "instructions"     TEXT NOT NULL,
  "status"           "CarePlanTaskStatus" NOT NULL DEFAULT 'PENDING',
  "completed_at"     TIMESTAMP(3),
  "notes"            TEXT,
  "prom_response_id" TEXT UNIQUE,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "patient_care_plan_tasks_careplan_idx"  ON "patient_care_plan_tasks"("care_plan_id");
CREATE INDEX "patient_care_plan_tasks_scheduled_idx" ON "patient_care_plan_tasks"("scheduled_for");
CREATE INDEX "patient_care_plan_tasks_status_idx"    ON "patient_care_plan_tasks"("status");
CREATE INDEX "patient_care_plan_tasks_kind_idx"      ON "patient_care_plan_tasks"("kind");
