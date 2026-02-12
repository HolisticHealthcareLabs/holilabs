# Data Destruction Certificate

| Field | Value |
|-------|-------|
| **Certificate ID** | DDC-2026-001 |
| **Date** | 2026-02-12 |
| **Operation** | Operation Clean Room — Day 1 Reset |
| **Authorized By** | Ruth (VP Legal, Holi Labs) |
| **Executed By** | Archie (CTO, Holi Labs) |

---

## Section 1: Data Destroyed

All transaction and patient data was purged from the local development database.

### Patient Data

| Table | Pre-Purge Count | Post-Purge Count |
|-------|-----------------|------------------|
| patients | 18 | 0 |
| patient_users | 18 | 0 |
| patient_insurances | ~12 | 0 |
| patient_preferences | ~18 | 0 |
| patient_dossiers | ~18 | 0 |

### Clinical Transaction Data

| Table | Status |
|-------|--------|
| medications | Purged (CASCADE) |
| lab_results | Purged (CASCADE) |
| vital_signs | Purged (CASCADE) |
| diagnoses | Purged (CASCADE) |
| allergies | Purged (CASCADE) |
| prescriptions | Purged (CASCADE) |
| pharmacy_prescriptions | Purged (CASCADE) |
| medication_administrations | Purged (CASCADE) |
| medication_schedules | Purged (CASCADE) |
| medication_dispenses | Purged (CASCADE) |
| clinical_encounters | Purged (CASCADE) |
| clinical_notes | Purged (CASCADE) |
| clinical_note_versions | Purged (CASCADE) |
| soap_notes | Purged (CASCADE) |
| imaging_studies | Purged (CASCADE) |
| transcriptions | Purged (CASCADE) |
| scribe_sessions | Purged (CASCADE) |

### Governance & Audit Data

| Table | Status |
|-------|--------|
| governance_events | Purged |
| governance_logs | Purged |
| audit_logs | Purged |
| assurance_events | Purged |
| outcome_ground_truths | Purged |
| human_feedback | Purged |
| override_clusters | Purged |
| rule_proposals | Purged |

### Financial Data

| Table | Status |
|-------|--------|
| payments | Purged |
| invoices | Purged |
| invoice_line_items | Purged |
| insurance_claims | Purged |

### Communication Data

| Table | Status |
|-------|--------|
| conversations | Purged |
| conversation_messages | Purged |
| conversation_participants | Purged |
| messages | Purged |
| message_read_receipts | Purged |
| notifications | Purged |
| scheduled_reminders | Purged |

### Other Transaction Data

| Table | Status |
|-------|--------|
| appointments | Purged |
| waiting_lists | Purged |
| no_show_histories | Purged |
| consents | Purged |
| deletion_requests | Purged |
| data_access_grants | Purged |
| form_instances | Purged |
| form_audit_logs | Purged |
| ai_usage_logs | Purged |
| ai_content_feedback | Purged |
| token_maps | Purged |

---

## Section 2: Data Preserved

Master/configuration data retained for production use.

| Dataset | Count | Source |
|---------|-------|--------|
| Clinical Rules | 27 | `data/master/rules.json` (consolidated from 4 source files) |
| Feature Flags | 16 | `scripts/seed-master-data.ts` (production defaults) |
| ICD-10 Codes | 21 | `scripts/seed-master-data.ts` (core cardiovascular/renal/metabolic) |
| Medication Concepts | 5 | `scripts/seed-master-data.ts` (DOAC registry + warfarin) |
| Billing Codes (TUSS/CBHPM) | 6 | `data/master/tuss.json` (Bolivia + Brazil) |
| Appointment Type Configs | 4 | `scripts/seed-master-data.ts` |
| Treatment Protocols | 2 | `scripts/seed-master-data.ts` (AF + DVT) |

---

## Section 3: Method

| Step | Tool | Description |
|------|------|-------------|
| 1 | `scripts/reset_db_for_prod.sql` | SQL TRUNCATE CASCADE on all transaction tables |
| 2 | `scripts/nuclear-reset.ts` | TypeScript reset: `prisma migrate reset --force` + re-seed |
| 3 | `scripts/extract-master-data.ts` | IP extraction with PII scan (regex for MRN, email, phone, SSN, CPF) |

Primary tool going forward: `scripts/nuclear-reset.ts` (TypeScript, with safety gates).

---

## Section 4: Verification

### Post-Purge Counts

| Entity | Expected | Verified |
|--------|----------|----------|
| Patients | 0 | 0 |
| Clinical Rules | 27+ | 27 |
| Feature Flags | 16+ | 16 |
| ICD-10 Codes | 21 | 21 |
| Governance Logs | 0 | 0 |
| Audit Logs | 0 | 0 |

### PII Scan

| File | Scan Result |
|------|-------------|
| `data/master/rules.json` | CLEAN |
| `data/master/tuss.json` | CLEAN |

PII patterns checked: MRN (`P-\d{3}`), email, phone, SSN, CPF (Brazil), CI (Bolivia), common patient name patterns.

---

## Section 5: Compliance Notes

1. **All patient data was synthetic.** The 18 patients in the pilot database were generated using `scripts/generate-synthetic-data.ts` and Synthea. No real patient health information (PHI) was ever stored.

2. **LGPD Article 16 (Brazil):** Right to erasure satisfied. All personal data (even synthetic) has been permanently deleted. No backups of patient data exist.

3. **HIPAA Safe Harbor (US reference):** All 18 HIPAA identifiers were either absent (synthetic data had no real identifiers) or have been purged. De-identification pipeline (`packages/deid/`) remains intact for production use.

4. **Bolivia LGPD equivalent:** Bolivia's data protection framework (Ley 164, Decreto Supremo 1793) requires consent for data processing. Synthetic data was processed under development/testing exception. All records purged.

5. **Pilot artifacts preserved in `_archive/`.** Reports, scripts, and runbooks from the Series B pilot are retained for due diligence and audit trail purposes. These contain no patient PII — only aggregate statistics and clinical rule definitions.

---

## Digital Signatures

| Signatory | Role | Status |
|-----------|------|--------|
| Ruth | VP Legal | _Pending signature_ |
| Elena | CMO | _Pending signature_ |
| Archie | CTO | _Pending signature_ |

---

**This certificate should be retained for a minimum of 7 years per LGPD/HIPAA record retention requirements.**
