# MCP Tool Registry

**Clinical Assurance Platform - Definitive Tool Inventory**

**Total Tools: 216**
**Last Updated: January 29, 2026**

---

## Overview

This document is the authoritative registry of all MCP (Model Context Protocol) tools available to AI agents in the Clinical Assurance Platform. Tools are organized by category and file, with descriptions of their capabilities.

---

## Tool Categories

| Category | File | Tool Count | Description |
|----------|------|------------|-------------|
| Portal | portal.tools.ts | 23 | Patient portal operations |
| Appointment | appointment.tools.ts | 12 | Scheduling and appointment management |
| Form | form.tools.ts | 11 | Form creation and management |
| Scribe | scribe.tools.ts | 11 | Medical transcription and SOAP notes |
| Search | search.tools.ts | 11 | Global and specialized search |
| Analytics | analytics.tools.ts | 10 | Clinic statistics and reporting |
| Clinical Decision | clinical-decision.tools.ts | 10 | Drug interactions, alerts, CDS |
| Prevention | prevention.tools.ts | 10 | Preventive care plans and screenings |
| Scheduling | scheduling.tools.ts | 10 | Availability and waitlist management |
| Lab Order | lab-order.tools.ts | 9 | Lab orders and results |
| Messaging | messaging.tools.ts | 9 | Secure messaging |
| Governance | governance.tools.ts | 8 | Safety rules and medication governance |
| Notification | notification.tools.ts | 8 | Push notifications and preferences |
| Billing | billing.tools.ts | 7 | Claims and insurance |
| Medication | medication.tools.ts | 7 | Prescriptions and interactions |
| Document | document.tools.ts | 6 | Document management and sharing |
| Settings | settings.tools.ts | 6 | User and clinic preferences |
| Consent | consent.tools.ts | 5 | LGPD/HIPAA consent management |
| Patient | patient.tools.ts | 5 | Patient data retrieval |
| Prescription | prescription.tools.ts | 5 | Prescription workflow |
| Referral | referral.tools.ts | 5 | Specialist referrals |
| Imaging | imaging.tools.ts | 4 | DICOM studies and radiology |
| Calendar | calendar.tools.ts | 4 | Provider availability and day view |
| Clinical Note | clinical-note.tools.ts | 4 | Clinical documentation |
| Feature Flag | feature-flag.tools.ts | 4 | Feature toggle management |
| AI | ai.tools.ts | 3 | AI insights and feedback |
| Allergy | allergy.tools.ts | 3 | Allergy CRUD |
| Diagnosis | diagnosis.tools.ts | 3 | Diagnosis CRUD |
| Patient CRUD | patient-crud.tools.ts | 3 | Patient create/update/delete |

---

## Complete Tool Listing by File

### ai.tools.ts (3 tools)
AI insights and feedback capabilities.

| Tool | Description |
|------|-------------|
| `get_ai_insights` | Get AI-powered clinical insights for a patient |
| `get_ai_usage_stats` | Get AI usage statistics for the clinic |
| `provide_ai_feedback` | Submit feedback on AI recommendations |

---

### allergy.tools.ts (3 tools)
Patient allergy management.

| Tool | Description |
|------|-------------|
| `create_allergy` | Record a new patient allergy |
| `update_allergy` | Update allergy details |
| `delete_allergy` | Remove an allergy record |

---

### analytics.tools.ts (10 tools)
Clinic analytics and reporting.

| Tool | Description |
|------|-------------|
| `get_clinic_statistics` | Get overall clinic statistics |
| `get_revenue_summary` | Get revenue summary by period |
| `get_patient_demographics` | Get patient demographic breakdown |
| `get_appointment_analytics` | Get appointment statistics |
| `get_provider_productivity` | Get provider productivity metrics |
| `get_quality_metrics` | Get clinical quality metrics |
| `get_patient_flow` | Get patient flow analysis |
| `get_trend_analysis` | Get trend analysis for key metrics |
| `generate_report` | Generate a custom report |
| `export_data` | Export analytics data |

---

### appointment.tools.ts (12 tools)
Appointment scheduling and management.

| Tool | Description |
|------|-------------|
| `create_appointment` | Schedule a new appointment |
| `get_appointment` | Get appointment details by ID |
| `update_appointment` | Modify appointment details |
| `delete_appointment` | Permanently delete an appointment |
| `cancel_appointment` | Cancel an appointment with reason |
| `reschedule_appointment` | Reschedule to a new time |
| `list_appointments` | List appointments with filters |
| `get_patient_appointments` | Get all appointments for a patient |
| `get_clinician_appointments` | Get clinician's appointments |
| `get_available_slots` | Find available time slots |
| `get_clinician_schedule` | Get clinician's schedule |
| `send_appointment_reminder` | Send reminder notification |

---

### calendar.tools.ts (4 tools)
Provider calendar and day view management.

| Tool | Description |
|------|-------------|
| `get_provider_availability` | Get provider's availability for a date range |
| `block_slot` | Block a time slot on provider's calendar |
| `swap_appointments` | Swap two appointments between time slots |
| `get_day_view` | Get complete day view for a provider |

---

### billing.tools.ts (7 tools)
Insurance and claims management.

| Tool | Description |
|------|-------------|
| `submit_claim` | Submit insurance claim |
| `get_claim` | Get claim details |
| `list_claims` | List claims with filters |
| `update_claim_status` | Update claim status |
| `get_patient_insurance` | Get patient's insurance info |
| `create_patient_insurance` | Add insurance to patient |
| `update_patient_insurance` | Update insurance details |

---

### clinical-decision.tools.ts (10 tools)
Clinical decision support tools.

| Tool | Description |
|------|-------------|
| `check_drug_interactions` | Check for drug-drug interactions |
| `check_allergy_interactions` | Check medication against allergies |
| `get_vital_alerts` | Get alerts for abnormal vitals |
| `get_lab_alerts` | Get alerts for abnormal lab values |
| `get_clinical_reminders` | Get clinical reminders for patient |
| `calculate_risk_scores` | Calculate clinical risk scores |
| `validate_order` | Validate clinical order |
| `get_preventive_care_gaps` | Identify preventive care gaps |
| `generate_differential_diagnosis` | Generate differential diagnoses |
| `get_care_suggestions` | Get AI-powered care suggestions |

---

### clinical-note.tools.ts (4 tools)
Clinical documentation.

| Tool | Description |
|------|-------------|
| `create_clinical_note` | Create a new clinical note |
| `get_clinical_notes` | Get notes for a patient |
| `update_clinical_note` | Update note content |
| `delete_clinical_note` | Delete a clinical note |

---

### consent.tools.ts (5 tools)
LGPD/HIPAA consent management.

| Tool | Description |
|------|-------------|
| `create_consent` | Create a new consent record |
| `get_consent` | Get consent by ID |
| `get_patient_consents` | Get all consents for patient |
| `revoke_consent` | Revoke an existing consent |
| `update_consent_preferences` | Update consent preferences |

---

### diagnosis.tools.ts (3 tools)
Patient diagnosis management.

| Tool | Description |
|------|-------------|
| `create_diagnosis` | Add a diagnosis to patient |
| `update_diagnosis` | Update diagnosis details |
| `delete_diagnosis` | Remove a diagnosis |

---

### document.tools.ts (6 tools)
Document management and sharing.

| Tool | Description |
|------|-------------|
| `create_document` | Upload/create a document |
| `get_document` | Get document by ID |
| `update_document` | Update document metadata |
| `delete_document` | Delete a document |
| `list_documents` | List documents with filters |
| `share_document` | Share document with recipient |

---

### feature-flag.tools.ts (4 tools)
Feature toggle management.

| Tool | Description |
|------|-------------|
| `get_feature_flag` | Get feature flag status |
| `create_feature_flag` | Create a new feature flag |
| `update_feature_flag` | Update feature flag value |
| `delete_feature_flag` | Delete a feature flag |

---

### form.tools.ts (11 tools)
Form creation and management.

| Tool | Description |
|------|-------------|
| `create_form` | Create a new form template |
| `get_form` | Get form template by ID |
| `update_form` | Update form template |
| `delete_form` | Delete a form template |
| `list_forms` | List available forms |
| `send_form` | Send form to patient |
| `get_form_instance` | Get filled form instance |
| `update_form_instance` | Update form instance |
| `delete_form_instance` | Delete form instance |
| `list_form_instances` | List form instances |
| `get_form_responses` | Get form response data |

---

### governance.tools.ts (8 tools)
Safety rules and medication governance.

| Tool | Description |
|------|-------------|
| `evaluate_rule` | Evaluate a governance rule |
| `get_medication_rules` | Get medication safety rules |
| `check_medication_safety` | Check medication safety |
| `get_patient_safety_context` | Get safety context for patient |
| `log_governance_override` | Log a governance override |
| `match_contraindications` | Match contraindications |
| `get_governance_stats` | Get governance statistics |
| `run_slow_lane_audit` | Run async audit job |

---

### imaging.tools.ts (4 tools)
DICOM studies and radiology management.

| Tool | Description |
|------|-------------|
| `get_study` | Get imaging study details by ID |
| `list_series` | List imaging studies for a patient with filters |
| `get_dicom_url` | Generate secure DICOM viewer URL |
| `share_study` | Share imaging study with external provider |

---

### lab-order.tools.ts (9 tools)
Lab orders and results.

| Tool | Description |
|------|-------------|
| `create_lab_order` | Create a new lab order |
| `get_lab_results` | Get formatted lab results |
| `get_lab_results_raw` | Get raw lab result data |
| `get_pending_labs` | Get pending lab orders |
| `create_lab_result` | Record a lab result |
| `update_lab_result` | Update lab result |
| `flag_critical_result` | Flag result as critical |
| `get_lab_panel_definitions` | Get lab panel definitions |
| `order_lab_panel` | Order a lab panel |

---

### medication.tools.ts (7 tools)
Medication and prescription management.

| Tool | Description |
|------|-------------|
| `create_medication_draft` | Create medication draft |
| `prescribe_medication` | Prescribe medication |
| `update_medication` | Update medication details |
| `discontinue_medication` | Discontinue a medication |
| `get_medication_by_id` | Get medication by ID |
| `get_medication_interactions` | Get medication interactions |
| `get_interaction_data` | Get detailed interaction data |

---

### messaging.tools.ts (9 tools)
Secure messaging system.

| Tool | Description |
|------|-------------|
| `create_conversation` | Create a new conversation |
| `get_conversation` | Get conversation by ID |
| `get_conversations` | List conversations |
| `update_conversation` | Update conversation |
| `delete_conversation` | Delete conversation |
| `create_message` | Send a message |
| `get_messages` | Get messages in conversation |
| `update_message` | Update a message |
| `delete_message` | Delete a message |

---

### notification.tools.ts (8 tools)
Push notifications and preferences.

| Tool | Description |
|------|-------------|
| `send_notification` | Send a notification |
| `get_notification_preferences` | Get notification preferences |
| `update_notification_preferences` | Update preferences |
| `get_push_subscriptions` | Get push subscriptions |
| `subscribe_to_events` | Subscribe to event types |
| `unsubscribe_from_events` | Unsubscribe from events |
| `get_unread_count` | Get unread notification count |
| `delete_notification` | Delete a notification |

---

### patient.tools.ts (5 tools)
Patient data retrieval.

| Tool | Description |
|------|-------------|
| `get_patient` | Get patient by ID |
| `search_patients` | Search patients |
| `get_patient_medications` | Get patient's medications |
| `get_patient_conditions` | Get patient's conditions |
| `get_patient_allergies` | Get patient's allergies |

---

### patient-crud.tools.ts (3 tools)
Patient create/update/delete.

| Tool | Description |
|------|-------------|
| `create_patient` | Create a new patient |
| `update_patient` | Update patient details |
| `delete_patient` | Delete a patient record |

---

### portal.tools.ts (23 tools)
Patient portal operations.

| Tool | Description |
|------|-------------|
| `get_portal_health_summary` | Get patient health summary |
| `get_portal_appointments` | Get upcoming appointments |
| `get_portal_medications` | Get active medications |
| `get_portal_lab_results` | Get lab results |
| `get_portal_documents` | Get patient documents |
| `get_portal_messages` | Get portal messages |
| `send_portal_message` | Send a portal message |
| `request_appointment_change` | Request appointment change |
| `request_medication_refill` | Request medication refill |
| `update_portal_contact_info` | Update contact information |
| `get_preferences` | Get portal preferences |
| `update_preferences` | Update portal preferences |
| `get_notifications` | Get portal notifications |
| `mark_notification_read` | Mark notification as read |
| `mark_all_notifications_read` | Mark all notifications read |
| `create_notification` | Create a notification |
| `share_document_with_patient` | Share document with patient |
| `get_access_requests` | Get access requests |
| `approve_access_request` | Approve access request |
| `deny_access_request` | Deny access request |
| `request_family_access` | Request family portal access for a patient |
| `get_family_members` | Get list of family members with portal access |
| `update_insurance` | Create or update patient insurance information |

---

### prescription.tools.ts (5 tools)
Prescription workflow.

| Tool | Description |
|------|-------------|
| `list_prescriptions` | List prescriptions |
| `get_prescription_status` | Get prescription status |
| `update_prescription_status` | Update prescription status |
| `send_to_pharmacy` | Send to pharmacy |
| `refill_medication` | Process medication refill |

---

### prevention.tools.ts (10 tools)
Preventive care management.

| Tool | Description |
|------|-------------|
| `create_prevention_plan` | Create prevention plan |
| `get_prevention_plan` | Get prevention plan |
| `update_prevention_plan` | Update prevention plan |
| `list_prevention_plans` | List prevention plans |
| `add_screening` | Add screening to plan |
| `complete_screening` | Mark screening complete |
| `get_due_screenings` | Get due screenings |
| `create_prevention_task` | Create prevention task |
| `update_prevention_task` | Update prevention task |
| `get_prevention_recommendations` | Get AI recommendations |

---

### referral.tools.ts (5 tools)
Specialist referrals.

| Tool | Description |
|------|-------------|
| `create_referral` | Create a referral |
| `get_referral` | Get referral by ID |
| `update_referral` | Update referral |
| `delete_referral` | Delete referral |
| `list_referrals` | List referrals |

---

### scheduling.tools.ts (10 tools)
Availability and waitlist management.

| Tool | Description |
|------|-------------|
| `get_clinician_availability` | Get clinician availability |
| `set_clinician_availability` | Set clinician availability |
| `create_time_off` | Create time-off request |
| `get_time_off` | Get time-off requests |
| `delete_time_off` | Delete time-off request |
| `get_scheduling_conflicts` | Find scheduling conflicts |
| `suggest_optimal_slots` | AI-suggested optimal slots |
| `get_waitlist` | Get waitlist entries |
| `add_to_waitlist` | Add patient to waitlist |
| `remove_from_waitlist` | Remove from waitlist |

---

### scribe.tools.ts (11 tools)
Medical transcription and SOAP notes.

| Tool | Description |
|------|-------------|
| `start_recording_session` | Start audio recording |
| `stop_recording_session` | Stop recording |
| `get_recording_session` | Get recording session |
| `list_recording_sessions` | List recording sessions |
| `get_transcription` | Get transcription text |
| `update_transcription` | Update transcription |
| `generate_soap_note` | Generate SOAP note from transcript |
| `extract_clinical_findings` | Extract clinical findings |
| `finalize_clinical_note` | Finalize and sign note |
| `get_scribe_templates` | Get scribe templates |
| `asc` | Additional scribe command |

---

### search.tools.ts (11 tools)
Global and specialized search.

| Tool | Description |
|------|-------------|
| `search_patients` | Search patients |
| `search_appointments` | Search appointments |
| `search_medications` | Search medications |
| `search_diagnoses` | Search diagnoses |
| `search_procedures` | Search procedures |
| `search_clinical_content` | Search clinical content |
| `global_search` | Global search across entities |
| `get_recent_searches` | Get recent search history |
| `save_search` | Save a search query |
| `get_saved_searches` | Get saved searches |
| `asc` | Additional search command |

---

### settings.tools.ts (6 tools)
User and clinic preferences.

| Tool | Description |
|------|-------------|
| `get_user_settings` | Get user settings |
| `update_user_settings` | Update user settings |
| `get_doctor_preferences` | Get doctor preferences |
| `update_doctor_preferences` | Update doctor preferences |
| `get_clinical_template` | Get clinical template |
| `list_clinical_templates` | List clinical templates |

---

## Tool Access Permissions

Tools are gated by role-based permissions:

| Role | Access Level |
|------|--------------|
| `ADMIN` | All tools |
| `CLINICIAN` | Clinical, patient, scheduling, prescribing |
| `NURSE` | Clinical (read), patient, vitals, messaging |
| `RECEPTIONIST` | Appointments, patient demographics |
| `BILLING` | Billing, claims, insurance |
| `PATIENT` | Portal tools only |
| `AGENT` | All tools (programmatic access) |

---

## Integration Points

### API Endpoint
All tools are accessible via:
```
POST /api/agent
Content-Type: application/json

{
  "tool": "tool_name",
  "params": { ... }
}
```

### Real-Time Updates
Tools that modify state emit Socket.IO events for UI synchronization:
- `governance:*` - Governance rule updates
- `task:*` - Task status changes
- `appointment:*` - Appointment updates
- `notification:*` - New notifications

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.1.0 | 2026-01-29 | Added 11 new tools: imaging (4), calendar (4), portal (3) |
| 1.0.0 | 2026-01-29 | Initial registry with 205 tools |
