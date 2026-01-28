/**
 * Administrative Traffic Light Rules (Prompt-Native)
 *
 * PROMPT-NATIVE ARCHITECTURE:
 * Documentation and compliance rules defined declaratively.
 * LGPD/HIPAA compliance requirements.
 *
 * To add a new administrative rule:
 * 1. Add it to this file
 * 2. Reference regulatory requirement (LGPD Article, ANVISA RDC)
 */

import { RuleTemplate } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENTATION REQUIREMENTS BY PROCEDURE TYPE
// ═══════════════════════════════════════════════════════════════════════════

export const DOCUMENTATION_REQUIREMENTS = {
  procedure: ['operative_report', 'anesthesia_record', 'pathology_report'],
  surgery: ['operative_report', 'anesthesia_record', 'pathology_report', 'surgical_checklist'],
  imaging: ['order', 'clinical_indication', 'report'],
  admission: ['admission_note', 'history_physical', 'insurance_verification'],
  discharge: ['discharge_summary', 'medication_reconciliation', 'follow_up_instructions'],
};

// ═══════════════════════════════════════════════════════════════════════════
// CONSENT REQUIREMENTS
// ═══════════════════════════════════════════════════════════════════════════

export const CONSENT_REQUIREMENTS = {
  invasive: ['informed_consent', 'lgpd_consent'],
  dataSharing: ['lgpd_consent', 'hipaa_authorization'],
  research: ['informed_consent', 'irb_consent', 'lgpd_consent'],
  telemedicine: ['informed_consent', 'lgpd_consent', 'telemedicine_consent'],
};

// ═══════════════════════════════════════════════════════════════════════════
// ADMINISTRATIVE RULES (Prompt-Native)
// ═══════════════════════════════════════════════════════════════════════════

export const ADMINISTRATIVE_RULES: RuleTemplate[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // DOCUMENTATION: Incomplete (YELLOW)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'DOC_INCOMPLETE',
    name: 'Documentation Incomplete',
    version: '1.0.0',
    category: 'ADMINISTRATIVE',
    defaultColor: 'YELLOW',
    isActive: true,

    applicableActions: ['procedure', 'billing', 'discharge'],
    requiredPayloadFields: [],

    conditionDescription: `
      Trigger YELLOW when required documentation is missing for the procedure type.

      Documentation requirements by type:
      - Procedure: operative report, anesthesia record, pathology report
      - Surgery: + surgical checklist
      - Imaging: order, clinical indication, report
      - Admission: admission note, H&P, insurance verification
      - Discharge: discharge summary, med reconciliation, follow-up instructions
    `,

    conditionLogic: {
      type: 'function-name',
      value: 'evaluateDocumentationCompleteness',
    },

    dataDependencies: ['documents'],

    description: 'Required documentation is missing',
    descriptionPortuguese: 'Documentação obrigatória está faltando',

    messageTemplate: 'MISSING DOCS: {{missingDocs}} required for {{procedureType}}. {{missingCount}} of {{totalRequired}} documents missing.',
    messageTemplatePortuguese: 'DOCS FALTANDO: {{missingDocs}} necessários para {{procedureType}}. {{missingCount}} de {{totalRequired}} documentos faltando.',

    regulatoryReference: 'CFM Resolution 2.217/2018 (Medical Records)',
    glosaRiskWeight: 0.45,
    glosaCode: 'G004',

    canOverride: true,
    overrideRequires: 'justification',

    suggestedCorrectionTemplate: 'Complete the following documentation before proceeding: {{missingDocs}}',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CONSENT: Informed Consent Missing (YELLOW)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'CONSENT_INFORMED_MISSING',
    name: 'Informed Consent Missing',
    version: '1.0.0',
    category: 'ADMINISTRATIVE',
    defaultColor: 'YELLOW',
    isActive: true,

    applicableActions: ['procedure', 'admission'],
    requiredPayloadFields: ['isInvasive'],

    conditionDescription: `
      Trigger YELLOW when performing an invasive procedure
      without signed informed consent.

      Informed consent is required for:
      - All surgical procedures
      - Invasive diagnostic procedures
      - Procedures with significant risk
      - Anesthesia administration
    `,

    conditionLogic: {
      type: 'function-name',
      value: 'evaluateInformedConsent',
    },

    dataDependencies: ['consents'],

    description: 'Informed consent not documented for invasive procedure',
    descriptionPortuguese: 'Consentimento informado não documentado para procedimento invasivo',

    messageTemplate: 'CONSENT REQUIRED: Informed consent not signed for {{procedureType}}. Patient must sign before procedure.',
    messageTemplatePortuguese: 'CONSENTIMENTO NECESSÁRIO: Consentimento informado não assinado para {{procedureType}}. Paciente deve assinar antes do procedimento.',

    regulatoryReference: 'CFM Resolution 2.217/2018, Brazilian Civil Code Art. 15',

    canOverride: true,
    overrideRequires: 'justification',

    suggestedCorrectionTemplate: 'Obtain signed informed consent. Include: procedure description, risks, benefits, alternatives, and patient questions.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CONSENT: LGPD Missing (YELLOW)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'CONSENT_LGPD_MISSING',
    name: 'LGPD Data Consent Missing',
    version: '1.0.0',
    category: 'ADMINISTRATIVE',
    defaultColor: 'YELLOW',
    isActive: true,

    applicableActions: ['admission', 'billing', 'procedure'],
    requiredPayloadFields: ['dataSharing'],

    conditionDescription: `
      Trigger YELLOW when processing patient data without LGPD consent.

      LGPD (Brazilian Data Protection Law) requires:
      - Explicit consent for data processing
      - Clear purpose specification
      - Data minimization
      - Right to access and deletion

      Article 7: Processing only with consent
      Article 20: Right to explanation of automated decisions
    `,

    conditionLogic: {
      type: 'function-name',
      value: 'evaluateLgpdConsent',
    },

    dataDependencies: ['consents'],

    description: 'LGPD data processing consent not obtained',
    descriptionPortuguese: 'Consentimento LGPD para processamento de dados não obtido',

    messageTemplate: 'LGPD CONSENT REQUIRED: Data sharing requires LGPD consent. Purpose: {{dataPurpose}}',
    messageTemplatePortuguese: 'CONSENTIMENTO LGPD NECESSÁRIO: Compartilhamento de dados requer consentimento LGPD. Finalidade: {{dataPurpose}}',

    regulatoryReference: 'LGPD Lei 13.709/2018, Articles 7-8, 20',

    canOverride: true,
    overrideRequires: 'justification',

    suggestedCorrectionTemplate: 'Obtain LGPD consent specifying: data collected, purpose, sharing parties, retention period, patient rights.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PATIENT ID: Verification Missing (YELLOW)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'PATIENT_ID_VERIFICATION',
    name: 'Patient Identification Not Verified',
    version: '1.0.0',
    category: 'ADMINISTRATIVE',
    defaultColor: 'YELLOW',
    isActive: true,

    applicableActions: ['procedure', 'prescription', 'admission'],
    requiredPayloadFields: [],

    conditionDescription: `
      Trigger YELLOW when patient identification verification
      is not documented (Joint Commission requirement).

      Two-identifier rule:
      - Name + Date of Birth, or
      - Name + Medical Record Number, or
      - Photo ID verification
    `,

    conditionLogic: {
      type: 'function-name',
      value: 'evaluatePatientIdVerification',
    },

    dataDependencies: ['documents'],

    description: 'Patient identification not verified using two identifiers',
    descriptionPortuguese: 'Identificação do paciente não verificada usando dois identificadores',

    messageTemplate: 'VERIFY PATIENT: Two-identifier verification not documented. Use: Name + DOB or Name + MRN.',
    messageTemplatePortuguese: 'VERIFICAR PACIENTE: Verificação de dois identificadores não documentada. Use: Nome + Data de Nascimento ou Nome + Prontuário.',

    regulatoryReference: 'ANVISA RDC 36/2013, Joint Commission NPSG.01.01.01',

    canOverride: true,
    overrideRequires: 'justification',

    suggestedCorrectionTemplate: 'Document patient verification using two identifiers. Check wristband, ask patient to state name and DOB.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TEAM: Surgical Team Incomplete (YELLOW)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'TEAM_INCOMPLETE',
    name: 'Surgical Team Incomplete',
    version: '1.0.0',
    category: 'ADMINISTRATIVE',
    defaultColor: 'YELLOW',
    isActive: true,

    applicableActions: ['procedure'],
    requiredPayloadFields: ['isInvasive'],

    conditionDescription: `
      Trigger YELLOW when surgical team is not complete for invasive procedure.

      Required team:
      - Surgeon (always required)
      - Anesthesiologist (for procedures requiring anesthesia)
      - Surgical assistant (for major procedures)
    `,

    conditionLogic: {
      type: 'function-name',
      value: 'evaluateTeamCompleteness',
    },

    dataDependencies: ['surgicalTeam'],

    description: 'Surgical team is not complete for procedure',
    descriptionPortuguese: 'Equipe cirúrgica incompleta para o procedimento',

    messageTemplate: 'TEAM INCOMPLETE: Missing {{missingRoles}} for {{procedureType}}. Complete team before proceeding.',
    messageTemplatePortuguese: 'EQUIPE INCOMPLETA: Faltando {{missingRoles}} para {{procedureType}}. Complete equipe antes de prosseguir.',

    regulatoryReference: 'CFM Resolution 2.174/2017',

    canOverride: true,
    overrideRequires: 'justification',

    suggestedCorrectionTemplate: 'Assign the following team members: {{missingRoles}}',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PREOP: Evaluation Outdated (YELLOW)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'PREOP_EVAL_OUTDATED',
    name: 'Preoperative Evaluation Outdated',
    version: '1.0.0',
    category: 'ADMINISTRATIVE',
    defaultColor: 'YELLOW',
    isActive: true,

    applicableActions: ['procedure'],
    requiredPayloadFields: ['isInvasive'],

    conditionDescription: `
      Trigger YELLOW when preoperative evaluation is older than 30 days
      for an invasive procedure.

      Preoperative evaluation should include:
      - Medical history review
      - Physical examination
      - Risk assessment (ASA classification)
      - Lab results review
    `,

    conditionLogic: {
      type: 'function-name',
      value: 'evaluatePreopEvaluation',
    },

    dataDependencies: ['documents'],

    description: 'Preoperative evaluation is outdated (>30 days)',
    descriptionPortuguese: 'Avaliação pré-operatória desatualizada (>30 dias)',

    messageTemplate: 'PREOP OUTDATED: Last evaluation was {{daysSince}} days ago. Requires update within 30 days of procedure.',
    messageTemplatePortuguese: 'PRÉ-OP DESATUALIZADO: Última avaliação foi há {{daysSince}} dias. Requer atualização dentro de 30 dias do procedimento.',

    regulatoryReference: 'CFM Resolution 2.174/2017',

    canOverride: true,
    overrideRequires: 'justification',

    suggestedCorrectionTemplate: 'Schedule updated preoperative evaluation. Review: vitals, labs, medications, risk assessment.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TIMEOUT: Surgical Safety Checklist Missing (YELLOW)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'SURGICAL_CHECKLIST_MISSING',
    name: 'Surgical Safety Checklist Not Completed',
    version: '1.0.0',
    category: 'ADMINISTRATIVE',
    defaultColor: 'YELLOW',
    isActive: true,

    applicableActions: ['procedure'],
    requiredPayloadFields: ['isInvasive'],

    conditionDescription: `
      Trigger YELLOW when surgical safety checklist (WHO timeout)
      is not documented before invasive procedure.

      WHO Surgical Safety Checklist phases:
      - Sign In (before anesthesia)
      - Time Out (before incision)
      - Sign Out (before leaving OR)
    `,

    conditionLogic: {
      type: 'function-name',
      value: 'evaluateSurgicalChecklist',
    },

    dataDependencies: ['documents'],

    description: 'WHO Surgical Safety Checklist not completed',
    descriptionPortuguese: 'Lista de Verificação de Segurança Cirúrgica da OMS não completada',

    messageTemplate: 'TIMEOUT REQUIRED: WHO Surgical Safety Checklist not documented. Complete Sign In, Time Out, and Sign Out.',
    messageTemplatePortuguese: 'TIMEOUT NECESSÁRIO: Lista de Verificação de Segurança Cirúrgica da OMS não documentada. Complete Sign In, Time Out e Sign Out.',

    regulatoryReference: 'WHO Surgical Safety Checklist, ANVISA RDC 36/2013',

    canOverride: true,
    overrideRequires: 'justification',

    suggestedCorrectionTemplate: 'Complete WHO checklist: verify patient identity, procedure site, consent, allergies, and team introduction.',
  },
];

export default ADMINISTRATIVE_RULES;
