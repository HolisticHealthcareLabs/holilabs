-- Add missing auth/profile columns required by schema.prisma
-- This keeps the database aligned with Prisma models so seeds + auth work.

-- Users
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "profilePictureUrl" TEXT;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "mfaServiceSid" TEXT;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "mfaPhoneNumber" TEXT;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "mfaBackupCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "mfaEnrolledAt" TIMESTAMP(3);

-- Patient users (patient portal auth)
ALTER TABLE "patient_users"
  ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;

