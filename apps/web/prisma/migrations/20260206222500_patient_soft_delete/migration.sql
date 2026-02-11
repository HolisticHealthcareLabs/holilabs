-- Add missing Patient soft-delete fields.
-- Present in `schema.prisma` but not in the original `patients` table migration.

ALTER TABLE "patients"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deletionReason" TEXT;

