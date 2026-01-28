/**
 * Administrative Rules
 *
 * Documentation requirements, prior authorization workflows, and
 * compliance checks for regulatory requirements.
 *
 * Rule Categories:
 * - DOC_* : Documentation completeness
 * - AUTH_* : Authorization workflow status
 * - COMPLIANCE_* : Regulatory compliance checks
 * - CONSENT_* : Patient consent verification
 *
 * LGPD Context:
 * - Article 20: Right to explanation of automated decisions
 * - All messages must be available in Portuguese
 *
 * @module lib/traffic-light/rules/administrative
 */

import type {
  RuleDefinition,
  EvaluationContext,
  PatientContext,
  TrafficLightSignal,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENTATION REQUIREMENTS DATABASE
// ═══════════════════════════════════════════════════════════════════════════════

interface DocumentationRequirement {
  procedureTypes: string[];
  requiredDocs: string[];
  regulatoryBasis: string;
  glosaRisk: number; // Risk if missing (0-1)
}

const DOCUMENTATION_REQUIREMENTS: DocumentationRequirement[] = [
  {
    procedureTypes: ['SURGERY_OPME', 'HIGH_COMPLEXITY'],
    requiredDocs: [
      'clinical_justification',
      'supporting_exams',
      'informed_consent',
      'anesthesia_evaluation',
    ],
    regulatoryBasis: 'ANS RN 428/2017',
    glosaRisk: 0.35,
  },
  {
    procedureTypes: ['IMAGING'],
    requiredDocs: ['clinical_indication', 'referring_physician'],
    regulatoryBasis: 'CFM Resolution 2.107/2014',
    glosaRisk: 0.15,
  },
  {
    procedureTypes: ['ONCOLOGY'],
    requiredDocs: [
      'pathology_report',
      'staging',
      'tumor_board_decision',
      'treatment_protocol',
      'informed_consent',
    ],
    regulatoryBasis: 'ANS RN 387/2015',
    glosaRisk: 0.45,
  },
  {
    procedureTypes: ['HOME_CARE'],
    requiredDocs: [
      'medical_prescription',
      'care_plan',
      'family_caregiver_agreement',
      'home_evaluation',
    ],
    regulatoryBasis: 'ANS RN 428/2017',
    glosaRisk: 0.40,
  },
  {
    procedureTypes: ['REHABILITATION'],
    requiredDocs: ['functional_evaluation', 'treatment_goals', 'session_limit_justification'],
    regulatoryBasis: 'ANS RN 428/2017',
    glosaRisk: 0.25,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CONSENT REQUIREMENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface ConsentRequirement {
  procedures: string[];
  consentType: 'informed' | 'research' | 'data_sharing' | 'lgpd';
  description: string;
  descriptionPortuguese: string;
}

const CONSENT_REQUIREMENTS: ConsentRequirement[] = [
  {
    procedures: ['surgery', 'invasive_procedure', 'anesthesia'],
    consentType: 'informed',
    description: 'Informed consent for invasive procedure',
    descriptionPortuguese: 'Termo de consentimento para procedimento invasivo',
  },
  {
    procedures: ['clinical_trial', 'research'],
    consentType: 'research',
    description: 'Research participation consent (CEP/CONEP)',
    descriptionPortuguese: 'Termo de consentimento para participacao em pesquisa (CEP/CONEP)',
  },
  {
    procedures: ['data_export', 'third_party_sharing'],
    consentType: 'data_sharing',
    description: 'Data sharing consent',
    descriptionPortuguese: 'Termo de consentimento para compartilhamento de dados',
  },
  {
    procedures: ['all'],
    consentType: 'lgpd',
    description: 'LGPD data processing consent',
    descriptionPortuguese: 'Termo de consentimento LGPD para tratamento de dados',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getRequiredDocumentation(procedureType: string): DocumentationRequirement | undefined {
  return DOCUMENTATION_REQUIREMENTS.find((req) =>
    req.procedureTypes.some((t) => procedureType.toUpperCase().includes(t))
  );
}

function checkMissingDocuments(
  required: string[],
  provided: string[] | undefined
): string[] {
  if (!provided) return required;
  const providedLower = provided.map((d) => d.toLowerCase().replace(/[^a-z]/g, ''));
  return required.filter(
    (doc) => !providedLower.includes(doc.toLowerCase().replace(/[^a-z]/g, ''))
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMINISTRATIVE RULES
// ═══════════════════════════════════════════════════════════════════════════════

export const administrativeRules: RuleDefinition[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // DOCUMENTATION COMPLETENESS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'DOC_INCOMPLETE',
    name: 'Incomplete Documentation',
    category: 'ADMINISTRATIVE',
    defaultColor: 'YELLOW',
    isActive: true,
    description: 'Required documentation is missing for this procedure',
    descriptionPortuguese: 'Documentacao obrigatoria esta faltando para este procedimento',
    regulatoryReference: 'ANS RN 428/2017',

    async evaluate(context, _patientContext): Promise<TrafficLightSignal | null> {
      const procedureType = context.payload.procedure?.code
        ? 'PROCEDURE'
        : context.payload.tissCode
          ? 'BILLING'
          : context.action.toUpperCase();

      // Check for OPME or high complexity
      const isOpme = context.payload.opmeItems && (context.payload.opmeItems as string[]).length > 0;
      const category = isOpme ? 'SURGERY_OPME' : procedureType;

      const docRequirements = getRequiredDocumentation(category);
      if (!docRequirements) return null;

      const providedDocs = context.payload.providedDocuments as string[] | undefined;
      const missingDocs = checkMissingDocuments(docRequirements.requiredDocs, providedDocs);

      if (missingDocs.length > 0) {
        const isCritical = missingDocs.length > docRequirements.requiredDocs.length / 2;

        return {
          ruleId: 'DOC_INCOMPLETE',
          ruleName: 'Incomplete Documentation',
          category: 'ADMINISTRATIVE',
          color: isCritical ? 'RED' : 'YELLOW',
          message: `Missing ${missingDocs.length} required document(s): ${missingDocs.join(', ')}`,
          messagePortuguese: `Faltando ${missingDocs.length} documento(s) obrigatorio(s): ${missingDocs.map((d) => d.replace(/_/g, ' ')).join(', ')}`,
          regulatoryReference: docRequirements.regulatoryBasis,
          evidence: [
            `Procedure type: ${category}`,
            `Required: ${docRequirements.requiredDocs.join(', ')}`,
            `Provided: ${providedDocs?.join(', ') || 'None'}`,
            `Missing: ${missingDocs.join(', ')}`,
          ],
          estimatedGlosaRisk: {
            probability: docRequirements.glosaRisk * 100 * (missingDocs.length / docRequirements.requiredDocs.length),
            estimatedAmount: (context.payload.billedAmount as number) || 0,
            denialCode: 'G007',
            riskFactors: missingDocs.map((d) => `Missing: ${d}`),
          },
          suggestedCorrection: `Complete the following documentation: ${missingDocs.join(', ')}`,
          suggestedCorrectionPortuguese: `Completar a seguinte documentacao: ${missingDocs.map((d) => d.replace(/_/g, ' ')).join(', ')}`,
        };
      }

      return null;
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // INFORMED CONSENT
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'CONSENT_INFORMED_MISSING',
    name: 'Missing Informed Consent',
    category: 'ADMINISTRATIVE',
    defaultColor: 'RED',
    isActive: true,
    description: 'Informed consent required but not documented',
    descriptionPortuguese: 'Termo de consentimento informado obrigatorio mas nao documentado',
    regulatoryReference: 'CFM Resolution 1.931/2009 (Code of Medical Ethics)',

    async evaluate(context, _patientContext): Promise<TrafficLightSignal | null> {
      // Check if this is a procedure requiring informed consent
      const isSurgery =
        context.action === 'procedure' ||
        (context.payload.procedure?.code && context.payload.opmeItems);
      const isInvasive = context.payload.isInvasive as boolean | undefined;

      if (!isSurgery && !isInvasive) return null;

      const consentProvided = context.payload.informedConsentSigned as boolean | undefined;

      if (!consentProvided) {
        return {
          ruleId: 'CONSENT_INFORMED_MISSING',
          ruleName: 'Missing Informed Consent',
          category: 'ADMINISTRATIVE',
          color: 'RED',
          message: 'Informed consent not documented for invasive procedure',
          messagePortuguese:
            'Termo de consentimento informado nao documentado para procedimento invasivo',
          regulatoryReference: 'CFM Resolution 1.931/2009',
          evidence: [
            `Procedure: ${context.payload.procedure?.description || context.action}`,
            'Consent status: Not signed',
          ],
          suggestedCorrection:
            'Obtain signed informed consent before proceeding. Document risks, benefits, and alternatives discussed.',
          suggestedCorrectionPortuguese:
            'Obter termo de consentimento assinado antes de prosseguir. Documentar riscos, beneficios e alternativas discutidos.',
        };
      }

      return null;
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // LGPD CONSENT
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'CONSENT_LGPD_MISSING',
    name: 'LGPD Consent Not Documented',
    category: 'ADMINISTRATIVE',
    defaultColor: 'YELLOW',
    isActive: true,
    description: 'LGPD data processing consent not documented',
    descriptionPortuguese: 'Consentimento LGPD para tratamento de dados nao documentado',
    regulatoryReference: 'LGPD Lei 13.709/2018',

    async evaluate(context, _patientContext): Promise<TrafficLightSignal | null> {
      // Only check for new patient registrations or data sharing actions
      if (context.action !== 'admission' && !context.payload.dataSharing) {
        return null;
      }

      const lgpdConsentProvided = context.payload.lgpdConsentSigned as boolean | undefined;

      if (!lgpdConsentProvided) {
        return {
          ruleId: 'CONSENT_LGPD_MISSING',
          ruleName: 'LGPD Consent Not Documented',
          category: 'ADMINISTRATIVE',
          color: 'YELLOW',
          message: 'LGPD data processing consent should be documented',
          messagePortuguese: 'Consentimento LGPD para tratamento de dados deve ser documentado',
          regulatoryReference: 'LGPD Lei 13.709/2018, Art. 7',
          evidence: [
            'Action involves personal health data processing',
            'LGPD consent: Not documented',
          ],
          suggestedCorrection:
            'Obtain LGPD consent specifying data processing purposes, storage period, and patient rights.',
          suggestedCorrectionPortuguese:
            'Obter consentimento LGPD especificando finalidades do tratamento, periodo de armazenamento e direitos do paciente.',
        };
      }

      return null;
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // AUTHORIZATION WORKFLOW STATUS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'AUTH_EXPIRED',
    name: 'Authorization Expired',
    category: 'ADMINISTRATIVE',
    defaultColor: 'RED',
    isActive: true,
    description: 'Prior authorization has expired',
    descriptionPortuguese: 'Autorizacao previa expirou',
    regulatoryReference: 'ANS RN 395/2016',

    async evaluate(context, _patientContext): Promise<TrafficLightSignal | null> {
      const authExpiry = context.payload.priorAuthExpiry as string | undefined;

      if (!authExpiry) return null;

      const expiryDate = new Date(authExpiry);
      const now = new Date();

      if (expiryDate < now) {
        const daysExpired = Math.floor((now.getTime() - expiryDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
          ruleId: 'AUTH_EXPIRED',
          ruleName: 'Authorization Expired',
          category: 'ADMINISTRATIVE',
          color: 'RED',
          message: `Prior authorization expired ${daysExpired} day(s) ago`,
          messagePortuguese: `Autorizacao previa expirou ha ${daysExpired} dia(s)`,
          regulatoryReference: 'ANS RN 395/2016',
          evidence: [
            `Authorization expiry: ${expiryDate.toLocaleDateString('pt-BR')}`,
            `Current date: ${now.toLocaleDateString('pt-BR')}`,
            `Days expired: ${daysExpired}`,
          ],
          estimatedGlosaRisk: {
            probability: 85,
            estimatedAmount: (context.payload.billedAmount as number) || 0,
            denialCode: 'G002',
            riskFactors: ['Expired authorization'],
          },
          suggestedCorrection: 'Request new prior authorization before proceeding.',
          suggestedCorrectionPortuguese: 'Solicitar nova autorizacao previa antes de prosseguir.',
        };
      }

      // Warn if expiring within 7 days
      const daysUntilExpiry = Math.floor(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilExpiry <= 7) {
        return {
          ruleId: 'AUTH_EXPIRING_SOON',
          ruleName: 'Authorization Expiring Soon',
          category: 'ADMINISTRATIVE',
          color: 'YELLOW',
          message: `Prior authorization expires in ${daysUntilExpiry} day(s)`,
          messagePortuguese: `Autorizacao previa expira em ${daysUntilExpiry} dia(s)`,
          regulatoryReference: 'ANS RN 395/2016',
          evidence: [
            `Authorization expiry: ${expiryDate.toLocaleDateString('pt-BR')}`,
            `Days remaining: ${daysUntilExpiry}`,
          ],
          suggestedCorrection: 'Consider scheduling procedure soon or requesting extension.',
          suggestedCorrectionPortuguese:
            'Considerar agendar procedimento em breve ou solicitar prorrogacao.',
        };
      }

      return null;
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // PATIENT IDENTIFICATION
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'PATIENT_ID_VERIFICATION',
    name: 'Patient Identification Incomplete',
    category: 'ADMINISTRATIVE',
    defaultColor: 'YELLOW',
    isActive: true,
    description: 'Patient identification should be verified',
    descriptionPortuguese: 'Identificacao do paciente deve ser verificada',
    regulatoryReference: 'ANVISA RDC 36/2013 - Patient Safety Goals',

    async evaluate(context, patientContext): Promise<TrafficLightSignal | null> {
      // Only check for high-risk procedures
      const isHighRisk =
        context.action === 'procedure' ||
        context.action === 'prescription' ||
        (context.payload.opmeItems && (context.payload.opmeItems as string[]).length > 0);

      if (!isHighRisk) return null;

      const identificationVerified = context.payload.patientIdentificationVerified as
        | boolean
        | undefined;

      if (!identificationVerified) {
        return {
          ruleId: 'PATIENT_ID_VERIFICATION',
          ruleName: 'Patient Identification Not Verified',
          category: 'ADMINISTRATIVE',
          color: 'YELLOW',
          message: 'Patient identification should be verified before high-risk procedure',
          messagePortuguese:
            'Identificacao do paciente deve ser verificada antes de procedimento de alto risco',
          regulatoryReference: 'ANVISA RDC 36/2013',
          evidence: [
            `Patient ID: ${patientContext.id}`,
            `Procedure: ${context.action}`,
            'Two-identifier verification: Not confirmed',
          ],
          suggestedCorrection:
            'Verify patient identity using at least 2 identifiers (name, DOB, medical record number).',
          suggestedCorrectionPortuguese:
            'Verificar identidade do paciente usando pelo menos 2 identificadores (nome, data de nascimento, numero do prontuario).',
        };
      }

      return null;
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // MEDICAL TEAM REQUIREMENTS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'TEAM_INCOMPLETE',
    name: 'Medical Team Incomplete',
    category: 'ADMINISTRATIVE',
    defaultColor: 'YELLOW',
    isActive: true,
    description: 'Required medical team members not assigned',
    descriptionPortuguese: 'Membros obrigatorios da equipe medica nao designados',
    regulatoryReference: 'CFM Resolution 2.174/2017',

    async evaluate(context, _patientContext): Promise<TrafficLightSignal | null> {
      // Only check for surgical procedures
      if (context.action !== 'procedure') return null;

      const isOpme =
        context.payload.opmeItems && (context.payload.opmeItems as string[]).length > 0;
      if (!isOpme) return null;

      const team = context.payload.surgicalTeam as
        | { surgeon?: boolean; anesthesiologist?: boolean; assistant?: boolean }
        | undefined;

      if (!team) {
        return {
          ruleId: 'TEAM_NOT_ASSIGNED',
          ruleName: 'Surgical Team Not Assigned',
          category: 'ADMINISTRATIVE',
          color: 'YELLOW',
          message: 'Surgical team has not been assigned for procedure',
          messagePortuguese: 'Equipe cirurgica nao foi designada para o procedimento',
          regulatoryReference: 'CFM Resolution 2.174/2017',
          evidence: ['Procedure type: OPME/Surgery', 'Team assignment: Not specified'],
          suggestedCorrection: 'Assign surgeon, anesthesiologist, and required assistants.',
          suggestedCorrectionPortuguese:
            'Designar cirurgiao, anestesiologista e auxiliares necessarios.',
        };
      }

      const missingRoles: string[] = [];
      if (!team.surgeon) missingRoles.push('surgeon');
      if (!team.anesthesiologist) missingRoles.push('anesthesiologist');

      if (missingRoles.length > 0) {
        return {
          ruleId: 'TEAM_INCOMPLETE',
          ruleName: 'Medical Team Incomplete',
          category: 'ADMINISTRATIVE',
          color: 'YELLOW',
          message: `Missing team members: ${missingRoles.join(', ')}`,
          messagePortuguese: `Membros faltantes: ${missingRoles.map((r) => (r === 'surgeon' ? 'cirurgiao' : 'anestesiologista')).join(', ')}`,
          regulatoryReference: 'CFM Resolution 2.174/2017',
          evidence: [
            `Missing roles: ${missingRoles.join(', ')}`,
            'Surgical team must be complete before scheduling',
          ],
          suggestedCorrection: `Assign the following team members: ${missingRoles.join(', ')}`,
          suggestedCorrectionPortuguese: `Designar os seguintes membros: ${missingRoles.map((r) => (r === 'surgeon' ? 'cirurgiao' : 'anestesiologista')).join(', ')}`,
        };
      }

      return null;
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TIME-SENSITIVE CHECKS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'PREOP_EVAL_OUTDATED',
    name: 'Preoperative Evaluation Outdated',
    category: 'ADMINISTRATIVE',
    defaultColor: 'YELLOW',
    isActive: true,
    description: 'Preoperative evaluation may be outdated',
    descriptionPortuguese: 'Avaliacao pre-operatoria pode estar desatualizada',
    regulatoryReference: 'CFM Resolution 2.174/2017',

    async evaluate(context, _patientContext): Promise<TrafficLightSignal | null> {
      // Only check for surgical procedures
      if (context.action !== 'procedure') return null;

      const isOpme =
        context.payload.opmeItems && (context.payload.opmeItems as string[]).length > 0;
      if (!isOpme) return null;

      const preopEvalDate = context.payload.preopEvaluationDate as string | undefined;

      if (!preopEvalDate) {
        return {
          ruleId: 'PREOP_EVAL_MISSING',
          ruleName: 'Preoperative Evaluation Missing',
          category: 'ADMINISTRATIVE',
          color: 'YELLOW',
          message: 'Preoperative evaluation not documented',
          messagePortuguese: 'Avaliacao pre-operatoria nao documentada',
          regulatoryReference: 'CFM Resolution 2.174/2017',
          evidence: ['Procedure type: Surgery/OPME', 'Preoperative evaluation: Not found'],
          suggestedCorrection: 'Complete preoperative evaluation before scheduling surgery.',
          suggestedCorrectionPortuguese:
            'Completar avaliacao pre-operatoria antes de agendar cirurgia.',
        };
      }

      const evalDate = new Date(preopEvalDate);
      const now = new Date();
      const daysSinceEval = Math.floor(
        (now.getTime() - evalDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Preop eval valid for 30 days typically
      if (daysSinceEval > 30) {
        return {
          ruleId: 'PREOP_EVAL_OUTDATED',
          ruleName: 'Preoperative Evaluation Outdated',
          category: 'ADMINISTRATIVE',
          color: 'YELLOW',
          message: `Preoperative evaluation is ${daysSinceEval} days old (max 30 days)`,
          messagePortuguese: `Avaliacao pre-operatoria tem ${daysSinceEval} dias (maximo 30 dias)`,
          regulatoryReference: 'CFM Resolution 2.174/2017',
          evidence: [
            `Evaluation date: ${evalDate.toLocaleDateString('pt-BR')}`,
            `Days elapsed: ${daysSinceEval}`,
            'Recommended validity: 30 days',
          ],
          suggestedCorrection: 'Update preoperative evaluation before proceeding.',
          suggestedCorrectionPortuguese: 'Atualizar avaliacao pre-operatoria antes de prosseguir.',
        };
      }

      return null;
    },
  },
];
