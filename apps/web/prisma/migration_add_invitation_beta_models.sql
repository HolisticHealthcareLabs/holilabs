-- Migration: Add InvitationCode, BetaSignup, and SignupCounter models
-- Run this SQL manually when the database is available

-- Create invitation_codes table
CREATE TABLE IF NOT EXISTS "invitation_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitation_codes_pkey" PRIMARY KEY ("id")
);

-- Create beta_signups table
CREATE TABLE IF NOT EXISTS "beta_signups" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "organization" TEXT,
    "role" TEXT,
    "country" TEXT,
    "referralSource" TEXT,
    "interests" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "emailsSent" INTEGER NOT NULL DEFAULT 0,
    "lastEmailAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beta_signups_pkey" PRIMARY KEY ("id")
);

-- Create signup_counters table
CREATE TABLE IF NOT EXISTS "signup_counters" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signups" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "invitations" INTEGER NOT NULL DEFAULT 0,
    "doctorSignups" INTEGER NOT NULL DEFAULT 0,
    "nurseSignups" INTEGER NOT NULL DEFAULT 0,
    "adminSignups" INTEGER NOT NULL DEFAULT 0,
    "organicSignups" INTEGER NOT NULL DEFAULT 0,
    "referralSignups" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signup_counters_pkey" PRIMARY KEY ("id")
);

-- Add invitationCodeId to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "invitationCodeId" TEXT;

-- Create unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "invitation_codes_code_key" ON "invitation_codes"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "beta_signups_email_key" ON "beta_signups"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "signup_counters_date_key" ON "signup_counters"("date");

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "invitation_codes_code_expiresAt_idx" ON "invitation_codes"("code", "expiresAt");
CREATE INDEX IF NOT EXISTS "invitation_codes_createdBy_idx" ON "invitation_codes"("createdBy");
CREATE INDEX IF NOT EXISTS "beta_signups_email_idx" ON "beta_signups"("email");
CREATE INDEX IF NOT EXISTS "beta_signups_status_createdAt_idx" ON "beta_signups"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "beta_signups_approvedAt_idx" ON "beta_signups"("approvedAt");
CREATE INDEX IF NOT EXISTS "signup_counters_date_idx" ON "signup_counters"("date");
CREATE INDEX IF NOT EXISTS "users_invitationCodeId_idx" ON "users"("invitationCodeId");

-- Add foreign key constraints
ALTER TABLE "invitation_codes"
    ADD CONSTRAINT IF NOT EXISTS "invitation_codes_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "users"
    ADD CONSTRAINT IF NOT EXISTS "users_invitationCodeId_fkey"
    FOREIGN KEY ("invitationCodeId") REFERENCES "invitation_codes"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
