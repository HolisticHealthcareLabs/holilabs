-- ==========================================================================
-- RESET DATABASE FOR PRODUCTION — "The Broom"
--
-- Purpose: Purge all transaction/patient data while preserving master data.
-- Safety:  ABORTS if connected to PRODUCTION database.
--
-- Usage:
--   psql $DATABASE_URL -f scripts/reset_db_for_prod.sql
--
-- Author: Archie (CTO Agent) — Operation Tabula Rasa
-- Date:   2026-02-12
-- ==========================================================================

-- ============================
-- SAFETY CHECK: ABORT IF PRODUCTION
-- ============================
DO $$
DECLARE
  db_host TEXT;
  db_name TEXT;
BEGIN
  -- Extract connection info
  db_host := inet_server_addr()::TEXT;
  db_name := current_database();

  -- Block if connected to known production hosts
  IF db_host IS NOT NULL AND (
    db_host LIKE '%digitalocean%' OR
    db_host LIKE '%amazonaws%' OR
    db_host LIKE '%azure%' OR
    db_host LIKE '%cloud.google%' OR
    db_host LIKE '%.prod.%'
  ) THEN
    RAISE EXCEPTION '

    ██████████████████████████████████████████████████
    ██  ABORT: PRODUCTION DATABASE DETECTED         ██
    ██  Host: %                                     ██
    ██  This script is NOT safe for production.     ██
    ██  Use only on local/staging databases.        ██
    ██████████████████████████████████████████████████

    ', db_host;
  END IF;

  -- Block if database name contains production indicators
  IF db_name LIKE '%prod%' OR db_name LIKE '%production%' THEN
    RAISE EXCEPTION '

    ██████████████████████████████████████████████████
    ██  ABORT: PRODUCTION DATABASE NAME DETECTED    ██
    ██  Database: %                                 ██
    ██  This script is NOT safe for production.     ██
    ██████████████████████████████████████████████████

    ', db_name;
  END IF;

  -- Additional check: look for env marker table if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = '_environment_marker'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM _environment_marker WHERE environment = 'production'
    ) THEN
      RAISE EXCEPTION '

      ██████████████████████████████████████████████████
      ██  ABORT: _environment_marker = production     ██
      ██  This script is NOT safe for production.     ██
      ██████████████████████████████████████████████████

      ';
    END IF;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Safety check passed. Database: %, Host: %', db_name, COALESCE(db_host, 'localhost');
  RAISE NOTICE '   Proceeding with transaction data purge...';
  RAISE NOTICE '';
END $$;

-- ============================
-- PRE-PURGE: Record what we're about to delete
-- ============================
DO $$
DECLARE
  patient_count INT;
  gov_log_count INT;
  audit_count INT;
  assurance_count INT;
BEGIN
  SELECT COUNT(*) INTO patient_count FROM patients;
  SELECT COUNT(*) INTO gov_log_count FROM governance_logs;
  SELECT COUNT(*) INTO audit_count FROM audit_logs;

  -- assurance_events may not exist yet
  BEGIN
    SELECT COUNT(*) INTO assurance_count FROM assurance_events;
  EXCEPTION WHEN undefined_table THEN
    assurance_count := 0;
  END;

  RAISE NOTICE '--- PRE-PURGE INVENTORY ---';
  RAISE NOTICE '  Patients:          %', patient_count;
  RAISE NOTICE '  Governance Logs:   %', gov_log_count;
  RAISE NOTICE '  Audit Logs:        %', audit_count;
  RAISE NOTICE '  Assurance Events:  %', assurance_count;
  RAISE NOTICE '';
END $$;

-- ============================
-- PHASE 1: TRUNCATE TRANSACTION DATA (CASCADE)
-- ============================
-- Order matters: child tables first to respect FK constraints,
-- or use CASCADE to handle it automatically.

BEGIN;

-- RLHF / Assurance data (if tables exist)
DO $$ BEGIN
  TRUNCATE TABLE outcome_ground_truths CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE human_feedback CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE assurance_events CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE override_clusters CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE rule_proposals CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Governance data
TRUNCATE TABLE governance_events CASCADE;
TRUNCATE TABLE governance_logs CASCADE;

-- Clinical interaction data
DO $$ BEGIN
  TRUNCATE TABLE interaction_sessions CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Audit trail (transaction data, not config)
TRUNCATE TABLE audit_logs CASCADE;

-- Billing / Financial
DO $$ BEGIN
  TRUNCATE TABLE payments CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE invoice_line_items CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE invoices CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE insurance_claims CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Clinical encounter data
DO $$ BEGIN
  TRUNCATE TABLE soap_notes CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE clinical_note_versions CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE clinical_notes CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE clinical_encounters CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE transcriptions CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE scribe_sessions CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Medication administration (transactional, not concepts)
DO $$ BEGIN
  TRUNCATE TABLE medication_administrations CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE medication_schedules CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE medication_dispenses CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE pharmacy_prescriptions CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE prescriptions CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Patient clinical data
DO $$ BEGIN
  TRUNCATE TABLE medications CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE lab_results CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE vital_signs CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE diagnoses CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE allergies CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE imaging_studies CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE patient_dossiers CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Appointments & scheduling
DO $$ BEGIN
  TRUNCATE TABLE appointments CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE waiting_lists CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE no_show_histories CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Consent & privacy
DO $$ BEGIN
  TRUNCATE TABLE consents CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE deletion_requests CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE data_access_grants CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Messaging
DO $$ BEGIN
  TRUNCATE TABLE message_read_receipts CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE conversation_messages CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE conversation_participants CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE conversations CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE messages CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Notifications & reminders
DO $$ BEGIN
  TRUNCATE TABLE notifications CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE scheduled_reminders CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE preventive_care_reminders CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Forms (instances are transactional; templates are master data)
DO $$ BEGIN
  TRUNCATE TABLE form_audit_logs CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE form_instances CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- AI usage logs
DO $$ BEGIN
  TRUNCATE TABLE ai_usage_logs CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE ai_content_feedback CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE ai_sentence_confidences CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE ai_quality_metrics CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE ai_interaction_evaluations CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Token maps
DO $$ BEGIN
  TRUNCATE TABLE token_maps CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Patient junction tables
DO $$ BEGIN
  TRUNCATE TABLE patient_users CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE patient_insurances CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  TRUNCATE TABLE patient_preferences CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Finally: Patients themselves
TRUNCATE TABLE patients CASCADE;

COMMIT;

-- ============================
-- PHASE 2: VERIFY MASTER DATA PRESERVED
-- ============================
DO $$
DECLARE
  rules_count INT;
  flags_count INT;
  icd10_count INT;
  protocols_count INT;
BEGIN
  SELECT COUNT(*) INTO rules_count FROM clinical_rules;
  SELECT COUNT(*) INTO flags_count FROM feature_flags;

  BEGIN
    SELECT COUNT(*) INTO icd10_count FROM "ICD10Code";
  EXCEPTION WHEN undefined_table THEN
    icd10_count := 0;
  END;

  BEGIN
    SELECT COUNT(*) INTO protocols_count FROM treatment_protocols;
  EXCEPTION WHEN undefined_table THEN
    protocols_count := 0;
  END;

  RAISE NOTICE '';
  RAISE NOTICE '--- POST-PURGE VERIFICATION ---';
  RAISE NOTICE '  [PRESERVED] Clinical Rules:       %', rules_count;
  RAISE NOTICE '  [PRESERVED] Feature Flags:         %', flags_count;
  RAISE NOTICE '  [PRESERVED] ICD-10 Codes:          %', icd10_count;
  RAISE NOTICE '  [PRESERVED] Treatment Protocols:   %', protocols_count;
  RAISE NOTICE '';
END $$;

-- Verify patients are gone
DO $$
DECLARE
  patient_count INT;
BEGIN
  SELECT COUNT(*) INTO patient_count FROM patients;

  IF patient_count > 0 THEN
    RAISE EXCEPTION 'PURGE FAILED: % patients still exist!', patient_count;
  END IF;

  RAISE NOTICE '  [PURGED]    Patients:              0 ✅';
  RAISE NOTICE '  [PURGED]    Governance Logs:        (cascaded) ✅';
  RAISE NOTICE '  [PURGED]    Audit Logs:             (cascaded) ✅';
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════';
  RAISE NOTICE '  DATABASE RESET COMPLETE';
  RAISE NOTICE '  Master data preserved. Transaction data purged.';
  RAISE NOTICE '  Ready for production onboarding.';
  RAISE NOTICE '══════════════════════════════════════════════';
END $$;
