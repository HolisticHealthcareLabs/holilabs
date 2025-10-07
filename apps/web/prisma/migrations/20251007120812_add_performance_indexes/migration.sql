-- Performance Indexes Migration
-- Adds critical indexes for common queries to improve performance

-- ============================================================================
-- PATIENTS - Common lookup patterns
-- ============================================================================

-- Search by email (patient lookup during registration/login)
CREATE INDEX IF NOT EXISTS "patients_email_idx" ON "patients"("email");

-- Search by phone (patient lookup via phone)
CREATE INDEX IF NOT EXISTS "patients_phone_idx" ON "patients"("phone");

-- Filter by active status (show only active patients)
CREATE INDEX IF NOT EXISTS "patients_isActive_idx" ON "patients"("isActive");

-- Composite index for common query: active patients by clinician
CREATE INDEX IF NOT EXISTS "patients_assignedClinicianId_isActive_idx" ON "patients"("assignedClinicianId", "isActive");

-- Date-based queries (recently created patients)
CREATE INDEX IF NOT EXISTS "patients_createdAt_idx" ON "patients"("createdAt" DESC);

-- ============================================================================
-- APPOINTMENTS - Calendar and scheduling queries
-- ============================================================================

-- Date range queries (calendar view: "show me appointments this week")
CREATE INDEX IF NOT EXISTS "appointments_startTime_endTime_idx" ON "appointments"("startTime", "endTime");

-- Filter by status + date (upcoming confirmed appointments)
CREATE INDEX IF NOT EXISTS "appointments_status_startTime_idx" ON "appointments"("status", "startTime");

-- Composite: clinician's appointments by date
CREATE INDEX IF NOT EXISTS "appointments_clinicianId_startTime_idx" ON "appointments"("clinicianId", "startTime" DESC);

-- Composite: patient's appointments by date
CREATE INDEX IF NOT EXISTS "appointments_patientId_startTime_idx" ON "appointments"("patientId", "startTime" DESC);

-- Reminders to send (unset reminders for upcoming appointments)
CREATE INDEX IF NOT EXISTS "appointments_reminderSent_startTime_idx" ON "appointments"("reminderSent", "startTime") WHERE "reminderSent" = false;

-- ============================================================================
-- PRESCRIPTIONS - Pharmacy workflow
-- ============================================================================

-- Filter by status (pending, signed, sent prescriptions)
CREATE INDEX IF NOT EXISTS "prescriptions_status_idx" ON "prescriptions"("status");

-- Composite: patient's prescriptions by status
CREATE INDEX IF NOT EXISTS "prescriptions_patientId_status_idx" ON "prescriptions"("patientId", "status");

-- Date-based queries (recent prescriptions)
CREATE INDEX IF NOT EXISTS "prescriptions_createdAt_idx" ON "prescriptions"("createdAt" DESC);

-- Sent to pharmacy filter
CREATE INDEX IF NOT EXISTS "prescriptions_sentToPharmacy_idx" ON "prescriptions"("sentToPharmacy");

-- ============================================================================
-- DOCUMENTS - Document management and search
-- ============================================================================

-- Filter by document type
CREATE INDEX IF NOT EXISTS "documents_documentType_idx" ON "documents"("documentType");

-- Composite: processing status + type (OCR queue)
CREATE INDEX IF NOT EXISTS "documents_processingStatus_documentType_idx" ON "documents"("processingStatus", "documentType");

-- De-identification workflow
CREATE INDEX IF NOT EXISTS "documents_isDeidentified_idx" ON "documents"("isDeidentified");

-- Date-based queries (recent uploads)
CREATE INDEX IF NOT EXISTS "documents_createdAt_idx" ON "documents"("createdAt" DESC);

-- Composite: patient's documents by type
CREATE INDEX IF NOT EXISTS "documents_patientId_documentType_idx" ON "documents"("patientId", "documentType");

-- ============================================================================
-- CLINICAL NOTES - Patient timeline
-- ============================================================================

-- Filter by note type
CREATE INDEX IF NOT EXISTS "clinical_notes_type_idx" ON "clinical_notes"("type");

-- Date-based queries (recent notes)
CREATE INDEX IF NOT EXISTS "clinical_notes_createdAt_idx" ON "clinical_notes"("createdAt" DESC);

-- Composite: patient's notes by date
CREATE INDEX IF NOT EXISTS "clinical_notes_patientId_createdAt_idx" ON "clinical_notes"("patientId", "createdAt" DESC);

-- Composite: author's notes by date
CREATE INDEX IF NOT EXISTS "clinical_notes_authorId_createdAt_idx" ON "clinical_notes"("authorId", "createdAt" DESC);

-- Signed notes filter
CREATE INDEX IF NOT EXISTS "clinical_notes_signedAt_idx" ON "clinical_notes"("signedAt");

-- ============================================================================
-- CONSENTS - Compliance and active consent tracking
-- ============================================================================

-- Filter by consent type
CREATE INDEX IF NOT EXISTS "consents_type_idx" ON "consents"("type");

-- Active consents (not revoked)
CREATE INDEX IF NOT EXISTS "consents_isActive_idx" ON "consents"("isActive");

-- Composite: patient's active consents by type
CREATE INDEX IF NOT EXISTS "consents_patientId_isActive_type_idx" ON "consents"("patientId", "isActive", "type");

-- Date-based queries (recently signed)
CREATE INDEX IF NOT EXISTS "consents_signedAt_idx" ON "consents"("signedAt" DESC);

-- Revoked consents (compliance audit)
CREATE INDEX IF NOT EXISTS "consents_revokedAt_idx" ON "consents"("revokedAt");

-- ============================================================================
-- MEDICATIONS - Active medications list
-- ============================================================================

-- Date-based queries (start/end dates for active medications)
CREATE INDEX IF NOT EXISTS "medications_startDate_idx" ON "medications"("startDate");
CREATE INDEX IF NOT EXISTS "medications_endDate_idx" ON "medications"("endDate");

-- Composite: patient's active medications
CREATE INDEX IF NOT EXISTS "medications_patientId_isActive_idx" ON "medications"("patientId", "isActive");

-- Search by medication name
CREATE INDEX IF NOT EXISTS "medications_name_idx" ON "medications"("name");

-- ============================================================================
-- AUDIT LOGS - Compliance reporting and security monitoring
-- ============================================================================

-- Composite: timestamp + action (compliance reports)
CREATE INDEX IF NOT EXISTS "audit_logs_timestamp_action_idx" ON "audit_logs"("timestamp" DESC, "action");

-- Composite: user activity timeline
CREATE INDEX IF NOT EXISTS "audit_logs_userId_timestamp_idx" ON "audit_logs"("userId", "timestamp" DESC);

-- Composite: resource access history
CREATE INDEX IF NOT EXISTS "audit_logs_resourceId_timestamp_idx" ON "audit_logs"("resourceId", "timestamp" DESC);

-- Failed operations (security monitoring)
CREATE INDEX IF NOT EXISTS "audit_logs_success_timestamp_idx" ON "audit_logs"("success", "timestamp" DESC) WHERE "success" = false;

-- ============================================================================
-- USERS - Authentication and lookup
-- ============================================================================

-- Filter by role (clinician list, admin list)
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role");

-- Last login tracking (inactive user reports)
CREATE INDEX IF NOT EXISTS "users_lastLoginAt_idx" ON "users"("lastLoginAt" DESC);

-- MFA enabled filter (security audit)
CREATE INDEX IF NOT EXISTS "users_mfaEnabled_idx" ON "users"("mfaEnabled");

-- Composite: active clinicians by specialty
CREATE INDEX IF NOT EXISTS "users_role_specialty_idx" ON "users"("role", "specialty");

-- ============================================================================
-- BLOCKCHAIN TRANSACTIONS - Transaction status tracking
-- ============================================================================

-- Filter by status (pending, confirmed, failed)
CREATE INDEX IF NOT EXISTS "blockchain_transactions_status_idx" ON "blockchain_transactions"("status");

-- Composite: record tracking
CREATE INDEX IF NOT EXISTS "blockchain_transactions_recordType_recordId_idx" ON "blockchain_transactions"("recordType", "recordId");

-- Date-based queries (recent transactions)
CREATE INDEX IF NOT EXISTS "blockchain_transactions_submittedAt_idx" ON "blockchain_transactions"("submittedAt" DESC);

-- ============================================================================
-- CALENDAR INTEGRATIONS - OAuth and sync tracking
-- ============================================================================

-- Filter by sync status
CREATE INDEX IF NOT EXISTS "calendar_integrations_syncEnabled_idx" ON "calendar_integrations"("syncEnabled");

-- Last sync tracking (stale sync detection)
CREATE INDEX IF NOT EXISTS "calendar_integrations_lastSyncAt_idx" ON "calendar_integrations"("lastSyncAt" DESC);

-- Token expiration (refresh token workflow)
CREATE INDEX IF NOT EXISTS "calendar_integrations_tokenExpiresAt_idx" ON "calendar_integrations"("tokenExpiresAt");

-- ============================================================================
-- TOKEN MAPS - Re-identification lookup
-- ============================================================================

-- Filter by record type
CREATE INDEX IF NOT EXISTS "token_maps_recordType_idx" ON "token_maps"("recordType");

-- Expiration tracking (cleanup job)
CREATE INDEX IF NOT EXISTS "token_maps_expiresAt_idx" ON "token_maps"("expiresAt");

-- Access tracking (audit)
CREATE INDEX IF NOT EXISTS "token_maps_lastAccessedAt_idx" ON "token_maps"("lastAccessedAt" DESC);
