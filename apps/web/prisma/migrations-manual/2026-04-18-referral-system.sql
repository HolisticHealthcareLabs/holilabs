-- Manual migration: cross-modality referral system + patient care points.
-- Idempotent: drops any partial state from failed prior attempts, then recreates.
-- Uses ProviderReferralStatus to avoid collision with pre-existing ReferralStatus enum.

DROP TABLE IF EXISTS "provider_referral_stats" CASCADE;
DROP TABLE IF EXISTS "patient_points_ledger" CASCADE;
DROP TABLE IF EXISTS "patient_care_points" CASCADE;
DROP TABLE IF EXISTS "provider_referrals" CASCADE;
DROP TYPE IF EXISTS "ReferralNetworkBadge" CASCADE;
DROP TYPE IF EXISTS "ReferralInitiationSource" CASCADE;
DROP TYPE IF EXISTS "ProviderReferralStatus" CASCADE;

CREATE TYPE "ProviderReferralStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'EXPIRED');
CREATE TYPE "ReferralInitiationSource" AS ENUM ('DOCTOR_VISIT', 'ASYNC_MESSAGING', 'PATIENT_REQUEST', 'AI_SUGGESTION');
CREATE TYPE "ReferralNetworkBadge" AS ENUM ('BRONZE', 'SILVER', 'GOLD');

CREATE TABLE "provider_referrals" (
  "id"                 TEXT PRIMARY KEY,
  "from_physician_id"  TEXT NOT NULL REFERENCES "physician_catalog"("id"),
  "to_physician_id"    TEXT NOT NULL REFERENCES "physician_catalog"("id"),
  "patient_id"         TEXT,
  "reason"             TEXT NOT NULL,
  "from_system_type"   "MedicalSystemType" NOT NULL,
  "to_system_type"     "MedicalSystemType" NOT NULL,
  "is_cross_modality"  BOOLEAN NOT NULL DEFAULT false,
  "initiation_source"  "ReferralInitiationSource" NOT NULL,
  "disclosure_text"    TEXT NOT NULL,
  "status"             "ProviderReferralStatus" NOT NULL DEFAULT 'PENDING',
  "accepted_at"        TIMESTAMP(3),
  "completed_at"       TIMESTAMP(3),
  "declined_at"        TIMESTAMP(3),
  "decline_reason"     TEXT,
  "scheduled_for"      TIMESTAMP(3),
  "outcome_summary"    TEXT,
  "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "provider_referrals_from_idx"    ON "provider_referrals"("from_physician_id");
CREATE INDEX "provider_referrals_to_idx"      ON "provider_referrals"("to_physician_id");
CREATE INDEX "provider_referrals_patient_idx" ON "provider_referrals"("patient_id");
CREATE INDEX "provider_referrals_status_idx"  ON "provider_referrals"("status");
CREATE INDEX "provider_referrals_cross_idx"   ON "provider_referrals"("is_cross_modality");
CREATE INDEX "provider_referrals_created_idx" ON "provider_referrals"("created_at");

CREATE TABLE "patient_care_points" (
  "patient_id"        TEXT PRIMARY KEY,
  "balance"           INTEGER NOT NULL DEFAULT 0,
  "lifetime_earned"   INTEGER NOT NULL DEFAULT 0,
  "lifetime_redeemed" INTEGER NOT NULL DEFAULT 0,
  "updated_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "patient_points_ledger" (
  "id"            TEXT PRIMARY KEY,
  "patient_id"    TEXT NOT NULL REFERENCES "patient_care_points"("patient_id"),
  "referral_id"   TEXT REFERENCES "provider_referrals"("id"),
  "event_type"    TEXT NOT NULL,
  "points"        INTEGER NOT NULL,
  "balance_after" INTEGER NOT NULL,
  "description"   TEXT NOT NULL,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "patient_points_ledger_patient_idx"  ON "patient_points_ledger"("patient_id");
CREATE INDEX "patient_points_ledger_referral_idx" ON "patient_points_ledger"("referral_id");
CREATE INDEX "patient_points_ledger_event_idx"    ON "patient_points_ledger"("event_type");
CREATE INDEX "patient_points_ledger_created_idx"  ON "patient_points_ledger"("created_at");

CREATE TABLE "provider_referral_stats" (
  "physician_id"            TEXT PRIMARY KEY REFERENCES "physician_catalog"("id") ON DELETE CASCADE,
  "sent_count"              INTEGER NOT NULL DEFAULT 0,
  "received_count"          INTEGER NOT NULL DEFAULT 0,
  "accepted_count"          INTEGER NOT NULL DEFAULT 0,
  "completed_count"         INTEGER NOT NULL DEFAULT 0,
  "declined_count"          INTEGER NOT NULL DEFAULT 0,
  "cross_modality_percent"  DECIMAL(5,2) NOT NULL DEFAULT 0,
  "completion_rate"         DECIMAL(5,2) NOT NULL DEFAULT 0,
  "network_badge"           "ReferralNetworkBadge",
  "last_computed_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "provider_referral_stats_badge_idx" ON "provider_referral_stats"("network_badge");
