-- Agent Schema Hardening: FHIR Integration, Governance Completeness, and Security Models
-- Adds 11+ models for EHR interoperability, clinical governance, and enterprise features
-- Plus GREY value for TrafficLightColor enum

-- ============================================================================
-- 1. CREATE NEW ENUMS
-- ============================================================================

-- Add GREY to any enum that represents traffic light colors (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TrafficLightColor') THEN
    CREATE TYPE "TrafficLightColor" AS ENUM ('RED', 'YELLOW', 'GREEN', 'GREY');
  ELSE
    -- Enum exists, try to add GREY value if it doesn't exist
    ALTER TYPE "TrafficLightColor" ADD VALUE IF NOT EXISTS 'GREY';
  END IF;
END $$;

-- OTPChannel enum (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OTPChannel') THEN
    CREATE TYPE "OTPChannel" AS ENUM ('SMS', 'EMAIL', 'WHATSAPP');
  END IF;
END $$;

-- UserType enum (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserType') THEN
    CREATE TYPE "UserType" AS ENUM ('CLINICIAN', 'PATIENT');
  END IF;
END $$;

-- ============================================================================
-- 2. EHR INTEGRATION TABLES (FHIR & OAuth)
-- ============================================================================

-- EHR session storage for OAuth 2.0 tokens and SMART on FHIR context
CREATE TABLE IF NOT EXISTS "ehr_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerId" VARCHAR(50) NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scope" VARCHAR(1000) NOT NULL,
    "patientFhirId" VARCHAR(100),
    "encounterFhirId" VARCHAR(100),
    "fhirUserReference" VARCHAR(200),
    "fhirBaseUrl" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ehr_sessions_pkey" PRIMARY KEY ("id")
);

-- OAuth state storage for SMART on FHIR authorization flow
CREATE TABLE IF NOT EXISTS "oauth_states" (
    "state" VARCHAR(64) NOT NULL,
    "providerId" VARCHAR(50) NOT NULL,
    "userId" TEXT NOT NULL,
    "redirectPath" VARCHAR(500) NOT NULL,
    "codeVerifier" VARCHAR(128),
    "launchContext" VARCHAR(500),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_states_pkey" PRIMARY KEY ("state")
);

-- ============================================================================
-- 3. GOVERNANCE & SAFETY MODELS
-- ============================================================================

-- Assurance events for quality tracking
CREATE TABLE IF NOT EXISTS "assurance_events" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "description" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assurance_events_pkey" PRIMARY KEY ("id")
);

-- Human feedback for model improvement
CREATE TABLE IF NOT EXISTS "human_feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "feedbackType" TEXT NOT NULL,
    "score" INTEGER,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "human_feedback_pkey" PRIMARY KEY ("id")
);

-- Ground truth outcomes for model training
CREATE TABLE IF NOT EXISTS "outcome_ground_truths" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outcome_ground_truths_pkey" PRIMARY KEY ("id")
);

-- Versioned governance rules
CREATE TABLE IF NOT EXISTS "rule_versions" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "logic" JSONB NOT NULL,
    "intervention" JSONB,
    "source" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rule_versions_pkey" PRIMARY KEY ("id")
);

-- Clinical referrals
CREATE TABLE IF NOT EXISTS "clinical_referrals" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "fromClinicianId" TEXT,
    "toSpecialty" TEXT NOT NULL,
    "priority" TEXT DEFAULT 'NORMAL',
    "status" TEXT DEFAULT 'PENDING',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "clinical_referrals_pkey" PRIMARY KEY ("id")
);

-- Override clusters for pattern analysis
CREATE TABLE IF NOT EXISTS "override_clusters" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "overrideCount" INTEGER NOT NULL DEFAULT 0,
    "lastOverrideAt" TIMESTAMP(3),
    "pattern" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "override_clusters_pkey" PRIMARY KEY ("id")
);

-- Rule proposals from clinicians
CREATE TABLE IF NOT EXISTS "rule_proposals" (
    "id" TEXT NOT NULL,
    "proposedBy" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "logic" JSONB NOT NULL,
    "status" TEXT DEFAULT 'DRAFT',
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "rule_proposals_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- 4. NETWORK & BILLING INTEGRATION
-- ============================================================================

-- Clinician network provider mappings
CREATE TABLE IF NOT EXISTS "clinician_networks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "insurerId" TEXT NOT NULL,
    "isInNetwork" BOOLEAN NOT NULL DEFAULT false,
    "contractStart" TIMESTAMP(3),
    "contractEnd" TIMESTAMP(3),
    "networkTier" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinician_networks_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- 5. RBAC & ACCESS CONTROL
-- ============================================================================

-- Role assignments (delegated RBAC)
CREATE TABLE IF NOT EXISTS "role_assignments" (
    "id" TEXT NOT NULL,
    "grantorId" TEXT NOT NULL,
    "granteeId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "scope" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "role_assignments_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- 6. USER BEHAVIOR & ANALYTICS
-- ============================================================================

-- User behavior events for analytics
CREATE TABLE IF NOT EXISTS "user_behavior_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_behavior_events_pkey" PRIMARY KEY ("id")
);

-- Access reason aggregates
CREATE TABLE IF NOT EXISTS "access_reason_aggregates" (
    "id" TEXT NOT NULL,
    "accessReason" TEXT NOT NULL,
    "hourOfDay" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "avgDuration" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "access_reason_aggregates_pkey" PRIMARY KEY ("id")
);

-- Data quality events
CREATE TABLE IF NOT EXISTS "data_quality_events" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "details" JSONB DEFAULT '{}',
    "workspaceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_quality_events_pkey" PRIMARY KEY ("id")
);

-- Governance rules (active rule registry)
CREATE TABLE IF NOT EXISTS "governance_rules" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "severity" TEXT,
    "logic" JSONB,
    "intervention" JSONB,
    "source" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "clinicId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "governance_rules_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- 7. ESCALATION & COMMUNICATION
-- ============================================================================

-- Escalation notes
CREATE TABLE IF NOT EXISTS "escalation_notes" (
    "id" TEXT NOT NULL,
    "escalationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escalation_notes_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- 8. SEARCH & DISCOVERY
-- ============================================================================

-- Search history
CREATE TABLE IF NOT EXISTS "search_histories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "results" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_histories_pkey" PRIMARY KEY ("id")
);

-- Saved searches
CREATE TABLE IF NOT EXISTS "saved_searches" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "entityType" TEXT NOT NULL,
    "searchParams" JSONB NOT NULL,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- 9. SESSION & SYNC TRACKING
-- ============================================================================

-- Patient sessions
CREATE TABLE IF NOT EXISTS "patient_sessions" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "durationSec" INTEGER,

    CONSTRAINT "patient_sessions_pkey" PRIMARY KEY ("id")
);

-- FHIR sync events
CREATE TABLE IF NOT EXISTS "fhir_sync_events" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fhir_sync_events_pkey" PRIMARY KEY ("id")
);

-- FHIR Encounter sync
CREATE TABLE IF NOT EXISTS "fhir_encounters" (
    "id" TEXT NOT NULL,
    "patientTokenId" TEXT,
    "fhirSyncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "orgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fhir_encounters_pkey" PRIMARY KEY ("id")
);

-- FHIR Observation sync
CREATE TABLE IF NOT EXISTS "fhir_observations" (
    "id" TEXT NOT NULL,
    "patientTokenId" TEXT,
    "fhirSyncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "orgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fhir_observations_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- 10. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS "ehr_sessions_userId_idx" ON "ehr_sessions"("userId");
CREATE INDEX IF NOT EXISTS "ehr_sessions_providerId_idx" ON "ehr_sessions"("providerId");
CREATE INDEX IF NOT EXISTS "ehr_sessions_expiresAt_idx" ON "ehr_sessions"("expiresAt");

CREATE INDEX IF NOT EXISTS "oauth_states_expiresAt_idx" ON "oauth_states"("expiresAt");

CREATE INDEX IF NOT EXISTS "assurance_events_eventType_idx" ON "assurance_events"("eventType");
CREATE INDEX IF NOT EXISTS "assurance_events_createdAt_idx" ON "assurance_events"("createdAt");

CREATE INDEX IF NOT EXISTS "human_feedback_userId_idx" ON "human_feedback"("userId");
CREATE INDEX IF NOT EXISTS "human_feedback_contentId_idx" ON "human_feedback"("contentId");

CREATE INDEX IF NOT EXISTS "outcome_ground_truths_patientId_idx" ON "outcome_ground_truths"("patientId");
CREATE INDEX IF NOT EXISTS "outcome_ground_truths_eventType_idx" ON "outcome_ground_truths"("eventType");

CREATE INDEX IF NOT EXISTS "rule_versions_ruleId_idx" ON "rule_versions"("ruleId");
CREATE INDEX IF NOT EXISTS "rule_versions_isActive_idx" ON "rule_versions"("isActive");

CREATE INDEX IF NOT EXISTS "clinical_referrals_patientId_idx" ON "clinical_referrals"("patientId");
CREATE INDEX IF NOT EXISTS "clinical_referrals_status_idx" ON "clinical_referrals"("status");

CREATE INDEX IF NOT EXISTS "override_clusters_ruleId_idx" ON "override_clusters"("ruleId");

CREATE INDEX IF NOT EXISTS "rule_proposals_status_idx" ON "rule_proposals"("status");
CREATE INDEX IF NOT EXISTS "rule_proposals_proposedBy_idx" ON "rule_proposals"("proposedBy");

CREATE INDEX IF NOT EXISTS "clinician_networks_userId_idx" ON "clinician_networks"("userId");
CREATE INDEX IF NOT EXISTS "clinician_networks_insurerId_idx" ON "clinician_networks"("insurerId");

CREATE INDEX IF NOT EXISTS "role_assignments_grantorId_idx" ON "role_assignments"("grantorId");
CREATE INDEX IF NOT EXISTS "role_assignments_granteeId_idx" ON "role_assignments"("granteeId");

CREATE INDEX IF NOT EXISTS "user_behavior_events_userId_idx" ON "user_behavior_events"("userId");
CREATE INDEX IF NOT EXISTS "user_behavior_events_eventType_idx" ON "user_behavior_events"("eventType");

CREATE INDEX IF NOT EXISTS "access_reason_aggregates_date_idx" ON "access_reason_aggregates"("date");

CREATE INDEX IF NOT EXISTS "data_quality_events_patientId_idx" ON "data_quality_events"("patientId");
CREATE INDEX IF NOT EXISTS "data_quality_events_eventType_idx" ON "data_quality_events"("eventType");
CREATE INDEX IF NOT EXISTS "data_quality_events_workspaceId_idx" ON "data_quality_events"("workspaceId");

CREATE INDEX IF NOT EXISTS "governance_rules_clinicId_idx" ON "governance_rules"("clinicId");
CREATE INDEX IF NOT EXISTS "governance_rules_isActive_idx" ON "governance_rules"("isActive");

CREATE INDEX IF NOT EXISTS "escalation_notes_escalationId_idx" ON "escalation_notes"("escalationId");
CREATE INDEX IF NOT EXISTS "escalation_notes_authorId_idx" ON "escalation_notes"("authorId");

CREATE INDEX IF NOT EXISTS "search_histories_userId_idx" ON "search_histories"("userId");

CREATE INDEX IF NOT EXISTS "saved_searches_userId_idx" ON "saved_searches"("userId");

CREATE INDEX IF NOT EXISTS "patient_sessions_patientId_idx" ON "patient_sessions"("patientId");
CREATE INDEX IF NOT EXISTS "patient_sessions_userId_idx" ON "patient_sessions"("userId");

CREATE INDEX IF NOT EXISTS "fhir_sync_events_resourceType_resourceId_idx" ON "fhir_sync_events"("resourceType", "resourceId");

-- ============================================================================
-- 11. UNIQUE CONSTRAINTS
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS "ehr_sessions_userId_providerId_unique" ON "ehr_sessions"("userId", "providerId");
CREATE UNIQUE INDEX IF NOT EXISTS "clinician_networks_userId_insurerId_unique" ON "clinician_networks"("userId", "insurerId");
CREATE UNIQUE INDEX IF NOT EXISTS "role_assignments_granteeId_role_scope_unique" ON "role_assignments"("granteeId", "role", COALESCE("scope", ''));
CREATE UNIQUE INDEX IF NOT EXISTS "access_reason_aggregates_unique" ON "access_reason_aggregates"("accessReason", "hourOfDay", "dayOfWeek", "date");
