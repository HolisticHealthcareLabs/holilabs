/**
 * Billing Rules
 *
 * TISS code validation, plan coverage, and glosa (denial) prevention.
 * These rules protect revenue integrity - primary LATAM value proposition.
 *
 * Rule Categories:
 * - TISS_* : TISS code validation and coverage
 * - OPME_* : Prosthetics/orthotics authorization
 * - PLAN_* : Insurance plan coverage checks
 * - GLOSA_* : Glosa risk prevention
 *
 * Brazilian Context:
 * - 18.25% initial denial rate in Brazilian market
 * - R$300B annual market - preventing 1% glosas = R$3B value
 * - TISS is the mandatory billing standard (ANS normative)
 *
 * @module lib/traffic-light/rules/billing
 */

import type {
  RuleDefinition,
  EvaluationContext,
  PatientContext,
  TrafficLightSignal,
  GlosaRiskEstimate,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TISS CODE DATABASE (Sample - Production would load from database)
// ═══════════════════════════════════════════════════════════════════════════════

interface TissCodeInfo {
  code: string;
  description: string;
  descriptionPortuguese: string;
  category: string;
  requiresAuth: boolean;
  requiresDiagnosis: boolean;
  validCid10Prefixes?: string[]; // CID-10 codes that support this procedure
  avgGlosaRate: number; // Historical glosa rate for this code (0-1)
  avgAmount: number; // Average R$ value
}

const TISS_CODES: Record<string, TissCodeInfo> = {
  // Imaging procedures
  '40301010': {
    code: '40301010',
    description: 'CT scan of head without contrast',
    descriptionPortuguese: 'Tomografia computadorizada do cranio sem contraste',
    category: 'IMAGING',
    requiresAuth: false,
    requiresDiagnosis: true,
    validCid10Prefixes: ['G', 'R51', 'S0', 'I6', 'C7'],
    avgGlosaRate: 0.08,
    avgAmount: 350,
  },
  '40301028': {
    code: '40301028',
    description: 'CT scan of head with contrast',
    descriptionPortuguese: 'Tomografia computadorizada do cranio com contraste',
    category: 'IMAGING',
    requiresAuth: true,
    requiresDiagnosis: true,
    validCid10Prefixes: ['G', 'C7', 'I6'],
    avgGlosaRate: 0.12,
    avgAmount: 550,
  },
  '40401014': {
    code: '40401014',
    description: 'MRI of brain without contrast',
    descriptionPortuguese: 'Ressonancia magnetica de encefalo sem contraste',
    category: 'IMAGING',
    requiresAuth: true,
    requiresDiagnosis: true,
    validCid10Prefixes: ['G', 'C7', 'I6', 'R51'],
    avgGlosaRate: 0.15,
    avgAmount: 1200,
  },
  // Laboratory procedures
  '40301397': {
    code: '40301397',
    description: 'Complete blood count',
    descriptionPortuguese: 'Hemograma completo',
    category: 'LABORATORY',
    requiresAuth: false,
    requiresDiagnosis: false,
    avgGlosaRate: 0.02,
    avgAmount: 25,
  },
  '40302040': {
    code: '40302040',
    description: 'Glycated hemoglobin (HbA1c)',
    descriptionPortuguese: 'Hemoglobina glicada (HbA1c)',
    category: 'LABORATORY',
    requiresAuth: false,
    requiresDiagnosis: true,
    validCid10Prefixes: ['E10', 'E11', 'E13', 'E14'],
    avgGlosaRate: 0.05,
    avgAmount: 45,
  },
  // Surgical procedures (OPME)
  '30715016': {
    code: '30715016',
    description: 'Total knee arthroplasty',
    descriptionPortuguese: 'Artroplastia total de joelho',
    category: 'SURGERY_OPME',
    requiresAuth: true,
    requiresDiagnosis: true,
    validCid10Prefixes: ['M17', 'M15', 'S82'],
    avgGlosaRate: 0.22,
    avgAmount: 25000,
  },
  '30715024': {
    code: '30715024',
    description: 'Total hip arthroplasty',
    descriptionPortuguese: 'Artroplastia total de quadril',
    category: 'SURGERY_OPME',
    requiresAuth: true,
    requiresDiagnosis: true,
    validCid10Prefixes: ['M16', 'S72'],
    avgGlosaRate: 0.20,
    avgAmount: 28000,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMMON GLOSA CODES (ANS denial codes)
// ═══════════════════════════════════════════════════════════════════════════════

interface GlosaCode {
  code: string;
  description: string;
  descriptionPortuguese: string;
  preventable: boolean;
  commonCauses: string[];
}

const GLOSA_CODES: Record<string, GlosaCode> = {
  G001: {
    code: 'G001',
    description: 'Procedure not covered by plan',
    descriptionPortuguese: 'Procedimento nao coberto pelo plano',
    preventable: true,
    commonCauses: ['Plan exclusion', 'Out of coverage period'],
  },
  G002: {
    code: 'G002',
    description: 'Missing prior authorization',
    descriptionPortuguese: 'Ausencia de autorizacao previa',
    preventable: true,
    commonCauses: ['OPME without auth', 'High-cost procedure without auth'],
  },
  G003: {
    code: 'G003',
    description: 'Diagnosis incompatible with procedure',
    descriptionPortuguese: 'Diagnostico incompativel com o procedimento',
    preventable: true,
    commonCauses: ['Wrong CID-10', 'Missing diagnosis'],
  },
  G004: {
    code: 'G004',
    description: 'Duplicate billing',
    descriptionPortuguese: 'Cobranca em duplicidade',
    preventable: true,
    commonCauses: ['Same procedure billed twice', 'Billing error'],
  },
  G005: {
    code: 'G005',
    description: 'Exceeded quantity limit',
    descriptionPortuguese: 'Quantidade acima do limite permitido',
    preventable: true,
    commonCauses: ['Multiple sessions over limit', 'Material quantity exceeded'],
  },
  G006: {
    code: 'G006',
    description: 'Invalid or expired TISS code',
    descriptionPortuguese: 'Codigo TISS invalido ou expirado',
    preventable: true,
    commonCauses: ['Outdated code table', 'Typo in code'],
  },
  G007: {
    code: 'G007',
    description: 'Missing required documentation',
    descriptionPortuguese: 'Documentacao obrigatoria ausente',
    preventable: true,
    commonCauses: ['Missing clinical justification', 'Missing exam results'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getTissCodeInfo(code: string): TissCodeInfo | undefined {
  return TISS_CODES[code];
}

function checkCid10Compatibility(tissCode: TissCodeInfo, cid10Code?: string): boolean {
  if (!tissCode.validCid10Prefixes || !cid10Code) {
    return true; // No restriction or no diagnosis provided
  }
  return tissCode.validCid10Prefixes.some((prefix) =>
    cid10Code.toUpperCase().startsWith(prefix)
  );
}

function calculateGlosaRisk(
  baseRate: number,
  factors: { missingAuth?: boolean; incompatibleDiagnosis?: boolean; highValue?: boolean }
): GlosaRiskEstimate {
  let probability = baseRate * 100;

  if (factors.missingAuth) probability += 45; // Missing auth dramatically increases risk
  if (factors.incompatibleDiagnosis) probability += 35;
  if (factors.highValue) probability += 10; // High-value procedures get more scrutiny

  probability = Math.min(probability, 98); // Cap at 98%

  return {
    probability,
    estimatedAmount: 0, // Filled by caller
    riskFactors: Object.entries(factors)
      .filter(([, v]) => v)
      .map(([k]) => k),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BILLING RULES
// ═══════════════════════════════════════════════════════════════════════════════

export const billingRules: RuleDefinition[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // TISS CODE VALIDATION
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'TISS_CODE_INVALID',
    name: 'Invalid TISS Code',
    category: 'BILLING',
    defaultColor: 'RED',
    isActive: true,
    description: 'TISS procedure code is invalid or not recognized',
    descriptionPortuguese: 'Codigo TISS do procedimento e invalido ou nao reconhecido',
    regulatoryReference: 'ANS RN 465/2021',
    glosaRiskWeight: 0.98,

    async evaluate(context, _patientContext): Promise<TrafficLightSignal | null> {
      const tissCode = context.payload.tissCode || context.payload.procedure?.code;
      if (!tissCode) return null;

      const codeInfo = getTissCodeInfo(tissCode);

      if (!codeInfo) {
        return {
          ruleId: 'TISS_CODE_INVALID',
          ruleName: 'Invalid TISS Code',
          category: 'BILLING',
          color: 'RED',
          message: `TISS code ${tissCode} is not recognized in the current TISS table`,
          messagePortuguese: `Codigo TISS ${tissCode} nao e reconhecido na tabela TISS atual`,
          regulatoryReference: 'ANS RN 465/2021',
          evidence: [`Submitted code: ${tissCode}`, 'Code not found in TISS registry'],
          estimatedGlosaRisk: {
            probability: 98,
            estimatedAmount: context.payload.billedAmount || 0,
            denialCode: 'G006',
            riskFactors: ['Invalid TISS code'],
          },
          suggestedCorrection: 'Verify TISS code against current ANS table. Code may be outdated.',
          suggestedCorrectionPortuguese:
            'Verificar codigo TISS na tabela ANS atual. Codigo pode estar desatualizado.',
        };
      }

      return null;
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // AUTHORIZATION CHECKS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'TISS_REQUIRES_AUTH',
    name: 'Prior Authorization Required',
    category: 'BILLING',
    defaultColor: 'YELLOW',
    isActive: true,
    description: 'Procedure requires prior authorization from insurer',
    descriptionPortuguese: 'Procedimento requer autorizacao previa da operadora',
    regulatoryReference: 'ANS RN 395/2016',
    glosaRiskWeight: 0.65,

    async evaluate(context, _patientContext): Promise<TrafficLightSignal | null> {
      const tissCode = context.payload.tissCode || context.payload.procedure?.code;
      if (!tissCode) return null;

      const codeInfo = getTissCodeInfo(tissCode);
      if (!codeInfo || !codeInfo.requiresAuth) return null;

      const hasAuth = context.payload.priorAuthStatus === 'approved';

      if (!hasAuth) {
        const glosaRisk = calculateGlosaRisk(codeInfo.avgGlosaRate, {
          missingAuth: true,
          highValue: codeInfo.avgAmount > 5000,
        });
        glosaRisk.estimatedAmount = context.payload.billedAmount || codeInfo.avgAmount;
        glosaRisk.denialCode = 'G002';

        return {
          ruleId: 'TISS_REQUIRES_AUTH',
          ruleName: 'Prior Authorization Required',
          category: 'BILLING',
          color: glosaRisk.probability > 70 ? 'RED' : 'YELLOW',
          message: `${codeInfo.description} requires prior authorization`,
          messagePortuguese: `${codeInfo.descriptionPortuguese} requer autorizacao previa`,
          regulatoryReference: 'ANS RN 395/2016',
          evidence: [
            `TISS code: ${tissCode}`,
            `Procedure: ${codeInfo.description}`,
            `Authorization status: ${context.payload.priorAuthStatus || 'Not submitted'}`,
          ],
          estimatedGlosaRisk: glosaRisk,
          suggestedCorrection: 'Submit prior authorization request to insurer before procedure.',
          suggestedCorrectionPortuguese:
            'Submeter solicitacao de autorizacao previa a operadora antes do procedimento.',
        };
      }

      return null;
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // CID-10 / PROCEDURE COMPATIBILITY
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'CID_PROCEDURE_INCOMPATIBLE',
    name: 'Diagnosis-Procedure Mismatch',
    category: 'BILLING',
    defaultColor: 'YELLOW',
    isActive: true,
    description: 'CID-10 diagnosis may not support this procedure',
    descriptionPortuguese: 'Diagnostico CID-10 pode nao justificar este procedimento',
    regulatoryReference: 'ANS RN 465/2021',
    glosaRiskWeight: 0.55,

    async evaluate(context, patientContext): Promise<TrafficLightSignal | null> {
      const tissCode = context.payload.tissCode || context.payload.procedure?.code;
      const cid10Code =
        context.payload.diagnosis?.icd10Code ||
        patientContext.diagnoses?.find((d) => d.status === 'ACTIVE')?.icd10Code;

      if (!tissCode) return null;

      const codeInfo = getTissCodeInfo(tissCode);
      if (!codeInfo || !codeInfo.requiresDiagnosis) return null;

      // Missing diagnosis entirely
      if (!cid10Code) {
        const glosaRisk = calculateGlosaRisk(codeInfo.avgGlosaRate, {
          incompatibleDiagnosis: true,
        });
        glosaRisk.estimatedAmount = context.payload.billedAmount || codeInfo.avgAmount;
        glosaRisk.denialCode = 'G003';

        return {
          ruleId: 'CID_MISSING',
          ruleName: 'Missing Diagnosis Code',
          category: 'BILLING',
          color: 'YELLOW',
          message: `${codeInfo.description} requires a diagnosis code`,
          messagePortuguese: `${codeInfo.descriptionPortuguese} requer codigo de diagnostico`,
          regulatoryReference: 'ANS RN 465/2021',
          evidence: [`TISS code: ${tissCode}`, 'No CID-10 diagnosis provided'],
          estimatedGlosaRisk: glosaRisk,
          suggestedCorrection: 'Add CID-10 diagnosis code that justifies this procedure.',
          suggestedCorrectionPortuguese:
            'Adicionar codigo CID-10 de diagnostico que justifique este procedimento.',
        };
      }

      // Check compatibility
      if (!checkCid10Compatibility(codeInfo, cid10Code)) {
        const glosaRisk = calculateGlosaRisk(codeInfo.avgGlosaRate, {
          incompatibleDiagnosis: true,
          highValue: codeInfo.avgAmount > 5000,
        });
        glosaRisk.estimatedAmount = context.payload.billedAmount || codeInfo.avgAmount;
        glosaRisk.denialCode = 'G003';

        return {
          ruleId: 'CID_PROCEDURE_INCOMPATIBLE',
          ruleName: 'Diagnosis-Procedure Mismatch',
          category: 'BILLING',
          color: glosaRisk.probability > 60 ? 'RED' : 'YELLOW',
          message: `CID-10 ${cid10Code} may not support ${codeInfo.description}`,
          messagePortuguese: `CID-10 ${cid10Code} pode nao justificar ${codeInfo.descriptionPortuguese}`,
          regulatoryReference: 'ANS RN 465/2021',
          evidence: [
            `TISS code: ${tissCode}`,
            `CID-10: ${cid10Code}`,
            `Expected CID-10 prefixes: ${codeInfo.validCid10Prefixes?.join(', ')}`,
          ],
          estimatedGlosaRisk: glosaRisk,
          suggestedCorrection:
            'Review CID-10 code. Consider primary diagnosis that better supports procedure.',
          suggestedCorrectionPortuguese:
            'Revisar codigo CID-10. Considerar diagnostico principal que melhor justifique o procedimento.',
        };
      }

      return null;
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // OPME (Prosthetics/Orthotics) RULES
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'OPME_UNAUTHORIZED',
    name: 'OPME Without Authorization',
    category: 'BILLING',
    defaultColor: 'RED',
    isActive: true,
    description: 'Prosthetics/orthotics require prior authorization',
    descriptionPortuguese: 'Orteses/proteses requerem autorizacao previa',
    regulatoryReference: 'ANS RN 428/2017',
    glosaRiskWeight: 0.78,

    async evaluate(context, _patientContext): Promise<TrafficLightSignal | null> {
      const tissCode = context.payload.tissCode || context.payload.procedure?.code;
      const opmeItems = context.payload.opmeItems as string[] | undefined;

      if (!tissCode) return null;

      const codeInfo = getTissCodeInfo(tissCode);
      if (!codeInfo || codeInfo.category !== 'SURGERY_OPME') return null;

      const hasAuth = context.payload.priorAuthStatus === 'approved';

      if (!hasAuth || (opmeItems && opmeItems.length > 0 && !context.payload.opmeAuthApproved)) {
        return {
          ruleId: 'OPME_UNAUTHORIZED',
          ruleName: 'OPME Without Authorization',
          category: 'BILLING',
          color: 'RED',
          message: `OPME procedure ${codeInfo.description} requires prior authorization`,
          messagePortuguese: `Procedimento OPME ${codeInfo.descriptionPortuguese} requer autorizacao previa`,
          regulatoryReference: 'ANS RN 428/2017',
          evidence: [
            `TISS code: ${tissCode}`,
            `Category: OPME`,
            opmeItems ? `Materials: ${opmeItems.join(', ')}` : 'No OPME items specified',
            `Authorization status: ${context.payload.priorAuthStatus || 'Not submitted'}`,
          ],
          estimatedGlosaRisk: {
            probability: 78,
            estimatedAmount: context.payload.billedAmount || codeInfo.avgAmount,
            denialCode: 'G002',
            riskFactors: ['OPME without prior authorization'],
          },
          suggestedCorrection:
            'Submit OPME authorization request with clinical justification and 3 quotes.',
          suggestedCorrectionPortuguese:
            'Submeter solicitacao de autorizacao OPME com justificativa clinica e 3 orcamentos.',
        };
      }

      return null;
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // HIGH GLOSA RISK ALERT
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'GLOSA_HIGH_RISK_PROCEDURE',
    name: 'High Glosa Risk Procedure',
    category: 'BILLING',
    defaultColor: 'YELLOW',
    isActive: true,
    description: 'This procedure has historically high denial rate',
    descriptionPortuguese: 'Este procedimento tem historico de alta taxa de glosa',
    regulatoryReference: 'Internal analytics',
    glosaRiskWeight: 0.50,

    async evaluate(context, _patientContext): Promise<TrafficLightSignal | null> {
      const tissCode = context.payload.tissCode || context.payload.procedure?.code;
      if (!tissCode) return null;

      const codeInfo = getTissCodeInfo(tissCode);
      if (!codeInfo || codeInfo.avgGlosaRate < 0.15) return null; // Only flag >15% glosa rate

      return {
        ruleId: 'GLOSA_HIGH_RISK_PROCEDURE',
        ruleName: 'High Glosa Risk Procedure',
        category: 'BILLING',
        color: 'YELLOW',
        message: `${codeInfo.description} has ${(codeInfo.avgGlosaRate * 100).toFixed(0)}% historical glosa rate`,
        messagePortuguese: `${codeInfo.descriptionPortuguese} tem ${(codeInfo.avgGlosaRate * 100).toFixed(0)}% de taxa historica de glosa`,
        evidence: [
          `TISS code: ${tissCode}`,
          `Historical glosa rate: ${(codeInfo.avgGlosaRate * 100).toFixed(1)}%`,
          `Average value: R$ ${codeInfo.avgAmount.toLocaleString('pt-BR')}`,
        ],
        estimatedGlosaRisk: {
          probability: codeInfo.avgGlosaRate * 100,
          estimatedAmount: context.payload.billedAmount || codeInfo.avgAmount,
          riskFactors: ['High historical denial rate'],
        },
        suggestedCorrection:
          'Ensure complete documentation: clinical justification, supporting exams, correct CID-10.',
        suggestedCorrectionPortuguese:
          'Garantir documentacao completa: justificativa clinica, exames de apoio, CID-10 correto.',
      };
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // BILLING AMOUNT VALIDATION
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'BILLING_AMOUNT_OUTLIER',
    name: 'Billed Amount Outlier',
    category: 'BILLING',
    defaultColor: 'YELLOW',
    isActive: true,
    description: 'Billed amount significantly differs from expected',
    descriptionPortuguese: 'Valor cobrado difere significativamente do esperado',
    glosaRiskWeight: 0.40,

    async evaluate(context, _patientContext): Promise<TrafficLightSignal | null> {
      const tissCode = context.payload.tissCode || context.payload.procedure?.code;
      const billedAmount = context.payload.billedAmount as number | undefined;

      if (!tissCode || !billedAmount) return null;

      const codeInfo = getTissCodeInfo(tissCode);
      if (!codeInfo) return null;

      const deviation = Math.abs(billedAmount - codeInfo.avgAmount) / codeInfo.avgAmount;

      // Flag if >50% deviation from average
      if (deviation > 0.5) {
        const isOverCharge = billedAmount > codeInfo.avgAmount;

        return {
          ruleId: 'BILLING_AMOUNT_OUTLIER',
          ruleName: 'Billed Amount Outlier',
          category: 'BILLING',
          color: deviation > 1.0 ? 'RED' : 'YELLOW',
          message: `Billed R$ ${billedAmount.toLocaleString('pt-BR')} is ${(deviation * 100).toFixed(0)}% ${isOverCharge ? 'above' : 'below'} average`,
          messagePortuguese: `Cobrado R$ ${billedAmount.toLocaleString('pt-BR')} esta ${(deviation * 100).toFixed(0)}% ${isOverCharge ? 'acima' : 'abaixo'} da media`,
          evidence: [
            `TISS code: ${tissCode}`,
            `Billed: R$ ${billedAmount.toLocaleString('pt-BR')}`,
            `Average: R$ ${codeInfo.avgAmount.toLocaleString('pt-BR')}`,
            `Deviation: ${(deviation * 100).toFixed(1)}%`,
          ],
          estimatedGlosaRisk: {
            probability: Math.min(deviation * 50, 80),
            estimatedAmount: isOverCharge ? billedAmount - codeInfo.avgAmount : 0,
            riskFactors: [`Amount ${isOverCharge ? 'significantly above' : 'below'} average`],
          },
          suggestedCorrection: isOverCharge
            ? 'Review billing amount. Document justification for higher cost if valid.'
            : 'Verify billing amount is correct.',
          suggestedCorrectionPortuguese: isOverCharge
            ? 'Revisar valor cobrado. Documentar justificativa para custo maior se valido.'
            : 'Verificar se valor cobrado esta correto.',
        };
      }

      return null;
    },
  },
];
