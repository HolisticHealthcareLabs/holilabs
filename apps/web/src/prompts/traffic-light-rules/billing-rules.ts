/**
 * Billing Traffic Light Rules (Prompt-Native)
 *
 * PROMPT-NATIVE ARCHITECTURE:
 * Glosa prevention rules defined declaratively.
 * Brazilian TISS/ANS compliance.
 *
 * To add a new billing rule:
 * 1. Add it to this file
 * 2. Include glosaRiskWeight for revenue impact calculation
 * 3. Reference ANS normative if applicable
 */

import { RuleTemplate } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// TISS CODE DATABASE (Embedded for offline evaluation)
// ═══════════════════════════════════════════════════════════════════════════

export const TISS_CODES = {
  // Consultas
  '10101012': { name: 'Consulta médica', category: 'consultation', authRequired: false, avgGlosaRate: 0.05 },
  '10101020': { name: 'Consulta médica (pronto atendimento)', category: 'consultation', authRequired: false, avgGlosaRate: 0.08 },

  // Exames
  '40301010': { name: 'Hemograma completo', category: 'lab', authRequired: false, avgGlosaRate: 0.02 },
  '40302040': { name: 'Glicose', category: 'lab', authRequired: false, avgGlosaRate: 0.02 },
  '40304361': { name: 'TSH', category: 'lab', authRequired: false, avgGlosaRate: 0.03 },

  // Imagem
  '41001010': { name: 'Radiografia de tórax', category: 'imaging', authRequired: false, avgGlosaRate: 0.05 },
  '41101014': { name: 'Tomografia computadorizada', category: 'imaging', authRequired: true, avgGlosaRate: 0.15 },
  '41201010': { name: 'Ressonância magnética', category: 'imaging', authRequired: true, avgGlosaRate: 0.18 },

  // Procedimentos
  '30101012': { name: 'Cirurgia pequeno porte', category: 'procedure', authRequired: true, avgGlosaRate: 0.12 },
  '30201012': { name: 'Cirurgia médio porte', category: 'procedure', authRequired: true, avgGlosaRate: 0.18 },
  '30301016': { name: 'Cirurgia grande porte', category: 'procedure', authRequired: true, avgGlosaRate: 0.25 },

  // OPME (High risk for glosas)
  '70301010': { name: 'Prótese ortopédica', category: 'opme', authRequired: true, avgGlosaRate: 0.35 },
  '70401020': { name: 'Stent coronariano', category: 'opme', authRequired: true, avgGlosaRate: 0.32 },
  '70501030': { name: 'Marca-passo', category: 'opme', authRequired: true, avgGlosaRate: 0.30 },
};

// ═══════════════════════════════════════════════════════════════════════════
// GLOSA CODES (ANS Denial Reasons)
// ═══════════════════════════════════════════════════════════════════════════

export const GLOSA_CODES = {
  G001: { description: 'Procedimento não coberto pelo plano', recoveryRate: 0.10 },
  G002: { description: 'Falta de autorização prévia', recoveryRate: 0.45 },
  G003: { description: 'CID incompatível com procedimento', recoveryRate: 0.60 },
  G004: { description: 'Documentação incompleta', recoveryRate: 0.75 },
  G005: { description: 'Valor acima da tabela', recoveryRate: 0.50 },
  G006: { description: 'Duplicidade de cobrança', recoveryRate: 0.05 },
  G007: { description: 'Prazo de autorização expirado', recoveryRate: 0.35 },
  G008: { description: 'OPME não autorizado', recoveryRate: 0.25 },
};

// ═══════════════════════════════════════════════════════════════════════════
// CID-10 PROCEDURE COMPATIBILITY
// ═══════════════════════════════════════════════════════════════════════════

export const CID_PROCEDURE_COMPATIBILITY = {
  // Orthopedic procedures require musculoskeletal CIDs (M00-M99)
  orthopedic: ['M', 'S'],
  // Cardiac procedures require circulatory CIDs (I00-I99)
  cardiac: ['I'],
  // Respiratory procedures require respiratory CIDs (J00-J99)
  respiratory: ['J'],
};

// ═══════════════════════════════════════════════════════════════════════════
// BILLING RULES (Prompt-Native)
// ═══════════════════════════════════════════════════════════════════════════

export const BILLING_RULES: RuleTemplate[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // TISS: Invalid Code (RED)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'TISS_CODE_INVALID',
    name: 'Invalid TISS Code',
    version: '1.0.0',
    category: 'BILLING',
    defaultColor: 'RED',
    isActive: true,

    applicableActions: ['billing', 'procedure'],
    requiredPayloadFields: ['tissCode'],

    conditionDescription: `
      Trigger RED when TISS code is not in the valid TISS code database.
      Invalid codes result in automatic denial (100% glosa rate).
    `,

    conditionLogic: {
      type: 'function-name',
      value: 'evaluateTissCodeValidity',
    },

    dataDependencies: ['tissCode'],

    description: 'TISS code is invalid or not recognized',
    descriptionPortuguese: 'Código TISS inválido ou não reconhecido',

    messageTemplate: 'INVALID TISS: Code {{tissCode}} not found in TISS database. Will cause 100% glosa.',
    messageTemplatePortuguese: 'TISS INVÁLIDO: Código {{tissCode}} não encontrado na base TISS. Resultará em 100% de glosa.',

    regulatoryReference: 'ANS TISS 4.01',
    glosaRiskWeight: 1.0,
    glosaCode: 'G001',

    canOverride: false,
    overrideRequires: 'blocked',

    suggestedCorrectionTemplate: 'Verify correct TISS code for the procedure. Check ANS TISS manual.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TISS: Authorization Required (YELLOW)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'TISS_REQUIRES_AUTH',
    name: 'Prior Authorization Required',
    version: '1.0.0',
    category: 'BILLING',
    defaultColor: 'YELLOW',
    isActive: true,

    applicableActions: ['billing', 'procedure'],
    requiredPayloadFields: ['tissCode'],

    conditionDescription: `
      Trigger YELLOW when TISS code requires prior authorization
      and authorization status is not 'approved'.

      High-cost procedures (imaging, surgeries, OPME) typically require
      prior authorization from the insurer.
    `,

    conditionLogic: {
      type: 'function-name',
      value: 'evaluateAuthorizationRequired',
    },

    dataDependencies: ['tissCode', 'priorAuth'],

    description: 'Procedure requires prior authorization from insurer',
    descriptionPortuguese: 'Procedimento requer autorização prévia da operadora',

    messageTemplate: 'AUTHORIZATION REQUIRED: {{tissCode}} ({{procedureName}}) requires prior auth. Current status: {{authStatus}}',
    messageTemplatePortuguese: 'AUTORIZAÇÃO NECESSÁRIA: {{tissCode}} ({{procedureName}}) requer autorização prévia. Status atual: {{authStatus}}',

    regulatoryReference: 'ANS RN 259/2011',
    glosaRiskWeight: 0.78,
    glosaCode: 'G002',

    canOverride: true,
    overrideRequires: 'justification',

    suggestedCorrectionTemplate: 'Submit prior authorization request via ANS portal before proceeding. Attach clinical justification.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CID-10: Procedure Incompatibility (YELLOW)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'CID_PROCEDURE_INCOMPATIBLE',
    name: 'CID-10 Procedure Incompatibility',
    version: '1.0.0',
    category: 'BILLING',
    defaultColor: 'YELLOW',
    isActive: true,

    applicableActions: ['billing', 'procedure'],
    requiredPayloadFields: ['tissCode'],

    conditionDescription: `
      Trigger YELLOW when the patient's CID-10 diagnosis does not
      clinically support the billed procedure.

      Insurers audit for compatibility - orthopedic procedures require
      musculoskeletal diagnoses, cardiac procedures require cardiovascular
      diagnoses, etc.
    `,

    conditionLogic: {
      type: 'function-name',
      value: 'evaluateCidProcedureCompatibility',
    },

    dataDependencies: ['diagnoses', 'tissCode'],

    description: 'CID-10 diagnosis does not support this procedure',
    descriptionPortuguese: 'Diagnóstico CID-10 não suporta este procedimento',

    messageTemplate: 'CID MISMATCH: {{tissCode}} is a {{procedureCategory}} procedure but patient CID {{cidCode}} is in category {{cidCategory}}.',
    messageTemplatePortuguese: 'INCOMPATIBILIDADE CID: {{tissCode}} é um procedimento de {{procedureCategory}} mas CID do paciente {{cidCode}} é categoria {{cidCategory}}.',

    regulatoryReference: 'ANS RN 465/2021',
    glosaRiskWeight: 0.65,
    glosaCode: 'G003',

    canOverride: true,
    overrideRequires: 'justification',

    suggestedCorrectionTemplate: 'Add supporting CID-10 code that justifies the procedure. Document clinical indication.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // OPME: Unauthorized (RED)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'OPME_UNAUTHORIZED',
    name: 'OPME Without Authorization',
    version: '1.0.0',
    category: 'BILLING',
    defaultColor: 'RED',
    isActive: true,

    applicableActions: ['billing', 'procedure'],
    requiredPayloadFields: ['opmeItems'],

    conditionDescription: `
      Trigger RED when billing includes OPME (medical materials/implants)
      without approved authorization.

      OPME items (prostheses, stents, pacemakers) ALWAYS require
      prior authorization. High glosa risk (32-35%).
    `,

    conditionLogic: {
      type: 'function-name',
      value: 'evaluateOpmeAuthorization',
    },

    dataDependencies: ['priorAuth'],

    description: 'OPME items require prior authorization',
    descriptionPortuguese: 'Itens OPME requerem autorização prévia',

    messageTemplate: 'OPME UNAUTHORIZED: {{opmeCount}} OPME items billed without authorization. Estimated glosa: R$ {{glosaAmount}}',
    messageTemplatePortuguese: 'OPME NÃO AUTORIZADO: {{opmeCount}} itens OPME faturados sem autorização. Glosa estimada: R$ {{glosaAmount}}',

    regulatoryReference: 'ANS RN 428/2017',
    glosaRiskWeight: 0.85,
    glosaCode: 'G008',

    canOverride: true,
    overrideRequires: 'supervisor',

    suggestedCorrectionTemplate: 'Submit OPME authorization request with: manufacturer, model, unit cost, clinical justification.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GLOSA: High-Risk Procedure (YELLOW)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'GLOSA_HIGH_RISK_PROCEDURE',
    name: 'High Glosa Risk Procedure',
    version: '1.0.0',
    category: 'BILLING',
    defaultColor: 'YELLOW',
    isActive: true,

    applicableActions: ['billing', 'procedure'],
    requiredPayloadFields: ['tissCode'],

    conditionDescription: `
      Trigger YELLOW when the TISS code has historically high glosa rate (>20%).
      Warn user to ensure all documentation is complete.
    `,

    conditionLogic: {
      type: 'function-name',
      value: 'evaluateHistoricalGlosaRisk',
    },

    dataDependencies: ['tissCode'],

    description: 'This procedure has high historical glosa rate',
    descriptionPortuguese: 'Este procedimento tem alta taxa histórica de glosa',

    messageTemplate: 'HIGH GLOSA RISK: {{tissCode}} ({{procedureName}}) has {{glosaRate}}% historical denial rate. Ensure complete documentation.',
    messageTemplatePortuguese: 'ALTO RISCO DE GLOSA: {{tissCode}} ({{procedureName}}) tem {{glosaRate}}% de taxa histórica de negativa. Assegure documentação completa.',

    regulatoryReference: 'ANS TISS 4.01',
    glosaRiskWeight: 0.50,

    canOverride: true,
    overrideRequires: 'justification',

    suggestedCorrectionTemplate: 'Document: clinical indication, supporting exams, procedure report, and evolution notes.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // BILLING: Amount Outlier (YELLOW)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'BILLING_AMOUNT_OUTLIER',
    name: 'Billing Amount Outlier',
    version: '1.0.0',
    category: 'BILLING',
    defaultColor: 'YELLOW',
    isActive: true,

    applicableActions: ['billing'],
    requiredPayloadFields: ['billedAmount', 'tissCode'],

    conditionDescription: `
      Trigger YELLOW when billed amount exceeds 2x the expected value
      for the TISS code. Insurers flag outliers for manual review.
    `,

    conditionLogic: {
      type: 'function-name',
      value: 'evaluateBillingAmountOutlier',
    },

    dataDependencies: ['tissCode'],

    description: 'Billed amount significantly exceeds expected value',
    descriptionPortuguese: 'Valor faturado excede significativamente o valor esperado',

    messageTemplate: 'AMOUNT OUTLIER: Billed R$ {{billedAmount}} for {{tissCode}}, expected ~R$ {{expectedAmount}}. {{deviation}}x over expected.',
    messageTemplatePortuguese: 'VALOR ATÍPICO: Faturado R$ {{billedAmount}} para {{tissCode}}, esperado ~R$ {{expectedAmount}}. {{deviation}}x acima do esperado.',

    regulatoryReference: 'ANS RN 465/2021',
    glosaRiskWeight: 0.40,
    glosaCode: 'G005',

    canOverride: true,
    overrideRequires: 'justification',

    suggestedCorrectionTemplate: 'Attach itemized breakdown justifying the higher amount. Include any unusual circumstances.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // AUTHORIZATION: Expired (YELLOW)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'AUTH_EXPIRED',
    name: 'Authorization Expired',
    version: '1.0.0',
    category: 'BILLING',
    defaultColor: 'YELLOW',
    isActive: true,

    applicableActions: ['billing', 'procedure'],
    requiredPayloadFields: ['priorAuthExpiry'],

    conditionDescription: `
      Trigger YELLOW when prior authorization exists but has expired
      or expires within 24 hours.
    `,

    conditionLogic: {
      type: 'function-name',
      value: 'evaluateAuthorizationExpiry',
    },

    dataDependencies: ['priorAuth'],

    description: 'Prior authorization has expired or expiring soon',
    descriptionPortuguese: 'Autorização prévia expirada ou expirando em breve',

    messageTemplate: 'AUTH EXPIRING: Authorization for {{tissCode}} expires {{expiryDate}}. {{daysRemaining}} days remaining.',
    messageTemplatePortuguese: 'AUTORIZAÇÃO EXPIRANDO: Autorização para {{tissCode}} expira em {{expiryDate}}. {{daysRemaining}} dias restantes.',

    regulatoryReference: 'ANS RN 259/2011',
    glosaRiskWeight: 0.60,
    glosaCode: 'G007',

    canOverride: true,
    overrideRequires: 'justification',

    suggestedCorrectionTemplate: 'Request authorization renewal before proceeding with the procedure.',
  },
];

export default BILLING_RULES;
