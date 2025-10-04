-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CLINICIAN', 'NURSE', 'STAFF');

-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('PENDING', 'SIGNED', 'SENT', 'FILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('GENERAL_CONSULTATION', 'TELEHEALTH', 'DATA_RESEARCH', 'SURGERY', 'PROCEDURE', 'PHOTOGRAPHY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('IN_PERSON', 'TELEHEALTH', 'PHONE', 'HOME_VISIT');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('LAB_RESULTS', 'IMAGING', 'CONSULTATION_NOTES', 'DISCHARGE_SUMMARY', 'PRESCRIPTION', 'INSURANCE', 'CONSENT_FORM', 'OTHER');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'UPLOADING', 'PROCESSING', 'DEIDENTIFYING', 'EXTRACTING', 'SYNCHRONIZED', 'FAILED');

-- CreateEnum
CREATE TYPE "NoteType" AS ENUM ('PROGRESS', 'CONSULTATION', 'ADMISSION', 'DISCHARGE', 'PROCEDURE', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'PRINT', 'DEIDENTIFY', 'REIDENTIFY', 'PRESCRIBE', 'SIGN', 'REVOKE');

-- CreateEnum
CREATE TYPE "TxStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'REVERTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "supabaseId" TEXT,
    "walletAddress" TEXT,
    "publicKey" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CLINICIAN',
    "specialty" TEXT,
    "licenseNumber" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "blockchainId" TEXT,
    "dataHash" TEXT,
    "lastHashUpdate" TIMESTAMP(3),
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'MX',
    "mrn" TEXT NOT NULL,
    "externalMrn" TEXT,
    "tokenId" TEXT NOT NULL,
    "ageBand" TEXT,
    "region" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedClinicianId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medications" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "prescriptionHash" TEXT,
    "name" TEXT NOT NULL,
    "genericName" TEXT,
    "dose" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "route" TEXT,
    "instructions" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "prescribedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "prescriptionHash" TEXT NOT NULL,
    "txHash" TEXT,
    "blockTimestamp" TIMESTAMP(3),
    "medications" JSONB NOT NULL,
    "instructions" TEXT,
    "diagnosis" TEXT,
    "signatureMethod" TEXT NOT NULL,
    "signatureData" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "PrescriptionStatus" NOT NULL DEFAULT 'PENDING',
    "sentToPharmacy" BOOLEAN NOT NULL DEFAULT false,
    "pharmacyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "consentHash" TEXT NOT NULL,
    "txHash" TEXT,
    "blockTimestamp" TIMESTAMP(3),
    "type" "ConsentType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "signatureData" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL,
    "witnessName" TEXT,
    "witnessSignature" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Mexico_City',
    "googleEventId" TEXT,
    "outlookEventId" TEXT,
    "calendarSyncedAt" TIMESTAMP(3),
    "type" "AppointmentType" NOT NULL DEFAULT 'IN_PERSON',
    "meetingUrl" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "documentHash" TEXT NOT NULL,
    "deidentifiedHash" TEXT,
    "txHash" TEXT,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "originalStorageUrl" TEXT,
    "documentType" "DocumentType" NOT NULL,
    "ocrText" TEXT,
    "entities" JSONB,
    "isDeidentified" BOOLEAN NOT NULL DEFAULT false,
    "phiDetected" INTEGER NOT NULL DEFAULT 0,
    "deidentifiedAt" TIMESTAMP(3),
    "uploadedBy" TEXT,
    "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_notes" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "noteHash" TEXT NOT NULL,
    "txHash" TEXT,
    "type" "NoteType" NOT NULL DEFAULT 'PROGRESS',
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "chiefComplaint" TEXT,
    "diagnosis" TEXT[],
    "authorId" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_maps" (
    "id" TEXT NOT NULL,
    "encryptedMap" TEXT NOT NULL,
    "mapHash" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_maps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "action" "AuditAction" NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "details" JSONB,
    "dataHash" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blockchain_transactions" (
    "id" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "blockNumber" BIGINT,
    "network" TEXT NOT NULL DEFAULT 'polygon-mainnet',
    "recordType" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "dataHash" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "functionCalled" TEXT NOT NULL,
    "gasUsed" BIGINT,
    "gasCost" TEXT,
    "status" "TxStatus" NOT NULL DEFAULT 'PENDING',
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "blockchain_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_supabaseId_key" ON "users"("supabaseId");

-- CreateIndex
CREATE UNIQUE INDEX "users_walletAddress_key" ON "users"("walletAddress");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_walletAddress_idx" ON "users"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "patients_blockchainId_key" ON "patients"("blockchainId");

-- CreateIndex
CREATE UNIQUE INDEX "patients_mrn_key" ON "patients"("mrn");

-- CreateIndex
CREATE UNIQUE INDEX "patients_tokenId_key" ON "patients"("tokenId");

-- CreateIndex
CREATE INDEX "patients_mrn_idx" ON "patients"("mrn");

-- CreateIndex
CREATE INDEX "patients_tokenId_idx" ON "patients"("tokenId");

-- CreateIndex
CREATE INDEX "patients_blockchainId_idx" ON "patients"("blockchainId");

-- CreateIndex
CREATE INDEX "patients_assignedClinicianId_idx" ON "patients"("assignedClinicianId");

-- CreateIndex
CREATE INDEX "medications_patientId_idx" ON "medications"("patientId");

-- CreateIndex
CREATE INDEX "medications_isActive_idx" ON "medications"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_prescriptionHash_key" ON "prescriptions"("prescriptionHash");

-- CreateIndex
CREATE INDEX "prescriptions_patientId_idx" ON "prescriptions"("patientId");

-- CreateIndex
CREATE INDEX "prescriptions_clinicianId_idx" ON "prescriptions"("clinicianId");

-- CreateIndex
CREATE INDEX "prescriptions_prescriptionHash_idx" ON "prescriptions"("prescriptionHash");

-- CreateIndex
CREATE INDEX "prescriptions_txHash_idx" ON "prescriptions"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "consents_consentHash_key" ON "consents"("consentHash");

-- CreateIndex
CREATE INDEX "consents_patientId_idx" ON "consents"("patientId");

-- CreateIndex
CREATE INDEX "consents_consentHash_idx" ON "consents"("consentHash");

-- CreateIndex
CREATE INDEX "consents_txHash_idx" ON "consents"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_googleEventId_key" ON "appointments"("googleEventId");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_outlookEventId_key" ON "appointments"("outlookEventId");

-- CreateIndex
CREATE INDEX "appointments_patientId_idx" ON "appointments"("patientId");

-- CreateIndex
CREATE INDEX "appointments_clinicianId_idx" ON "appointments"("clinicianId");

-- CreateIndex
CREATE INDEX "appointments_startTime_idx" ON "appointments"("startTime");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "documents_documentHash_key" ON "documents"("documentHash");

-- CreateIndex
CREATE INDEX "documents_patientId_idx" ON "documents"("patientId");

-- CreateIndex
CREATE INDEX "documents_documentHash_idx" ON "documents"("documentHash");

-- CreateIndex
CREATE INDEX "documents_processingStatus_idx" ON "documents"("processingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_notes_noteHash_key" ON "clinical_notes"("noteHash");

-- CreateIndex
CREATE INDEX "clinical_notes_patientId_idx" ON "clinical_notes"("patientId");

-- CreateIndex
CREATE INDEX "clinical_notes_authorId_idx" ON "clinical_notes"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "token_maps_mapHash_key" ON "token_maps"("mapHash");

-- CreateIndex
CREATE INDEX "token_maps_recordId_idx" ON "token_maps"("recordId");

-- CreateIndex
CREATE INDEX "token_maps_mapHash_idx" ON "token_maps"("mapHash");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_resourceId_idx" ON "audit_logs"("resourceId");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "blockchain_transactions_txHash_key" ON "blockchain_transactions"("txHash");

-- CreateIndex
CREATE INDEX "blockchain_transactions_txHash_idx" ON "blockchain_transactions"("txHash");

-- CreateIndex
CREATE INDEX "blockchain_transactions_recordId_idx" ON "blockchain_transactions"("recordId");

-- CreateIndex
CREATE INDEX "blockchain_transactions_status_idx" ON "blockchain_transactions"("status");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_assignedClinicianId_fkey" FOREIGN KEY ("assignedClinicianId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
