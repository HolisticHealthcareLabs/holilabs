-- Add missing Patient recording consent fields.
-- Present in `schema.prisma` but not in the original `patients` table migration.

ALTER TABLE "patients"
  ADD COLUMN IF NOT EXISTS "recordingConsentGiven" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "recordingConsentDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "recordingConsentMethod" TEXT,
  ADD COLUMN IF NOT EXISTS "recordingConsentState" TEXT,
  ADD COLUMN IF NOT EXISTS "recordingConsentWithdrawnAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "recordingConsentLanguage" TEXT,
  ADD COLUMN IF NOT EXISTS "recordingConsentVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "recordingConsentSignature" TEXT;

