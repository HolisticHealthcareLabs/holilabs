-- CreateEnum
CREATE TYPE "FormCategory" AS ENUM ('CONSENT', 'HIPAA_AUTHORIZATION', 'MEDICAL_HISTORY', 'TREATMENT_CONSENT', 'FINANCIAL_AGREEMENT', 'INSURANCE_INFORMATION', 'REFERRAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "FormStatus" AS ENUM ('PENDING', 'VIEWED', 'IN_PROGRESS', 'COMPLETED', 'SIGNED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "FormAuditEvent" AS ENUM ('SENT', 'VIEWED', 'STARTED', 'PROGRESS_SAVED', 'SUBMITTED', 'SIGNED', 'REMINDER_SENT', 'EXPIRED', 'REVOKED', 'UPDATED', 'DOWNLOADED');

-- AlterTable
ALTER TABLE "scribe_sessions" ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "form_templates" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "FormCategory" NOT NULL,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "structure" JSONB,
    "fileUrl" TEXT,
    "fileType" TEXT,
    "createdBy" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tags" TEXT[],
    "estimatedMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_instances" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "status" "FormStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "responses" JSONB,
    "submittedData" JSONB,
    "signatureDataUrl" TEXT,
    "signatureIp" TEXT,
    "signedUserAgent" TEXT,
    "attachments" TEXT[],
    "accessToken" TEXT NOT NULL,
    "accessTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "remindersSent" INTEGER NOT NULL DEFAULT 0,
    "lastReminderAt" TIMESTAMP(3),
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "currentStepIndex" INTEGER NOT NULL DEFAULT 0,
    "dataHash" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_audit_logs" (
    "id" TEXT NOT NULL,
    "formInstanceId" TEXT NOT NULL,
    "event" "FormAuditEvent" NOT NULL,
    "description" TEXT,
    "userId" TEXT,
    "userType" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "form_templates_category_idx" ON "form_templates"("category");

-- CreateIndex
CREATE INDEX "form_templates_isBuiltIn_idx" ON "form_templates"("isBuiltIn");

-- CreateIndex
CREATE INDEX "form_templates_isActive_idx" ON "form_templates"("isActive");

-- CreateIndex
CREATE INDEX "form_templates_createdBy_idx" ON "form_templates"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "form_instances_accessToken_key" ON "form_instances"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "form_instances_accessTokenHash_key" ON "form_instances"("accessTokenHash");

-- CreateIndex
CREATE INDEX "form_instances_patientId_idx" ON "form_instances"("patientId");

-- CreateIndex
CREATE INDEX "form_instances_assignedBy_idx" ON "form_instances"("assignedBy");

-- CreateIndex
CREATE INDEX "form_instances_status_idx" ON "form_instances"("status");

-- CreateIndex
CREATE INDEX "form_instances_accessToken_idx" ON "form_instances"("accessToken");

-- CreateIndex
CREATE INDEX "form_instances_accessTokenHash_idx" ON "form_instances"("accessTokenHash");

-- CreateIndex
CREATE INDEX "form_instances_completedAt_idx" ON "form_instances"("completedAt");

-- CreateIndex
CREATE INDEX "form_audit_logs_formInstanceId_idx" ON "form_audit_logs"("formInstanceId");

-- CreateIndex
CREATE INDEX "form_audit_logs_event_idx" ON "form_audit_logs"("event");

-- CreateIndex
CREATE INDEX "form_audit_logs_createdAt_idx" ON "form_audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "form_templates" ADD CONSTRAINT "form_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "form_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_audit_logs" ADD CONSTRAINT "form_audit_logs_formInstanceId_fkey" FOREIGN KEY ("formInstanceId") REFERENCES "form_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
