# Product Requirements Document
## HoliLabs Clinical Intelligence Platform — v1.0 (Hospital-Ready Release)

**Document Classification:** CONFIDENTIAL — L3
**Version:** 1.0 | **Date:** April 4, 2026
**Product Owner:** Nico (nicola@holilabs.xyz)
**Engineering Lead:** Nico
**Status:** ACTIVE — Preparing for pilot deployment

---

## 1. Problem Statement

Brazilian physicians spend 35-45% of their clinical time on administrative tasks: writing notes, filling prescriptions, coding diagnoses for billing, and navigating disjointed software systems. This is not a productivity inconvenience — it is a patient safety issue. Physician burnout in Brazil has reached crisis levels, with studies showing over 60% of physicians reporting exhaustion symptoms. Fatigued physicians make more errors.

Meanwhile, Brazil's healthcare system is undergoing a forced digital transformation. The RNDS (Rede Nacional de Dados em Saúde) mandate requires interoperable health records. SNCR requires electronic prescriptions. ANVISA RDC 657/2022 opened a regulatory pathway for clinical decision support software. Yet the mid-market — clinics with 5-50 providers and hospitals with 50-300 beds — has no modern, cloud-native platform that unifies EHR, CDS, e-prescribing, and compliance in one product.

The cost of not solving this: physicians continue to burn out, clinical errors that could have been caught by decision support go undetected, clinics fail to meet regulatory mandates, and Brazil's digital health potential remains unrealized.

**Who is affected:** 546,000 physicians across 4,745 private hospitals and 300,000+ private clinics in Brazil, starting with the Sudeste and Sul regions.

**How often:** Every clinical encounter. A typical physician has 15-30 encounters per day, each requiring documentation, potential prescriptions, and billing.

---

## 2. Goals

### User Goals (What Physicians and Clinic Administrators Get)

**G1: Reduce documentation time by 50% per encounter.**
A physician completing a clinical encounter should spend no more than 3-5 minutes on documentation (SOAP notes, prescriptions, billing codes) compared to the current 8-12 minutes. Measured via in-app timing from encounter start to note finalization.

**G2: Zero missed critical drug interactions relative to the reference database in the first 12 months.**
The deterministic CDS engine must catch every RED-level alert (contraindicated drug-drug interactions, allergy conflicts, dose-range violations) that exists in our reference interaction database with a false-negative rate of 0%. Measured by post-hoc audit of all prescriptions against the same database. **Important limitation:** completeness is bounded by the reference database's coverage. The database source, version, update frequency, and known coverage gaps must be documented and disclosed to pilot clinics. A hospital's clinical review team will ask: "What drug interaction database do you use? How current is it? Who maintains it?" — we must have a clear answer.

**G3: Complete regulatory compliance without physician effort.**
LGPD consent, RNDS data submission, SNCR prescription formatting, and ANVISA CDS disclosure should happen automatically within the clinical workflow. The physician should never need to think about compliance — the platform handles it. Measured by compliance audit score and physician satisfaction surveys.

**G4: Patient self-service reduces front-desk calls by 30%.**
Patients should be able to schedule appointments, view records, download prescriptions, and manage consent through the patient portal without calling the clinic. Measured by call volume reduction at pilot clinics.

### Business Goals (What HoliLabs Gets)

**G5: 70% pilot-to-paid conversion within 90 days of pilot end.**
Of the first 10 pilot clinics, at least 7 convert to paying subscriptions. This validates product-market fit and pricing.

**G6: Net Revenue Retention >110% by month 12 of commercial operations.**
Clinics expand usage (adding providers, upgrading tiers, enabling additional modules) faster than any revenue lost to churn. This proves expansion revenue and deep workflow integration.

**G7: ANVISA Class I notification accepted within 6 months of submission.**
Regulatory clearance validates the product's clinical safety claims and unlocks hospital procurement conversations.

---

## 3. Non-Goals (Explicit Scope Exclusions)

**NG1: AI-driven autonomous clinical decisions.**
The CDS engine is deterministic (JSON-Logic). We do not use machine learning to recommend diagnoses or treatments. The AI scribe generates documentation suggestions, but every clinical assertion requires physician attestation. Rationale: ANVISA Class I requires deterministic behavior. ML-based CDS would require Class II or III registration, adding 12-24 months to market entry.

**NG2: US market compliance (HIPAA/HITRUST) in v1.**
The codebase has HIPAA-informed security controls (AES-256-GCM encryption, audit logging, RBAC), but we are not pursuing HIPAA BAAs, HITRUST certification, or US hospital sales in this release. Rationale: Brazil-first strategy. US entry requires separate funding and a 12-18 month certification process.

**NG3: Full hospital information system (HIS) replacement.**
We are not replacing laboratory information systems (LIS), radiology information systems (RIS/PACS), or pharmacy management systems. We integrate with them via FHIR/HL7. Rationale: attempting to be an all-in-one HIS is a multi-year, multi-million-dollar effort that would delay our core value proposition.

**NG4: Telehealth video infrastructure.**
While the platform supports telehealth scheduling and documentation, we do not build or host video calling infrastructure. Clinics use their existing video tools (Google Meet, Zoom Health, etc.) and document encounters in HoliLabs. Rationale: video is a commodity; clinical intelligence is our differentiation.

**NG5: Custom on-premise deployment.**
V1 is cloud-only (DigitalOcean App Platform, with Kubernetes migration path). We do not support on-premise installation. Rationale: on-premise adds 6-12 months of infrastructure engineering and makes updates and security patching exponentially harder.

---

## 4. User Personas and Stories

### Persona 1: Dr. Maria (Clinician — Primary User)

**Profile:** General practitioner at a 12-provider clinic in São Paulo. Sees 25 patients/day. Currently uses paper charts and a basic scheduling app. Frustrated by time spent on documentation and worried about missing drug interactions.

**Stories:**

- "As a clinician, I want to dictate my clinical notes during the encounter so that the platform generates a structured SOAP note I can review and sign, reducing my documentation time from 10 minutes to 3 minutes per encounter."

- "As a clinician, I want to be alerted with a RED warning when I prescribe a medication that interacts with the patient's current medications, so that I never accidentally prescribe a dangerous combination."

- "As a clinician, I want to sign prescriptions digitally using my ICP-Brasil certificate so that I can issue legally valid e-prescriptions without printing, signing by hand, and scanning."

- "As a clinician, I want to see a patient's complete medication history, lab results, and previous encounters in one screen so that I can make informed decisions without switching between systems."

- "As a clinician, I want the system to automatically suggest the correct TUSS billing code for my encounter so that I don't need to manually look up codes for insurance claims."

### Persona 2: Carla (Clinic Administrator — Secondary User)

**Profile:** Office manager at Dr. Maria's clinic. Manages scheduling, billing submissions, and patient communications. Currently juggles 3 different systems.

**Stories:**

- "As a clinic administrator, I want a dashboard showing today's appointments, pending billing claims, and overdue follow-ups so that I can manage the clinic's operations from one screen."

- "As a clinic administrator, I want to generate and submit insurance claims (guias TUSS) directly from completed encounters so that billing turnaround drops from 2 weeks to 2 days."

- "As a clinic administrator, I want to manage provider schedules, time-off, and recurring appointment blocks so that patients can self-schedule without calling the front desk."

- "As a clinic administrator, I want to export patient records in a format that meets LGPD data portability requirements so that I can respond to patient requests within the legal timeframe."

### Persona 3: João (Patient — Tertiary User)

**Profile:** 45-year-old patient of Dr. Maria's clinic. Has hypertension and type 2 diabetes. Manages multiple medications. Wants more control over his healthcare.

**Stories:**

- "As a patient, I want to view my prescriptions, lab results, and upcoming appointments through a secure portal so that I don't need to call the clinic for basic information."

- "As a patient, I want to receive appointment reminders via WhatsApp so that I don't miss follow-ups."

- "As a patient, I want to control who can access my health data and revoke consent at any time so that I feel confident my information is protected under LGPD."

- "As a patient, I want to request my complete medical records as a downloadable file so that I can share them with another provider if I switch clinics."

### Persona 4: Hospital IT Director (Enterprise Buyer)

**Profile:** Manages technology for a 200-bed hospital. Evaluates vendor security, integration capabilities, and regulatory compliance. Will not approve a system that can't pass the hospital's security questionnaire.

**Stories:**

- "As an IT director, I want to review a completed vendor security questionnaire with evidence for each claim so that I can assess HoliLabs against our hospital's security standards."

- "As an IT director, I want to verify that the platform supports FHIR R4 and can integrate with our existing EHR via standard APIs so that we don't create data silos."

- "As an IT director, I want to see ANVISA notification documentation and IEC 62304 compliance evidence so that I can confirm the platform meets medical device software standards."

- "As an IT director, I want role-based access control with at least 6 distinct roles so that clinical staff, administrative staff, and IT staff have appropriately scoped permissions."

---

## 5. Requirements

### 5.1 Must-Have (P0) — Cannot Ship Without

**R0: Offline/Degraded Mode (ADDED BY RED TEAM)**
When internet connectivity drops during an active encounter, the physician must not lose work. The platform must queue unsaved changes locally and sync when connectivity restores. At minimum: in-progress SOAP notes persist in browser memory, a visible "offline" indicator appears, and the sync resolves without data loss or duplication when reconnected.
- *Acceptance:* Given a physician mid-encounter, when WiFi drops for 5 minutes, then no data is lost. When connectivity returns, the note syncs automatically. If connectivity doesn't return within the session, the note is recoverable on next login.
- *Status:* NOT IMPLEMENTED. This is a critical gap. Brazilian clinics outside major corridors have unreliable internet. A physician who loses a note once will never trust the system again. Implementation approach: Service worker with IndexedDB queue for pending writes, conflict resolution via last-write-wins with server timestamp, visual connection status indicator.
- *Priority justification:* Moved to P0 after red team review. Without this, real-world deployment at clinics with imperfect connectivity will fail.

**R0b: Data Migration / Import (ADDED BY RED TEAM)**
Clinics transitioning from paper or a legacy system need a way to import existing patient demographics and current medication lists. Without historical data, the CDS engine cannot check drug interactions against medications the system doesn't know about — which destroys the core value proposition.
- *Acceptance:* Admin can upload a CSV file containing patient demographics (name, DOB, CPF, phone) and current medications. The system validates, encrypts PHI fields, and creates patient records. Duplicate detection by CPF. Error report for invalid rows.
- *Status:* NOT IMPLEMENTED. For v1 pilot, a manual CSV import tool is sufficient. Post-pilot: FHIR Bundle import, HL7 ADT parsing, and potentially a legacy system migration toolkit.

**R1: Clinical Encounter Workflow**
A complete encounter flow: create encounter, record chief complaint, AI-assisted SOAP note generation (dictation to structured note), review/edit, sign, and close. The physician must be able to complete the entire workflow without leaving the platform.
- *Acceptance:* Physician starts encounter, dictates notes via Deepgram, reviews AI-generated SOAP structure, edits as needed, signs with PIN, encounter closes with audit trail entry.
- *Status:* Implemented. SOAP notes with versioning and rollback exist. AI scribe pipeline operational.

**R2: Deterministic Clinical Decision Support**
Traffic-light CDS engine evaluating drug-drug interactions, allergy alerts, dose-range checks, and contraindication warnings. RED alerts block (require explicit override with attestation). YELLOW alerts warn. GREEN alerts proceed silently.
- *Acceptance:* Given a patient with Medication A, when a clinician prescribes Medication B with a known major interaction, then a RED alert fires with interaction details, override requires typed attestation, and the event is logged to the safety audit trail.
- *Status:* Implemented. JSON-Logic rule engine, safety envelope, attestation gate, override handler all operational. IEC 62304 documentation complete.

**R3: E-Prescription with ICP-Brasil Digital Signature**
Generate, sign, and transmit prescriptions compliant with SNCR requirements. Support for controlled substances (A1-C5 schedules per ANVISA classification). Digital signature verification via ICP-Brasil PKCS#7/CAdES.
- *Acceptance:* Given a valid prescription with all required fields, when the clinician enters their signing PIN, then the prescription is digitally signed, formatted per SNCR, and stored with tamper-proof hash.
- *Status:* Implemented. ICP-Brasil signer, ANVISA drug registry with CATMAT codes, schedule classification (A1-C5), prescription type determination all operational.

**R4: Patient Record Management**
Create, read, update patient records with PHI field-level encryption (AES-256-GCM). Search patients by tokenized identifiers. Complete medication history, encounter history, lab results.
- *Acceptance:* All PHI fields encrypted at rest with key versioning. Every record access creates an AuditLog entry with accessReason. Patient search works via tokenId without decrypting PHI.
- *Status:* Implemented. Prisma encryption extension auto-encrypts/decrypts all PHI fields. Audit chain operational.

**R5: Role-Based Access Control (8 Roles)**
Casbin RBAC with roles: ADMIN, PHYSICIAN, CLINICIAN, NURSE, RECEPTIONIST, LAB_TECH, PHARMACIST, STAFF. Default-deny policy. All API routes protected via createProtectedRoute middleware.
- *Acceptance:* Given a RECEPTIONIST user, when they attempt to access a SOAP note, then the request is denied with a 403 response. Given a PHYSICIAN, access is granted with audit log entry.
- *Status:* Implemented. Casbin RBAC with default-deny, 8 roles, IDOR protection, workspace boundaries.

**R6: Appointment Scheduling**
Create, reschedule, cancel appointments. Provider availability management. Recurring appointment blocks. Waitlist functionality. Patient self-scheduling via portal.
- *Acceptance:* Patient can book available slots through portal. Provider time-off blocks prevent booking. Reminders sent via configured channels.
- *Status:* Implemented. Full scheduling lifecycle with provider availability, time-off, recurring appointments, waitlist.

**R7: Patient Portal**
Secure patient-facing dashboard: view appointments, medications, records, documents, health metrics. LGPD privacy controls (consent management, data export, erasure request).
- *Acceptance:* Patient logs in via OTP/magic link, sees dashboard with upcoming appointments, current medications, and recent results. Can request data export and exercise LGPD rights.
- *Status:* Implemented. 20+ portal pages including dashboard, medications, records, consultations, documents, forms, health metrics, security, notifications.

**R8: Audit Trail and LGPD Compliance**
Tamper-evident audit logging for all data access and modifications. Consent management. Data subject rights (access, correction, portability, deletion, consent revocation). Processing records per LGPD Art. 37.
- *Acceptance:* Every PHI access logged with userId, action, accessReason, timestamp. Patient can export all their data as structured JSON. Erasure request triggers anonymization pipeline.
- *Status:* Implemented (audit chain, consent gates, export/erasure endpoints). Documentation (RIPD, processing records) pending — Agent 4 deliverable.

### 5.2 Should-Have (P1) — Ship Without But Prioritize Next

**R9: Billing Claim Generation (TUSS/ANS)**
Auto-generate insurance claim forms (guias) from completed encounters with TUSS procedure codes and ANS formatting. Submit to operadoras via API or export for manual submission.
- *Acceptance:* Given a completed encounter with diagnosis and procedures, the system generates a TUSS-coded claim ready for submission.
- *Status:* Partially implemented. Billing routes exist, TUSS crosswalk operational. Two test files skipped — needs validation with real claim flows.

**R10: FHIR R4 Interoperability**
Export and import patient records in FHIR R4 format. RNDS-compatible profiles. Configurable FHIR server sync for hospital integration.
- *Acceptance:* Patient record exportable as FHIR R4 Bundle. FHIR sync configurable per organization. RNDS profiles supported.
- *Status:* Implemented but feature-flagged off (FEATURE_FHIR_SYNC=false). Medplum core integrated. Needs live testing with RNDS endpoints.

**R11: WhatsApp Appointment Reminders**
Automated appointment reminders via Twilio WhatsApp Business API. Configurable timing (24h, 2h before appointment). Confirmation/reschedule flow.
- *Acceptance:* Patient receives WhatsApp message 24h before appointment with confirm/reschedule buttons. Response updates appointment status.
- *Status:* Twilio integration exists. WhatsApp-specific flow needs validation.

**R12: Multi-Language Support (Portuguese/English/Spanish)**
Full i18n with next-intl. Portuguese as primary. English for international features. Spanish for Colombian expansion.
- *Acceptance:* All user-facing strings localized. Language switcher in settings. Locale-specific date/number formatting.
- *Status:* Implemented. next-intl v4.5.3, locale routing, validation script for translation keys.

### 5.3 Future Considerations (P2) — Design For, Build Later

**R13: Hospital Information System Integration**
Bidirectional integration with legacy HIS (MV, Tasy, Pixeon) via HL7v2 ADT messages, lab results (ORU), and orders (ORM).
- *Technical note:* HL7 ORU parser exists in codebase. Full ADT/ORM support requires dedicated integration engineering per hospital.

**R14: Clinical Quality Measures Dashboard**
Aggregate de-identified clinical data to show quality metrics: prescribing patterns, alert override rates, encounter volumes, wait times.
- *Technical note:* Analytics pipeline should use de-identified data only (LGPD Art. 7). PostHog (HIPAA-compliant) already integrated.

**R15: AI-Powered Differential Diagnosis Support**
Symptom-to-diagnosis suggestion engine using deterministic decision trees (not ML). Would require ANVISA Class I re-notification with expanded intended use.
- *Technical note:* Symptom diagnosis engine already exists in codebase (src/lib/clinical/engines/). Needs clinical validation before exposure to users.

**R16: Pharmacy Integration (SNGPC)**
Submit controlled substance dispensing records to ANVISA's SNGPC system. Track prescription fulfillment across pharmacy network.
- *Technical note:* Requires SNGPC API integration and pharmacy partner agreements.

---

## 6. Success Metrics

### Leading Indicators (Days to Weeks Post-Launch)

| Metric | Target | Stretch | Measurement |
|--------|--------|---------|-------------|
| **Pilot adoption rate** | 80% of invited clinicians actively using within 2 weeks | 100% within 1 week | Daily active clinician count / total invited |
| **Encounters per clinician per day** | 10+ encounters recorded in-platform | 20+ (full patient load) | Encounter count / active clinicians / days |
| **Documentation time per encounter** | <5 minutes (from encounter start to note signed) | <3 minutes | In-app timing: encounter_created to soap_signed timestamps |
| **CDS alert accuracy** | 0 false negatives on RED alerts | 0 false negatives on YELLOW | Post-hoc audit of all prescriptions against interaction DB |
| **System uptime** | 99.5% during clinic hours (8am-8pm BRT) | 99.9% | Health endpoint monitoring |
| **Error rate** | <1% of API requests return 5xx | <0.1% | Sentry error tracking |

### Lagging Indicators (Weeks to Months)

| Metric | Target | Stretch | Evaluation Point |
|--------|--------|---------|-----------------|
| **Pilot-to-paid conversion** | 70% | 90% | 90 days post-pilot end |
| **Net Revenue Retention** | 110% | 125% | 12 months post-first-payment |
| **Monthly churn** | <3% | <1% | Rolling 3-month average |
| **Patient portal adoption** | 30% of patients create accounts | 50% | 6 months post-clinic-launch |
| **Front-desk call reduction** | 30% fewer scheduling calls | 50% | 3 months post-portal-launch |
| **Physician NPS** | >50 | >70 | Quarterly survey |
| **Prescription error rate** | 0 missed critical interactions | Same | 12-month post-hoc audit |

---

## 7. Technical Architecture Summary

### Stack

Next.js 14 monorepo (pnpm), Prisma 6.7.0, PostgreSQL 16, Redis 7, Jest + Playwright + AxeBuilder + k6. Deployed on DigitalOcean App Platform with Kubernetes migration path.

### Key Architecture Decisions

**Field-level encryption over database-level:** We encrypt individual PHI fields (AES-256-GCM with key versioning) rather than using transparent database encryption. This means PHI is protected even if someone gains database access, and we can rotate keys per-field without downtime.

**Deterministic CDS over ML:** JSON-Logic rules evaluated in parallel, wrapped in a safety envelope. This qualifies for ANVISA Class I (simplified notification) and eliminates the explainability problem of ML-based CDS.

**Multi-provider AI:** Gemini 2.5 Flash (primary, cost-efficient), Claude (complex reasoning), GPT-4o (fallback), with Ollama local fallback if all cloud providers fail. No single AI vendor dependency.

**Casbin RBAC over custom auth:** Mature, battle-tested policy engine with default-deny semantics. 8 roles with fine-grained resource permissions. Policy changes don't require code deploys.

### Security Posture

OWASP ASVS Level 2 verified (Sprint 6, Agent 2). All P0/P1 findings remediated. Key controls: bcrypt password hashing, Twilio MFA, 30-minute JWT sessions, rate limiting on all endpoints, CSP nonce-based headers, HSTS with preload, body size limits, content-type validation, PHI field encryption with key rotation.

### Infrastructure

24 CI/CD workflows including SAST (CodeQL), dependency scanning (Trivy), DAST, load testing (k6), and automated database backups. Health check endpoints for Kubernetes probes (liveness, readiness, startup). Canary deployment with automatic rollback.

---

## 8. Open Questions

| # | Question | Owner | Blocking? |
|---|----------|-------|-----------|
| 1 | Which 5-10 São Paulo clinics should we target for the pilot? Need: 5-15 providers, physician-owner, paper-based or basic digital, open to innovation. | Nico (BD) | Yes — blocks pilot start |
| 2 | Is a research/evaluation agreement sufficient for pre-ANVISA pilot, or do we need formal notification first? | Legal counsel | Yes — blocks pilot start |
| 3 | What is the exact monthly cost of running the full stack on DigitalOcean for 10 concurrent clinics (~100 providers)? | Nico (Eng) | No — estimate within 2 weeks |
| 4 | Should the pilot be completely free, or should we charge a nominal fee to validate willingness to pay? | Nico (Strategy) | No — decide before pilot launch |
| 5 | Do we need a clinical advisor on retainer during the pilot, or can we validate CDS rules with published drug interaction databases? | Nico (Clinical) | No — but recommended |
| 6 | What is the actual processing time for AFE application in São Paulo VISA? Published timeline is 30-60 days; real-world may differ. | Regulatory consultant | No — but affects timeline |
| 7 | Should billing (R9) be included in the pilot scope or deferred to post-pilot? | Nico (Product) | No — decide by Week 2 |

---

## 9. Timeline and Phasing

### Phase 1: Pilot-Ready (Now - May 9, 2026) — 5 weeks

| Week | Focus | Deliverable |
|------|-------|-------------|
| 1 | Agent 4 (LGPD docs) + Agent 5 (TypeScript cleanup) | RIPD, privacy policy, type safety report |
| 2 | Agent 6 (integration merge) + staging environment setup | Hospital-ready branch merged, staging deployed |
| 3 | End-to-end clinical workflow validation (manual) | Bug list, UX fixes, workflow sign-off |
| 4 | Load testing + lightweight security scan | Performance report, pentest engagement scheduled |
| 5 | Pilot onboarding materials + clinic outreach | Quickstart guide, known-limitations doc, 3+ clinics confirmed |

### Phase 2: Pilot Execution (May 12 - August 8, 2026) — 13 weeks

| Week | Focus |
|------|-------|
| 1-2 | Onboard first 3 clinics, intensive hand-holding |
| 3-4 | Onboard remaining clinics (up to 10), collect feedback |
| 5-8 | Rapid iteration based on feedback, weekly releases |
| 9-12 | Stabilize, collect outcomes data, prepare conversion conversations |
| 13 | Pilot review, conversion offers, first paid customers |

### Phase 3: Commercialization (August 2026+)

Standard commercial sales cycle. Pricing validated, case studies published, first hires made.

---

## 10. Dependencies

| Dependency | Owner | Impact if Delayed |
|-----------|-------|-------------------|
| AFE application submitted | Nico + regulatory consultant | Delays ANVISA notification by equivalent time |
| Staging environment with real credentials (Twilio, DB, Redis, AI) | Nico (Eng) | Blocks end-to-end validation |
| Pilot clinic agreements signed | Nico (BD) | Blocks pilot start |
| DPO designated (LGPD Art. 41) | Nico (Legal) | Non-compliance risk during pilot |
| Pentest scheduled | Nico (Security) | Delays hospital entry (Phase 3) |
| Clinical advisor engaged | Nico (Clinical) | Reduced confidence in CDS rule validation |

---

## 11. Acceptance Criteria for "Hospital-Ready" Release

The v1.0 release is considered hospital-ready when ALL of the following are true:

- [ ] All P0 requirements (R0-R8) pass end-to-end testing with real clinical workflows
- [ ] At least 3 physicians have completed a full encounter workflow (create patient → encounter → SOAP → prescribe → sign → close) and provided feedback
- [ ] At least 5 customer discovery interviews completed with target clinic owners validating pricing and feature priority
- [ ] Zero RED-level CDS false negatives in test suite (3,000+ passing tests)
- [ ] OWASP ASVS Level 2 checklist has zero P0 or P1 FAILs
- [ ] IEC 62304 documentation complete with 0 orphaned requirements in traceability matrix
- [ ] LGPD documentation complete (RIPD, processing records, privacy policy, incident plan, DPO template)
- [ ] Staging environment deployed and stable for 72+ hours under simulated load
- [ ] Vendor security questionnaire (SIG Lite format) completed with evidence
- [ ] Pilot onboarding materials reviewed by at least one practicing physician
- [ ] Health check endpoints responding correctly on staging
- [ ] Backup/DR plan documented and tested (at least one restore drill)
- [ ] AFE application submitted (or regulatory counsel confirms pilot can proceed without it)

---

*This PRD is a living document. Updated based on pilot feedback, regulatory developments, and market conditions.*

---

**References:**

- ANVISA. "RDC No. 657 of 24 March 2022."
- Bessemer Venture Partners. "Benchmarks for Growing Health Tech Businesses."
- OWASP. "Application Security Verification Standard 4.0.3."
- IEC 62304:2006+AMD1:2015. "Medical device software — Software life cycle processes."
- ISO 14971:2019. "Medical devices — Application of risk management to medical devices."
- LGPD. Lei No. 13.709, August 14, 2018.
