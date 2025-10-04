-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "audit";

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('CLINICIAN', 'RESEARCHER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."ConsentState" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."ConsentPurpose" AS ENUM ('CARE', 'RESEARCH', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."ExportStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'COMPLETED');

-- CreateTable
CREATE TABLE "public"."orgs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country_code" VARCHAR(2) NOT NULL,
    "dp_epsilon_budget" DECIMAL(10,6) NOT NULL DEFAULT 10.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orgs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "org_id" TEXT NOT NULL,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."patient_tokens" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "pointer_hash" TEXT NOT NULL,
    "storage_uri" TEXT,
    "policy_version" TEXT NOT NULL,
    "consent_state" "public"."ConsentState" NOT NULL DEFAULT 'ACTIVE',
    "record_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subject_indices" (
    "id" TEXT NOT NULL,
    "patient_token_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subject_indices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."datasets" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "patient_token_id" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "policy_version" TEXT NOT NULL,
    "dp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "dp_epsilon" DECIMAL(10,6),
    "dp_delta" DECIMAL(20,10),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "datasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit"."audit_events" (
    "id" BIGSERIAL NOT NULL,
    "ts" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "org_id" TEXT NOT NULL,
    "user_id" TEXT,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "prev_hash" BYTEA,
    "row_hash" BYTEA NOT NULL,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."consents" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "patient_token_id" TEXT NOT NULL,
    "purpose" "public"."ConsentPurpose" NOT NULL,
    "data_classes" TEXT[],
    "retention_days" INTEGER NOT NULL,
    "state" "public"."ConsentState" NOT NULL,
    "policy_ref" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."export_requests" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "dataset_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "patient_token_id" TEXT NOT NULL,
    "epsilon" DECIMAL(10,6) NOT NULL,
    "delta" DECIMAL(20,10) NOT NULL,
    "status" "public"."ExportStatus" NOT NULL DEFAULT 'PENDING',
    "receipt_hash" BYTEA,
    "cooldown_until" TIMESTAMPTZ,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "export_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."model_runs" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "dataset_id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "model_hash" TEXT NOT NULL,
    "guardrail_log" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_org_id_idx" ON "public"."users"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_tokens_pointer_hash_key" ON "public"."patient_tokens"("pointer_hash");

-- CreateIndex
CREATE INDEX "patient_tokens_org_id_idx" ON "public"."patient_tokens"("org_id");

-- CreateIndex
CREATE INDEX "patient_tokens_pointer_hash_idx" ON "public"."patient_tokens"("pointer_hash");

-- CreateIndex
CREATE INDEX "subject_indices_org_id_idx" ON "public"."subject_indices"("org_id");

-- CreateIndex
CREATE INDEX "subject_indices_patient_token_id_idx" ON "public"."subject_indices"("patient_token_id");

-- CreateIndex
CREATE INDEX "datasets_org_id_idx" ON "public"."datasets"("org_id");

-- CreateIndex
CREATE INDEX "datasets_patient_token_id_idx" ON "public"."datasets"("patient_token_id");

-- CreateIndex
CREATE INDEX "datasets_sha256_idx" ON "public"."datasets"("sha256");

-- CreateIndex
CREATE INDEX "audit_events_org_id_idx" ON "audit"."audit_events"("org_id");

-- CreateIndex
CREATE INDEX "audit_events_event_type_idx" ON "audit"."audit_events"("event_type");

-- CreateIndex
CREATE INDEX "audit_events_ts_idx" ON "audit"."audit_events"("ts");

-- CreateIndex
CREATE INDEX "consents_org_id_idx" ON "public"."consents"("org_id");

-- CreateIndex
CREATE INDEX "consents_patient_token_id_idx" ON "public"."consents"("patient_token_id");

-- CreateIndex
CREATE INDEX "consents_purpose_idx" ON "public"."consents"("purpose");

-- CreateIndex
CREATE INDEX "export_requests_org_id_idx" ON "public"."export_requests"("org_id");

-- CreateIndex
CREATE INDEX "export_requests_dataset_id_idx" ON "public"."export_requests"("dataset_id");

-- CreateIndex
CREATE INDEX "export_requests_subject_id_idx" ON "public"."export_requests"("subject_id");

-- CreateIndex
CREATE INDEX "export_requests_patient_token_id_idx" ON "public"."export_requests"("patient_token_id");

-- CreateIndex
CREATE INDEX "export_requests_status_idx" ON "public"."export_requests"("status");

-- CreateIndex
CREATE INDEX "model_runs_org_id_idx" ON "public"."model_runs"("org_id");

-- CreateIndex
CREATE INDEX "model_runs_dataset_id_idx" ON "public"."model_runs"("dataset_id");

-- CreateIndex
CREATE INDEX "model_runs_model_id_idx" ON "public"."model_runs"("model_id");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_tokens" ADD CONSTRAINT "patient_tokens_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subject_indices" ADD CONSTRAINT "subject_indices_patient_token_id_fkey" FOREIGN KEY ("patient_token_id") REFERENCES "public"."patient_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subject_indices" ADD CONSTRAINT "subject_indices_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."datasets" ADD CONSTRAINT "datasets_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."datasets" ADD CONSTRAINT "datasets_patient_token_id_fkey" FOREIGN KEY ("patient_token_id") REFERENCES "public"."patient_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit"."audit_events" ADD CONSTRAINT "audit_events_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit"."audit_events" ADD CONSTRAINT "audit_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."consents" ADD CONSTRAINT "consents_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."consents" ADD CONSTRAINT "consents_patient_token_id_fkey" FOREIGN KEY ("patient_token_id") REFERENCES "public"."patient_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."export_requests" ADD CONSTRAINT "export_requests_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."export_requests" ADD CONSTRAINT "export_requests_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."export_requests" ADD CONSTRAINT "export_requests_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subject_indices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."export_requests" ADD CONSTRAINT "export_requests_patient_token_id_fkey" FOREIGN KEY ("patient_token_id") REFERENCES "public"."patient_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."model_runs" ADD CONSTRAINT "model_runs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."model_runs" ADD CONSTRAINT "model_runs_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
