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
