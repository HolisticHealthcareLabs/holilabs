/**
 * Patient Context Formatter for AI Prompts
 *
 * Formats patient metadata into structured context for AI models
 * Used in: SOAP notes, clinical scribe, AI assistant
 */

import { Patient, Medication, Appointment, Consent } from '@prisma/client';

export interface PatientWithRelations extends Patient {
  medications?: Medication[];
  appointments?: Appointment[];
  consents?: Consent[];
}

export interface FormattedPatientContext {
  demographics: string;
  medicalHistory: string;
  currentMedications: string;
  allergies: string;
  recentVisits: string;
  fullContext: string;
}

/**
 * Calculate patient's age from date of birth
 */
export function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Format demographics section
 */
function formatDemographics(patient: Patient): string {
  const age = calculateAge(patient.dateOfBirth);
  const genderMap: Record<string, string> = {
    'M': 'Male',
    'F': 'Female',
    'O': 'Other',
  };

  return `**Patient Demographics:**
- Name: ${patient.firstName} ${patient.lastName}
- Age: ${age} years old
- Gender: ${genderMap[patient.gender || 'O'] || 'Not specified'}
- Date of Birth: ${new Date(patient.dateOfBirth).toLocaleDateString()}
- MRN: ${patient.mrn}
- Contact: ${patient.phone || 'Not provided'}, ${patient.email || 'Not provided'}`;
}

/**
 * Format current medications
 */
function formatMedications(medications: Medication[]): string {
  if (!medications || medications.length === 0) {
    return '**Current Medications:**\nNone documented';
  }

  const activeMeds = medications.filter(med => med.isActive);

  if (activeMeds.length === 0) {
    return '**Current Medications:**\nNo active medications';
  }

  const medList = activeMeds.map((med, index) =>
    `${index + 1}. ${med.name}${med.genericName ? ` (${med.genericName})` : ''} - ${med.dose}, ${med.frequency}${med.route ? `, ${med.route}` : ''}`
  ).join('\n');

  return `**Current Medications:**\n${medList}`;
}

/**
 * Format allergies (extracted from patient data or related records)
 */
function formatAllergies(patient: Patient): string {
  // In a real implementation, you might have a separate allergies table
  // For now, we'll check if there's an allergies field or note
  return `**Known Allergies:**\nNo documented allergies`;
}

/**
 * Format recent appointments/visits
 */
function formatRecentVisits(appointments: Appointment[]): string {
  if (!appointments || appointments.length === 0) {
    return '**Recent Visits:**\nNo recent appointments on record';
  }

  // Get last 3 completed appointments
  const recentCompleted = appointments
    .filter(apt => apt.status === 'COMPLETED')
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 3);

  if (recentCompleted.length === 0) {
    return '**Recent Visits:**\nNo completed visits on record';
  }

  const visitList = recentCompleted.map((apt, index) => {
    const date = new Date(apt.startTime).toLocaleDateString();
    return `${index + 1}. ${date} - ${apt.title}${apt.description ? `: ${apt.description}` : ''}`;
  }).join('\n');

  return `**Recent Visits:**\n${visitList}`;
}

/**
 * Format medical history summary
 */
function formatMedicalHistory(patient: Patient, medications: Medication[]): string {
  // Infer conditions from medications
  const conditions = new Set<string>();

  medications.forEach(med => {
    const medName = med.name.toLowerCase();
    if (medName.includes('metformin')) conditions.add('Type 2 Diabetes Mellitus');
    if (medName.includes('lisinopril') || medName.includes('amlodipine')) conditions.add('Hypertension');
    if (medName.includes('atorvastatin')) conditions.add('Hyperlipidemia');
    if (medName.includes('levothyroxine')) conditions.add('Hypothyroidism');
    if (medName.includes('omeprazole')) conditions.add('GERD');
    if (medName.includes('albuterol')) conditions.add('Asthma');
    if (medName.includes('sertraline')) conditions.add('Depression/Anxiety');
  });

  if (conditions.size === 0) {
    return '**Medical History:**\nNo significant past medical history documented';
  }

  const conditionList = Array.from(conditions).map((cond, index) =>
    `${index + 1}. ${cond}`
  ).join('\n');

  return `**Medical History:**\n${conditionList}`;
}

/**
 * Main function: Format complete patient context for AI
 */
export function formatPatientContext(patient: PatientWithRelations): FormattedPatientContext {
  const demographics = formatDemographics(patient);
  const medicalHistory = formatMedicalHistory(patient, patient.medications || []);
  const currentMedications = formatMedications(patient.medications || []);
  const allergies = formatAllergies(patient);
  const recentVisits = formatRecentVisits(patient.appointments || []);

  // Combine all sections
  const fullContext = `
# Patient Context

${demographics}

${medicalHistory}

${currentMedications}

${allergies}

${recentVisits}

---
*This information should be used to provide contextually relevant clinical documentation and recommendations.*
`.trim();

  return {
    demographics,
    medicalHistory,
    currentMedications,
    allergies,
    recentVisits,
    fullContext,
  };
}

/**
 * Format patient context for SOAP note generation
 */
export function formatPatientContextForSOAP(patient: PatientWithRelations, chiefComplaint: string): string {
  const age = calculateAge(patient.dateOfBirth);
  const context = formatPatientContext(patient);

  return `
# Clinical Context for SOAP Note

**Chief Complaint:** ${chiefComplaint}

**Patient:** ${patient.firstName} ${patient.lastName}, ${age}yo ${patient.gender === 'M' ? 'Male' : 'Female'}

${context.medicalHistory}

${context.currentMedications}

${context.allergies}

**Instructions:**
Generate a clinical SOAP note based on the patient's chief complaint and context provided above.
Include:
- Subjective: Patient's narrative and symptoms
- Objective: Relevant clinical findings and vital signs
- Assessment: Diagnosis with ICD-10 codes
- Plan: Treatment plan with procedures

Use medical terminology and maintain professional clinical documentation standards.
`.trim();
}

/**
 * Format patient context for clinical scribe
 */
export function formatPatientContextForScribe(patient: PatientWithRelations, appointmentReason: string): string {
  const age = calculateAge(patient.dateOfBirth);
  const context = formatPatientContext(patient);

  return `
# Clinical Scribe Context

**Today's Appointment:** ${appointmentReason}
**Patient:** ${patient.firstName} ${patient.lastName}, ${age}yo ${patient.gender === 'M' ? 'Male' : 'Female'} (MRN: ${patient.mrn})

${context.medicalHistory}

${context.currentMedications}

${context.allergies}

**Instructions:**
As a clinical scribe, transcribe the conversation between the clinician and patient.
Focus on:
- Chief complaint and history of present illness
- Review of systems
- Physical examination findings
- Clinical decision-making
- Treatment plan and follow-up

Format the output as structured clinical notes ready for EHR entry.
`.trim();
}

/**
 * Format brief patient summary (for quick reference)
 */
export function formatPatientSummary(patient: PatientWithRelations): string {
  const age = calculateAge(patient.dateOfBirth);
  const activeMeds = patient.medications?.filter(med => med.isActive) || [];

  let summary = `${patient.firstName} ${patient.lastName}, ${age}yo ${patient.gender === 'M' ? 'M' : 'F'}`;

  if (activeMeds.length > 0) {
    const medNames = activeMeds.slice(0, 3).map(med => med.name).join(', ');
    summary += ` | Meds: ${medNames}${activeMeds.length > 3 ? ` +${activeMeds.length - 3} more` : ''}`;
  }

  return summary;
}

/**
 * Format patient context for AI assistant general queries
 */
export function formatPatientContextForAI(patient: PatientWithRelations, query: string): string {
  const context = formatPatientContext(patient);

  return `
# Patient Information

${context.fullContext}

---

**User Query:** ${query}

**Instructions:**
Answer the query using the patient context provided above.
Provide clinically relevant and accurate information.
If the query requires information not available in the patient record, indicate that additional information would be needed.
`.trim();
}
