-- Governance schema completeness hardening
-- Ensures runtime governance persistence tables exist even on drifted environments.

-- 1) Enums required by governance tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ValidationStatus') THEN
    CREATE TYPE "ValidationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GovernanceSeverity') THEN
    CREATE TYPE "GovernanceSeverity" AS ENUM ('HARD_BLOCK', 'SOFT_NUDGE', 'INFO');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GovernanceAction') THEN
    CREATE TYPE "GovernanceAction" AS ENUM ('BLOCKED', 'FLAGGED', 'PASSED', 'SHADOW_BLOCK');
  END IF;
END $$;

-- 2) Core governance tables
CREATE TABLE IF NOT EXISTS "interaction_sessions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "patientId" TEXT,
  "encounterId" TEXT,
  "scribeSessionId" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "interaction_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "governance_logs" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "inputPrompt" TEXT NOT NULL,
  "rawModelOutput" TEXT,
  "sanitizedOutput" TEXT,
  "provider" TEXT NOT NULL DEFAULT 'unknown',
  "latencyMs" INTEGER NOT NULL DEFAULT 0,
  "tokenCount" INTEGER NOT NULL DEFAULT 0,
  "safetyScore" INTEGER,
  "validationStatus" "ValidationStatus" NOT NULL DEFAULT 'PENDING',
  "validationNotes" TEXT,
  "validatedAt" TIMESTAMP(3),
  "validatedBy" TEXT,
  "overrideReason" TEXT,
  "ruleId" TEXT,
  "ruleDescription" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "governance_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "governance_events" (
  "id" TEXT NOT NULL,
  "logId" TEXT NOT NULL,
  "ruleId" TEXT,
  "ruleName" TEXT NOT NULL,
  "severity" "GovernanceSeverity" NOT NULL,
  "description" TEXT,
  "actionTaken" "GovernanceAction" NOT NULL,
  "overrideByUser" BOOLEAN NOT NULL DEFAULT false,
  "overrideReason" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "governance_events_pkey" PRIMARY KEY ("id")
);

-- 3) Additive column hardening for pre-existing drifted tables
ALTER TABLE "interaction_sessions" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "interaction_sessions" ADD COLUMN IF NOT EXISTS "patientId" TEXT;
ALTER TABLE "interaction_sessions" ADD COLUMN IF NOT EXISTS "encounterId" TEXT;
ALTER TABLE "interaction_sessions" ADD COLUMN IF NOT EXISTS "scribeSessionId" TEXT;
ALTER TABLE "interaction_sessions" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "interaction_sessions" ADD COLUMN IF NOT EXISTS "endedAt" TIMESTAMP(3);

ALTER TABLE "governance_logs" ADD COLUMN IF NOT EXISTS "sessionId" TEXT;
ALTER TABLE "governance_logs" ADD COLUMN IF NOT EXISTS "inputPrompt" TEXT;
ALTER TABLE "governance_logs" ADD COLUMN IF NOT EXISTS "rawModelOutput" TEXT;
ALTER TABLE "governance_logs" ADD COLUMN IF NOT EXISTS "sanitizedOutput" TEXT;
ALTER TABLE "governance_logs" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE "governance_logs" ADD COLUMN IF NOT EXISTS "latencyMs" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "governance_logs" ADD COLUMN IF NOT EXISTS "tokenCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "governance_logs" ADD COLUMN IF NOT EXISTS "safetyScore" INTEGER;
ALTER TABLE "governance_logs" ADD COLUMN IF NOT EXISTS "validationStatus" "ValidationStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "governance_logs" ADD COLUMN IF NOT EXISTS "validationNotes" TEXT;
ALTER TABLE "governance_logs" ADD COLUMN IF NOT EXISTS "validatedAt" TIMESTAMP(3);
ALTER TABLE "governance_logs" ADD COLUMN IF NOT EXISTS "validatedBy" TEXT;
ALTER TABLE "governance_logs" ADD COLUMN IF NOT EXISTS "overrideReason" TEXT;
ALTER TABLE "governance_logs" ADD COLUMN IF NOT EXISTS "ruleId" TEXT;
ALTER TABLE "governance_logs" ADD COLUMN IF NOT EXISTS "ruleDescription" TEXT;
ALTER TABLE "governance_logs" ADD COLUMN IF NOT EXISTS "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "governance_events" ADD COLUMN IF NOT EXISTS "logId" TEXT;
ALTER TABLE "governance_events" ADD COLUMN IF NOT EXISTS "ruleId" TEXT;
ALTER TABLE "governance_events" ADD COLUMN IF NOT EXISTS "ruleName" TEXT;
ALTER TABLE "governance_events" ADD COLUMN IF NOT EXISTS "severity" "GovernanceSeverity";
ALTER TABLE "governance_events" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "governance_events" ADD COLUMN IF NOT EXISTS "actionTaken" "GovernanceAction";
ALTER TABLE "governance_events" ADD COLUMN IF NOT EXISTS "overrideByUser" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "governance_events" ADD COLUMN IF NOT EXISTS "overrideReason" TEXT;
ALTER TABLE "governance_events" ADD COLUMN IF NOT EXISTS "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 4) Foreign keys (only when parent tables exist)
DO $$
BEGIN
  IF to_regclass('interaction_sessions') IS NOT NULL
    AND to_regclass('users') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'interaction_sessions_userId_fkey') THEN
    ALTER TABLE "interaction_sessions"
      ADD CONSTRAINT "interaction_sessions_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('interaction_sessions') IS NOT NULL
    AND to_regclass('patients') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'interaction_sessions_patientId_fkey') THEN
    ALTER TABLE "interaction_sessions"
      ADD CONSTRAINT "interaction_sessions_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('interaction_sessions') IS NOT NULL
    AND to_regclass('clinical_encounters') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'interaction_sessions_encounterId_fkey') THEN
    ALTER TABLE "interaction_sessions"
      ADD CONSTRAINT "interaction_sessions_encounterId_fkey"
      FOREIGN KEY ("encounterId") REFERENCES "clinical_encounters"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('interaction_sessions') IS NOT NULL
    AND to_regclass('scribe_sessions') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'interaction_sessions_scribeSessionId_fkey') THEN
    ALTER TABLE "interaction_sessions"
      ADD CONSTRAINT "interaction_sessions_scribeSessionId_fkey"
      FOREIGN KEY ("scribeSessionId") REFERENCES "scribe_sessions"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('governance_logs') IS NOT NULL
    AND to_regclass('interaction_sessions') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'governance_logs_sessionId_fkey') THEN
    ALTER TABLE "governance_logs"
      ADD CONSTRAINT "governance_logs_sessionId_fkey"
      FOREIGN KEY ("sessionId") REFERENCES "interaction_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('governance_events') IS NOT NULL
    AND to_regclass('governance_logs') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'governance_events_logId_fkey') THEN
    ALTER TABLE "governance_events"
      ADD CONSTRAINT "governance_events_logId_fkey"
      FOREIGN KEY ("logId") REFERENCES "governance_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 5) Indexes aligned with schema
CREATE INDEX IF NOT EXISTS "interaction_sessions_userId_idx" ON "interaction_sessions"("userId");
CREATE INDEX IF NOT EXISTS "interaction_sessions_patientId_idx" ON "interaction_sessions"("patientId");
CREATE INDEX IF NOT EXISTS "governance_logs_sessionId_idx" ON "governance_logs"("sessionId");
CREATE INDEX IF NOT EXISTS "governance_events_logId_idx" ON "governance_events"("logId");
CREATE INDEX IF NOT EXISTS "governance_events_severity_idx" ON "governance_events"("severity");
