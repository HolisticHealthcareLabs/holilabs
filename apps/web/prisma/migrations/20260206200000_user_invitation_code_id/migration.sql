-- Align DB with schema.prisma: User.invitationCodeId relation

-- Create invitation_codes if it doesn't exist yet (older migration set may not include it)
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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invitation_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "invitation_codes_code_key" ON "invitation_codes"("code");
CREATE INDEX IF NOT EXISTS "invitation_codes_code_expiresAt_idx" ON "invitation_codes"("code", "expiresAt");
CREATE INDEX IF NOT EXISTS "invitation_codes_createdBy_idx" ON "invitation_codes"("createdBy");

-- FK for createdBy -> users.id (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'invitation_codes_createdBy_fkey'
  ) THEN
    ALTER TABLE "invitation_codes"
      ADD CONSTRAINT "invitation_codes_createdBy_fkey"
      FOREIGN KEY ("createdBy") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "invitationCodeId" TEXT;

CREATE INDEX IF NOT EXISTS "users_invitationCodeId_idx"
  ON "users"("invitationCodeId");

-- Add FK idempotently (Postgres lacks ADD CONSTRAINT IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_invitationCodeId_fkey'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_invitationCodeId_fkey"
      FOREIGN KEY ("invitationCodeId") REFERENCES "invitation_codes"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

