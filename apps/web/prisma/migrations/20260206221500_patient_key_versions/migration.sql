-- Add missing Patient encryption key version columns.
-- These columns exist in `schema.prisma` (with defaults) but were missing from the
-- original `patients` table created in `20251205_web2_interop_foundation`.

ALTER TABLE "patients"
  ADD COLUMN IF NOT EXISTS "firstNameKeyVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "lastNameKeyVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "emailKeyVersion" INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "phoneKeyVersion" INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "addressKeyVersion" INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "mrnKeyVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "externalMrnKeyVersion" INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "cnsKeyVersion" INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "cpfKeyVersion" INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "rgKeyVersion" INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "primaryContactPhoneKeyVersion" INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "primaryContactEmailKeyVersion" INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "primaryContactAddressKeyVersion" INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "secondaryContactPhoneKeyVersion" INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "secondaryContactEmailKeyVersion" INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "emergencyContactPhoneKeyVersion" INTEGER DEFAULT 1;

