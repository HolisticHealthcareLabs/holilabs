-- CreateEnum
CREATE TYPE "ScribeStatus" AS ENUM ('RECORDING', 'PAUSED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SOAPStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'SIGNED', 'AMENDED', 'ADDENDUM');

-- DropIndex
DROP INDEX "appointments_clinicianId_startTime_idx";

-- DropIndex
DROP INDEX "appointments_patientId_startTime_idx";

-- DropIndex
DROP INDEX "appointments_startTime_endTime_idx";

-- DropIndex
DROP INDEX "appointments_status_startTime_idx";

-- DropIndex
DROP INDEX "audit_logs_resourceId_timestamp_idx";

-- DropIndex
DROP INDEX "audit_logs_timestamp_action_idx";

-- DropIndex
DROP INDEX "audit_logs_userId_timestamp_idx";

-- DropIndex
DROP INDEX "blockchain_transactions_recordType_recordId_idx";

-- DropIndex
DROP INDEX "blockchain_transactions_submittedAt_idx";

-- DropIndex
DROP INDEX "calendar_integrations_lastSyncAt_idx";

-- DropIndex
DROP INDEX "calendar_integrations_syncEnabled_idx";

-- DropIndex
DROP INDEX "calendar_integrations_tokenExpiresAt_idx";

-- DropIndex
DROP INDEX "clinical_notes_authorId_createdAt_idx";

-- DropIndex
DROP INDEX "clinical_notes_createdAt_idx";

-- DropIndex
DROP INDEX "clinical_notes_patientId_createdAt_idx";

-- DropIndex
DROP INDEX "clinical_notes_signedAt_idx";

-- DropIndex
DROP INDEX "clinical_notes_type_idx";

-- DropIndex
DROP INDEX "consents_isActive_idx";

-- DropIndex
DROP INDEX "consents_patientId_isActive_type_idx";

-- DropIndex
DROP INDEX "consents_revokedAt_idx";

-- DropIndex
DROP INDEX "consents_signedAt_idx";

-- DropIndex
DROP INDEX "consents_type_idx";

-- DropIndex
DROP INDEX "documents_createdAt_idx";

-- DropIndex
DROP INDEX "documents_documentType_idx";

-- DropIndex
DROP INDEX "documents_isDeidentified_idx";

-- DropIndex
DROP INDEX "documents_patientId_documentType_idx";

-- DropIndex
DROP INDEX "documents_processingStatus_documentType_idx";

-- DropIndex
DROP INDEX "medications_endDate_idx";

-- DropIndex
DROP INDEX "medications_name_idx";

-- DropIndex
DROP INDEX "medications_patientId_isActive_idx";

-- DropIndex
DROP INDEX "medications_startDate_idx";

-- DropIndex
DROP INDEX "patients_assignedClinicianId_isActive_idx";

-- DropIndex
DROP INDEX "patients_createdAt_idx";

-- DropIndex
DROP INDEX "patients_email_idx";

-- DropIndex
DROP INDEX "patients_isActive_idx";

-- DropIndex
DROP INDEX "patients_phone_idx";

-- DropIndex
DROP INDEX "prescriptions_createdAt_idx";

-- DropIndex
DROP INDEX "prescriptions_patientId_status_idx";

-- DropIndex
DROP INDEX "prescriptions_sentToPharmacy_idx";

-- DropIndex
DROP INDEX "prescriptions_status_idx";

-- DropIndex
DROP INDEX "token_maps_expiresAt_idx";

-- DropIndex
DROP INDEX "token_maps_lastAccessedAt_idx";

-- DropIndex
DROP INDEX "token_maps_recordType_idx";

-- DropIndex
DROP INDEX "users_lastLoginAt_idx";

-- DropIndex
DROP INDEX "users_mfaEnabled_idx";

-- DropIndex
DROP INDEX "users_role_idx";

-- DropIndex
DROP INDEX "users_role_specialty_idx";

-- CreateTable
CREATE TABLE "scribe_sessions" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "audioFileUrl" TEXT,
    "audioFileName" TEXT,
    "audioDuration" INTEGER NOT NULL DEFAULT 0,
    "audioFormat" TEXT NOT NULL DEFAULT 'webm',
    "audioSize" INTEGER,
    "status" "ScribeStatus" NOT NULL DEFAULT 'RECORDING',
    "processingStartedAt" TIMESTAMP(3),
    "processingCompletedAt" TIMESTAMP(3),
    "processingError" TEXT,
    "transcriptionModel" TEXT DEFAULT 'whisper-1',
    "soapModel" TEXT DEFAULT 'claude-3-5-sonnet-20250219',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scribe_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcriptions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "segments" JSONB NOT NULL,
    "speakerCount" INTEGER NOT NULL DEFAULT 2,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "durationSeconds" INTEGER NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'whisper-1',
    "language" TEXT NOT NULL DEFAULT 'es',
    "processingTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transcriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "soap_notes" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "noteHash" TEXT NOT NULL,
    "txHash" TEXT,
    "subjective" TEXT NOT NULL,
    "subjectiveConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "objective" TEXT NOT NULL,
    "objectiveConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "assessment" TEXT NOT NULL,
    "assessmentConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "plan" TEXT NOT NULL,
    "planConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "chiefComplaint" TEXT,
    "vitalSigns" JSONB,
    "diagnoses" JSONB NOT NULL,
    "procedures" JSONB,
    "medications" JSONB,
    "overallConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wasEdited" BOOLEAN NOT NULL DEFAULT false,
    "editCount" INTEGER NOT NULL DEFAULT 0,
    "editHistory" JSONB,
    "signedAt" TIMESTAMP(3),
    "signedBy" TEXT,
    "signatureMethod" TEXT,
    "model" TEXT NOT NULL DEFAULT 'claude-3-5-sonnet-20250219',
    "tokensUsed" INTEGER,
    "processingTime" INTEGER,
    "status" "SOAPStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "soap_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scribe_sessions_patientId_idx" ON "scribe_sessions"("patientId");

-- CreateIndex
CREATE INDEX "scribe_sessions_clinicianId_idx" ON "scribe_sessions"("clinicianId");

-- CreateIndex
CREATE INDEX "scribe_sessions_status_idx" ON "scribe_sessions"("status");

-- CreateIndex
CREATE INDEX "scribe_sessions_createdAt_idx" ON "scribe_sessions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "transcriptions_sessionId_key" ON "transcriptions"("sessionId");

-- CreateIndex
CREATE INDEX "transcriptions_sessionId_idx" ON "transcriptions"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "soap_notes_sessionId_key" ON "soap_notes"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "soap_notes_noteHash_key" ON "soap_notes"("noteHash");

-- CreateIndex
CREATE INDEX "soap_notes_patientId_idx" ON "soap_notes"("patientId");

-- CreateIndex
CREATE INDEX "soap_notes_clinicianId_idx" ON "soap_notes"("clinicianId");

-- CreateIndex
CREATE INDEX "soap_notes_sessionId_idx" ON "soap_notes"("sessionId");

-- CreateIndex
CREATE INDEX "soap_notes_status_idx" ON "soap_notes"("status");

-- CreateIndex
CREATE INDEX "soap_notes_createdAt_idx" ON "soap_notes"("createdAt");

-- AddForeignKey
ALTER TABLE "scribe_sessions" ADD CONSTRAINT "scribe_sessions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scribe_sessions" ADD CONSTRAINT "scribe_sessions_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scribe_sessions" ADD CONSTRAINT "scribe_sessions_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcriptions" ADD CONSTRAINT "transcriptions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "scribe_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soap_notes" ADD CONSTRAINT "soap_notes_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "scribe_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soap_notes" ADD CONSTRAINT "soap_notes_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soap_notes" ADD CONSTRAINT "soap_notes_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
