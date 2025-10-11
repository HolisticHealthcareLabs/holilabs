-- CreateEnum
CREATE TYPE "OTPChannel" AS ENUM ('SMS', 'EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('CLINICIAN', 'PATIENT');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('WEIGHT', 'HEIGHT', 'BLOOD_PRESSURE', 'HEART_RATE', 'TEMPERATURE', 'BLOOD_GLUCOSE', 'OXYGEN_SATURATION', 'STEPS', 'SLEEP_HOURS', 'PAIN_LEVEL', 'MOOD', 'MEDICATION_ADHERENCE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MetricSource" AS ENUM ('PATIENT_MANUAL', 'CLINICIAN_MEASURED', 'DEVICE_SYNC', 'SMART_SCALE', 'FITNESS_TRACKER', 'BLOOD_PRESSURE_MONITOR', 'GLUCOMETER', 'APPLE_HEALTH', 'GOOGLE_FIT');

-- CreateEnum
CREATE TYPE "ShareableType" AS ENUM ('SOAP_NOTE', 'PRESCRIPTION', 'LAB_RESULT', 'IMAGING', 'DOCUMENT', 'MEDICAL_RECORD_BUNDLE');

-- CreateTable
CREATE TABLE "patient_users" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "phoneVerifiedAt" TIMESTAMP(3),
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "loginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "magic_links" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "magic_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "sentVia" "OTPChannel" NOT NULL DEFAULT 'SMS',
    "recipientPhone" TEXT,
    "recipientEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "fromUserType" "UserType" NOT NULL,
    "toUserId" TEXT NOT NULL,
    "toUserType" "UserType" NOT NULL,
    "patientId" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "attachments" JSONB,
    "parentMessageId" TEXT,
    "readAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_metrics" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "metricType" "MetricType" NOT NULL,
    "value" JSONB NOT NULL,
    "unit" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "source" "MetricSource" NOT NULL DEFAULT 'PATIENT_MANUAL',
    "deviceName" TEXT,
    "notes" TEXT,
    "tags" TEXT[],
    "isOutOfRange" BOOLEAN NOT NULL DEFAULT false,
    "flaggedForReview" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_shares" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "documentType" "ShareableType" NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentIds" TEXT[],
    "shareToken" TEXT NOT NULL,
    "shareTokenHash" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "recipientName" TEXT,
    "purpose" TEXT,
    "expiresAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "maxAccesses" INTEGER,
    "accessedAt" TIMESTAMP(3),
    "lastAccessedAt" TIMESTAMP(3),
    "accessIpAddresses" TEXT[],
    "allowDownload" BOOLEAN NOT NULL DEFAULT true,
    "requirePassword" BOOLEAN NOT NULL DEFAULT false,
    "passwordHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patient_users_patientId_key" ON "patient_users"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_users_email_key" ON "patient_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "patient_users_phone_key" ON "patient_users"("phone");

-- CreateIndex
CREATE INDEX "patient_users_email_idx" ON "patient_users"("email");

-- CreateIndex
CREATE INDEX "patient_users_phone_idx" ON "patient_users"("phone");

-- CreateIndex
CREATE INDEX "patient_users_patientId_idx" ON "patient_users"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "magic_links_token_key" ON "magic_links"("token");

-- CreateIndex
CREATE UNIQUE INDEX "magic_links_tokenHash_key" ON "magic_links"("tokenHash");

-- CreateIndex
CREATE INDEX "magic_links_token_idx" ON "magic_links"("token");

-- CreateIndex
CREATE INDEX "magic_links_tokenHash_idx" ON "magic_links"("tokenHash");

-- CreateIndex
CREATE INDEX "magic_links_patientUserId_idx" ON "magic_links"("patientUserId");

-- CreateIndex
CREATE INDEX "magic_links_expiresAt_idx" ON "magic_links"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "otp_codes_codeHash_key" ON "otp_codes"("codeHash");

-- CreateIndex
CREATE INDEX "otp_codes_codeHash_idx" ON "otp_codes"("codeHash");

-- CreateIndex
CREATE INDEX "otp_codes_patientUserId_idx" ON "otp_codes"("patientUserId");

-- CreateIndex
CREATE INDEX "otp_codes_expiresAt_idx" ON "otp_codes"("expiresAt");

-- CreateIndex
CREATE INDEX "messages_fromUserId_idx" ON "messages"("fromUserId");

-- CreateIndex
CREATE INDEX "messages_toUserId_idx" ON "messages"("toUserId");

-- CreateIndex
CREATE INDEX "messages_patientId_idx" ON "messages"("patientId");

-- CreateIndex
CREATE INDEX "messages_readAt_idx" ON "messages"("readAt");

-- CreateIndex
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt");

-- CreateIndex
CREATE INDEX "health_metrics_patientId_idx" ON "health_metrics"("patientId");

-- CreateIndex
CREATE INDEX "health_metrics_metricType_idx" ON "health_metrics"("metricType");

-- CreateIndex
CREATE INDEX "health_metrics_recordedAt_idx" ON "health_metrics"("recordedAt");

-- CreateIndex
CREATE INDEX "health_metrics_flaggedForReview_idx" ON "health_metrics"("flaggedForReview");

-- CreateIndex
CREATE UNIQUE INDEX "document_shares_shareToken_key" ON "document_shares"("shareToken");

-- CreateIndex
CREATE UNIQUE INDEX "document_shares_shareTokenHash_key" ON "document_shares"("shareTokenHash");

-- CreateIndex
CREATE INDEX "document_shares_shareToken_idx" ON "document_shares"("shareToken");

-- CreateIndex
CREATE INDEX "document_shares_shareTokenHash_idx" ON "document_shares"("shareTokenHash");

-- CreateIndex
CREATE INDEX "document_shares_patientId_idx" ON "document_shares"("patientId");

-- CreateIndex
CREATE INDEX "document_shares_expiresAt_idx" ON "document_shares"("expiresAt");

-- CreateIndex
CREATE INDEX "document_shares_isActive_idx" ON "document_shares"("isActive");

-- AddForeignKey
ALTER TABLE "patient_users" ADD CONSTRAINT "patient_users_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "magic_links" ADD CONSTRAINT "magic_links_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "patient_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "patient_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_parentMessageId_fkey" FOREIGN KEY ("parentMessageId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_metrics" ADD CONSTRAINT "health_metrics_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_shares" ADD CONSTRAINT "document_shares_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
