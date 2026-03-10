export type CdssActionType =
  | 'LIFESTYLE_PREVENTION'
  | 'RX_TIMELINE_SAFETY'
  | 'DIFFERENTIAL_DX'
  | 'DRAFT_HANDOUT';

export interface ClinicalConditionInput {
  label?: string;
  icd10Code?: string;
  status?: string;
}

export interface ClinicalMedicationInput {
  name?: string;
  atcCode?: string;
  dose?: string;
  schedule?: string;
  status?: string;
}

export interface ClinicalVitalInput {
  name: string;
  value: string;
  unit?: string;
  collectedAt?: string;
}

export interface ClinicalSoapDraftInput {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

export interface DeidentifiedClinicalInput {
  age?: number;
  sex?: string;
  conditions?: ClinicalConditionInput[];
  medications?: ClinicalMedicationInput[];
  vitals?: ClinicalVitalInput[];
  soapDraft?: ClinicalSoapDraftInput;
}

interface CdssPromptTemplate {
  actionType: CdssActionType;
  uiIntent: string;
  systemPrompt: string;
}

const CDSS_PROMPT_TEMPLATES: Record<CdssActionType, CdssPromptTemplate> = {
  LIFESTYLE_PREVENTION: {
    actionType: 'LIFESTYLE_PREVENTION',
    uiIntent: 'Building Lifestyle and Risk Reduction Plan...',
    systemPrompt: [
      'You are a physician-facing clinical reasoning copilot.',
      'Task: build a lifestyle and risk reduction plan from the provided de-identified context.',
      'Hard rules:',
      '1) Use only evidence-based guidance and include citation tags with society and year.',
      '2) Prefer AHA/ACC, WHO, ADA, KDIGO, and ESC guidance when relevant.',
      '3) If key data is missing, return INSUFFICIENT_DATA and list missing fields.',
      '4) Never output direct identifiers and never ask for direct identifiers.',
      'Output format:',
      '- Section 1: Risk Drivers (bullet list)',
      '- Section 2: Lifestyle Plan table with columns [Domain | Recommendation | Frequency | Follow-up Marker | Evidence]',
      '- Section 3: Monitoring Plan with ICD-10 and LOINC references when available',
      '- Section 4: Safety Notes and Escalation Triggers',
    ].join('\n'),
  },
  RX_TIMELINE_SAFETY: {
    actionType: 'RX_TIMELINE_SAFETY',
    uiIntent: 'Assessing Rx Timeline and Safety...',
    systemPrompt: [
      'You are a physician-facing medication safety analyst.',
      'Task: audit medication timeline safety using ATC and clinical context.',
      'Hard rules:',
      '1) Identify interaction risk, duplication risk, dose timing concerns, and contraindication risk.',
      '2) Cite guideline or formulary references with year when possible (AHA, WHO ATC index, ESC, KDIGO).',
      '3) If dose details are missing, mark assumptions explicitly.',
      '4) Never output direct identifiers.',
      'Output format:',
      '- First line: one sentence clinical overview',
      '- Markdown table columns: Medication | ATC | Related Condition (ICD-10) | Risk Signal | Suggested Action | Evidence',
      '- Final section: Priority Follow-up Checks',
    ].join('\n'),
  },
  DIFFERENTIAL_DX: {
    actionType: 'DIFFERENTIAL_DX',
    uiIntent: 'Generating Differential Dx Context...',
    systemPrompt: [
      'You are a physician-facing differential reasoning assistant.',
      'Task: produce prioritized differential considerations using transcript, vitals, and coded context.',
      'Hard rules:',
      '1) Rank by likelihood with concise rationale.',
      '2) Map each differential to ICD-10 when possible.',
      '3) Include immediate red-flag checks and key rule-out tests with LOINC when possible.',
      '4) Cite guideline references with society and year when available (AHA, ESC, WHO, NICE).',
      '5) If insufficient data, return INSUFFICIENT_DATA and request concrete missing clinical inputs.',
      'Output format:',
      '- Section 1: Prioritized Differential List (table)',
      '- Section 2: Rule-out Now items',
      '- Section 3: Next Clinical Data to Collect',
    ].join('\n'),
  },
  DRAFT_HANDOUT: {
    actionType: 'DRAFT_HANDOUT',
    uiIntent: 'Drafting Patient Handout...',
    systemPrompt: [
      'You are a physician-facing documentation assistant preparing a patient handout draft.',
      'Task: convert clinical plan into plain language without exposing direct identifiers.',
      'Hard rules:',
      '1) Use clear patient-friendly language and keep medical jargon minimal.',
      '2) Include medication safety instructions and follow-up actions.',
      '3) Add a final line: "Review with your clinician before any change."',
      '4) If instructions depend on missing data, include a short "Need to Confirm" section.',
      'Output format:',
      '- Section 1: Why this plan matters',
      '- Section 2: Daily actions',
      '- Section 3: Medication notes',
      '- Section 4: When to seek urgent care',
      '- Section 5: Need to Confirm',
    ].join('\n'),
  },
};

const ICD10_REGEX = /\b[A-TV-Z][0-9][0-9](?:\.[0-9A-Z]{1,4})?\b/g;
const ATC_REGEX = /\b[A-Z][0-9]{2}[A-Z]{2}[0-9]{2}\b/g;

const DIRECT_PII_PATTERNS: RegExp[] = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /\b(?:\+?\d{1,3}\s?)?(?:\(?\d{2,3}\)?\s?)?\d{4,5}[-\s]?\d{4}\b/g,
  /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g,
  /\b\d{3}-?\d{2}-?\d{4}\b/g,
  /\bMRN[-:\s]?[A-Z0-9-]+\b/gi,
  /\b(?:DOB|Date of Birth)[-:\s]*\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/gi,
];

function sanitizeFreeText(input: string): string {
  return DIRECT_PII_PATTERNS.reduce((acc, pattern) => acc.replace(pattern, '[REDACTED]'), input);
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function parseTranscriptCodes(transcript: string): { icd10Codes: string[]; atcCodes: string[] } {
  const icd10Matches = transcript.match(ICD10_REGEX) ?? [];
  const atcMatches = transcript.match(ATC_REGEX) ?? [];
  return {
    icd10Codes: unique(icd10Matches),
    atcCodes: unique(atcMatches),
  };
}

function formatConditions(input: DeidentifiedClinicalInput, transcriptIcd10: string[]): string {
  const fromInput = (input.conditions ?? []).map((condition) => {
    const code = condition.icd10Code?.trim();
    const label = condition.label?.trim() || 'Unlabeled condition';
    return code ? `${code} | ${label}` : label;
  });

  const transcriptOnly = transcriptIcd10.map((code) => `${code} | From encounter transcript`);
  const merged = unique([...fromInput, ...transcriptOnly]);
  return merged.length > 0 ? merged.map((line) => `- ${line}`).join('\n') : '- None documented';
}

function formatMedications(input: DeidentifiedClinicalInput, transcriptAtc: string[]): string {
  const fromInput = (input.medications ?? []).map((medication) => {
    const name = medication.name?.trim() || 'Unnamed medication';
    const atc = medication.atcCode?.trim();
    const dose = medication.dose?.trim();
    const status = medication.status?.trim();

    const segments = [name];
    if (atc) segments.push(`ATC ${atc}`);
    if (dose) segments.push(`Dose ${dose}`);
    if (status) segments.push(`Status ${status}`);
    return segments.join(' | ');
  });

  const transcriptOnly = transcriptAtc.map((code) => `ATC ${code} | From encounter transcript`);
  const merged = unique([...fromInput, ...transcriptOnly]);
  return merged.length > 0 ? merged.map((line) => `- ${line}`).join('\n') : '- None documented';
}

function formatVitals(input: DeidentifiedClinicalInput): string {
  if (!input.vitals || input.vitals.length === 0) {
    return '- None documented';
  }

  return input.vitals
    .map((vital) => {
      const parts = [`${vital.name}: ${vital.value}`];
      if (vital.unit) parts[0] += ` ${vital.unit}`;
      if (vital.collectedAt) parts.push(`Collected ${vital.collectedAt}`);
      return `- ${parts.join(' | ')}`;
    })
    .join('\n');
}

function formatSoapDraft(input: DeidentifiedClinicalInput): string {
  const soap = input.soapDraft;
  if (!soap) {
    return 'SUBJECTIVE: None\nOBJECTIVE: None\nASSESSMENT: None\nPLAN: None';
  }

  return [
    `SUBJECTIVE: ${sanitizeFreeText(soap.subjective ?? 'None')}`,
    `OBJECTIVE: ${sanitizeFreeText(soap.objective ?? 'None')}`,
    `ASSESSMENT: ${sanitizeFreeText(soap.assessment ?? 'None')}`,
    `PLAN: ${sanitizeFreeText(soap.plan ?? 'None')}`,
  ].join('\n');
}

export function buildDeidentifiedClinicalContext(
  patientData: DeidentifiedClinicalInput,
  encounterTranscript: string
): string {
  const safeTranscript = sanitizeFreeText(encounterTranscript);
  const { icd10Codes, atcCodes } = parseTranscriptCodes(safeTranscript);
  const age = typeof patientData.age === 'number' ? String(patientData.age) : 'Unknown';
  const sex = patientData.sex?.trim() || 'Unknown';

  const contextBlocks = [
    `AGE: ${age}`,
    `SEX: ${sex}`,
    'ACTIVE_CONDITIONS_ICD10:',
    formatConditions(patientData, icd10Codes),
    'ACTIVE_MEDICATIONS_ATC:',
    formatMedications(patientData, atcCodes),
    'VITALS:',
    formatVitals(patientData),
    'SOAP_DRAFT:',
    formatSoapDraft(patientData),
    'ENCOUNTER_TRANSCRIPT:',
    safeTranscript || 'No transcript provided',
  ];

  return contextBlocks.join('\n');
}

export function getCdssPromptTemplate(actionType: CdssActionType): CdssPromptTemplate {
  return CDSS_PROMPT_TEMPLATES[actionType];
}

export function buildCdssSystemPrompt(
  actionType: CdssActionType,
  deidentifiedClinicalContext: string
): string {
  const template = getCdssPromptTemplate(actionType);
  return [
    template.systemPrompt,
    'De-identified Clinical Context:',
    deidentifiedClinicalContext,
    'Safety note: This output supports clinician reasoning. Final decisions remain with the treating clinician.',
  ].join('\n\n');
}
