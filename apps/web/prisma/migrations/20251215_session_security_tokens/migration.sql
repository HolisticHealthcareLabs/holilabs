-- Add Password Reset Tokens for Session Security
-- Agent 23: Session Management & Token Security

-- Password Reset Token table
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "patient_user_id" TEXT,
    "user_type" TEXT NOT NULL CHECK ("user_type" IN ('CLINICIAN', 'PATIENT')),

    -- Token details
    "token" TEXT NOT NULL UNIQUE,
    "token_hash" TEXT NOT NULL UNIQUE,

    -- Expiration (1 hour)
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),

    -- Security
    "ip_address" TEXT,
    "user_agent" TEXT,

    -- Metadata
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
    CONSTRAINT "password_reset_tokens_user_id_fkey"
        FOREIGN KEY ("user_id")
        REFERENCES "User"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT "password_reset_tokens_patient_user_id_fkey"
        FOREIGN KEY ("patient_user_id")
        REFERENCES "patient_users"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Indexes for password reset tokens
CREATE INDEX IF NOT EXISTS "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_token_hash_idx" ON "password_reset_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_patient_user_id_idx" ON "password_reset_tokens"("patient_user_id");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- Add additional security columns to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password_changed_at" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "failed_login_attempts" INTEGER DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "locked_until" TIMESTAMP(3);

-- Add additional security columns to patient_users table (already has some)
ALTER TABLE "patient_users" ADD COLUMN IF NOT EXISTS "password_changed_at" TIMESTAMP(3);

-- Comment for documentation
COMMENT ON TABLE "password_reset_tokens" IS 'Secure password reset tokens with 1-hour expiration and single-use enforcement';
