/**
 * MCP Tools Index - Central export for all MCP tools
 *
 * This file provides a single import point for all tool modules.
 */

// Patient tools
export { patientTools } from './patient.tools';
export { patientCrudTools } from './patient-crud.tools';

// Clinical tools
export { clinicalNoteTools } from './clinical-note.tools';
export { diagnosisTools } from './diagnosis.tools';
export { medicationTools } from './medication.tools';
export { allergyTools } from './allergy.tools';

// Prescription tools
export { prescriptionTools } from './prescription.tools';

// Appointment tools
export { appointmentTools } from './appointment.tools';

// Scheduling tools (availability, time-off, waitlist)
export { schedulingTools, SCHEDULING_TOOL_COUNT } from './scheduling.tools';

// Messaging tools
export { messagingTools } from './messaging.tools';

// Document tools
export { documentTools, DOCUMENT_TOOL_COUNT } from './document.tools';

// Form tools
export { formTools, FORM_TOOL_COUNT } from './form.tools';

// Portal tools (notifications & preferences)
export { portalTools, PORTAL_TOOL_COUNT } from './portal.tools';

// Governance & admin tools
export { governanceTools } from './governance.tools';
export { featureFlagTools } from './feature-flag.tools';

// Lab tools (if exists)
export { labOrderTools } from './lab-order.tools';

// Referral tools (if exists)
export { referralTools } from './referral.tools';

// Settings tools (if exists)
export { settingsTools } from './settings.tools';

// Billing tools (if exists)
export { billingTools } from './billing.tools';

// AI tools (insights, feedback, usage stats)
export { aiTools, AI_TOOL_COUNT } from './ai.tools';

// Consent tools (LGPD/HIPAA compliance)
export { consentTools, CONSENT_TOOL_COUNT } from './consent.tools';

// Scribe tools (clinical recording & AI scribe)
export { scribeTools, SCRIBE_TOOL_COUNT } from './scribe.tools';

// Prevention tools (Prevention Hub - screenings, plans, recommendations)
export { preventionTools, PREVENTION_TOOL_COUNT } from './prevention.tools';

// Notification tools (send, delete, subscriptions, preferences)
export { notificationTools, NOTIFICATION_TOOL_COUNT } from './notification.tools';

// Search tools (patient search, clinical content search, global search)
export { searchTools, SEARCH_TOOL_COUNT } from './search.tools';

// Analytics tools (clinic statistics, reporting, trends, exports)
export { analyticsTools, ANALYTICS_TOOL_COUNT } from './analytics.tools';

// Clinical Decision Support tools (drug interactions, risk scores, care suggestions)
export { clinicalDecisionTools, CLINICAL_DECISION_TOOL_COUNT } from './clinical-decision.tools';

// Imaging tools (DICOM, radiology, study management)
export { imagingTools, IMAGING_TOOL_COUNT } from './imaging.tools';

// Calendar tools (provider availability, day view, slot management)
export { calendarTools, CALENDAR_TOOL_COUNT } from './calendar.tools';
