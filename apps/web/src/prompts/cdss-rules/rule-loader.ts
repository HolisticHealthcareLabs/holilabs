/**
 * CDSS Rule Loader (Prompt-Native)
 *
 * Loads rule templates and compiles them into evaluators.
 *
 * PROMPT-NATIVE ARCHITECTURE:
 * Rules are defined in templates, loaded and compiled at runtime.
 * This enables rule updates without code deployments.
 *
 * @module prompts/cdss-rules/rule-loader
 */

import type {
  CDSSRuleTemplate,
  CDSSPatientContext,
  CDSSEvaluationResult,
  CompiledCDSSRule,
  AIInsight,
  InsightPriority,
} from './types';

import {
  CLINICAL_RULES,
  DRUG_INTERACTIONS,
  DRUG_CLASSES,
  LAB_MONITORING,
  NEPHROTOXIC_DRUGS,
  HYPERTENSION_DRUGS,
  DIABETES_DRUGS,
} from './clinical-rules';

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function daysSince(date: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

function getPatientName(ctx: CDSSPatientContext): string {
  return `${ctx.firstName} ${ctx.lastName}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// RULE EVALUATOR FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

const EVALUATOR_FUNCTIONS: Record<
  string,
  (ctx: CDSSPatientContext, template: CDSSRuleTemplate) => Promise<CDSSEvaluationResult | null>
> = {
  // ─────────────────────────────────────────────────────────────────────────
  // Drug Interactions
  // ─────────────────────────────────────────────────────────────────────────
  evaluateDrugInteractions: async (ctx, template) => {
    const meds = ctx.medications.map((m) => m.name.toLowerCase());
    const results: CDSSEvaluationResult[] = [];

    for (const interaction of DRUG_INTERACTIONS) {
      const hasDrug1 = meds.some((m) => m.includes(interaction.drug1));
      const hasDrug2 = meds.some((m) => m.includes(interaction.drug2));

      if (hasDrug1 && hasDrug2) {
        results.push({
          triggered: true,
          priority: interaction.priority,
          title: template.titleTemplate,
          message: template.messageTemplate
            .replace('{{patientName}}', getPatientName(ctx))
            .replace('{{drug1}}', interaction.drug1)
            .replace('{{drug2}}', interaction.drug2)
            .replace('{{risk}}', interaction.risk),
          messagePortuguese: template.messageTemplatePortuguese
            .replace('{{patientName}}', getPatientName(ctx))
            .replace('{{drug1}}', interaction.drug1)
            .replace('{{drug2}}', interaction.drug2)
            .replace('{{risk}}', interaction.risk),
          confidence: template.defaultConfidence,
          evidence: template.evidence,
          actions: template.actions?.map((a) => ({
            label: a.label,
            type: a.type,
            actionType: a.actionType,
            metadata: {
              patientId: ctx.id,
              drug1: interaction.drug1,
              drug2: interaction.drug2,
            },
          })),
          metadata: { drug1: interaction.drug1, drug2: interaction.drug2, risk: interaction.risk },
        });
      }
    }

    // Return first interaction found (or null if none)
    return results.length > 0 ? results[0] : null;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Sepsis Risk (qSOFA)
  // ─────────────────────────────────────────────────────────────────────────
  evaluateSepsisRisk: async (ctx, template) => {
    if (ctx.vitals.length === 0) return null;

    const latestVitals = ctx.vitals[0];

    // Check if we have sufficient vital signs data
    if (
      !latestVitals.respiratoryRate &&
      !latestVitals.systolicBP &&
      !latestVitals.heartRate
    ) {
      return null;
    }

    // qSOFA score calculation
    let qSofaScore = 0;
    const criteria: string[] = [];

    if (latestVitals.respiratoryRate && latestVitals.respiratoryRate >= 22) {
      qSofaScore++;
      criteria.push(`Tachypnea (RR ${latestVitals.respiratoryRate})`);
    }

    if (latestVitals.systolicBP && latestVitals.systolicBP <= 100) {
      qSofaScore++;
      criteria.push(`Hypotension (SBP ${latestVitals.systolicBP})`);
    }

    if (latestVitals.heartRate && latestVitals.heartRate >= 110) {
      qSofaScore++;
      criteria.push(`Tachycardia (HR ${latestVitals.heartRate})`);
    }

    if (
      latestVitals.temperature &&
      (latestVitals.temperature >= 38.0 || latestVitals.temperature <= 36.0)
    ) {
      criteria.push(`Temperature ${latestVitals.temperature}°C`);
    }

    // qSOFA >= 2 indicates high sepsis risk
    if (qSofaScore >= 2) {
      return {
        triggered: true,
        priority: 'critical',
        title: template.titleTemplate,
        message: template.messageTemplate
          .replace('{{patientName}}', getPatientName(ctx))
          .replace('{{qSofaScore}}', qSofaScore.toString())
          .replace('{{criteria}}', criteria.join(', ')),
        messagePortuguese: template.messageTemplatePortuguese
          .replace('{{patientName}}', getPatientName(ctx))
          .replace('{{qSofaScore}}', qSofaScore.toString())
          .replace('{{criteria}}', criteria.join(', ')),
        confidence: 85 + qSofaScore * 5,
        evidence: template.evidence,
        actions: template.actions?.map((a) => ({
          label: a.label,
          type: a.type,
          actionType: a.actionType,
          metadata: { patientId: ctx.id, protocol: 'sepsis' },
        })),
        metadata: { qSofaScore, criteria },
      };
    }

    return null;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Hypertension Detection
  // ─────────────────────────────────────────────────────────────────────────
  evaluateHypertension: async (ctx, template) => {
    if (ctx.vitals.length === 0) return null;

    const latestVitals = ctx.vitals[0];

    if (
      latestVitals.systolicBP &&
      latestVitals.diastolicBP &&
      (latestVitals.systolicBP >= 140 || latestVitals.diastolicBP >= 90)
    ) {
      // Check if already on hypertension meds
      const onHypertensionMeds = ctx.medications.some((m) =>
        HYPERTENSION_DRUGS.some((med) => m.name.toLowerCase().includes(med))
      );

      if (!onHypertensionMeds) {
        return {
          triggered: true,
          priority: 'high',
          title: template.titleTemplate,
          message: template.messageTemplate
            .replace('{{patientName}}', getPatientName(ctx))
            .replace('{{systolic}}', latestVitals.systolicBP.toString())
            .replace('{{diastolic}}', latestVitals.diastolicBP.toString()),
          messagePortuguese: template.messageTemplatePortuguese
            .replace('{{patientName}}', getPatientName(ctx))
            .replace('{{systolic}}', latestVitals.systolicBP.toString())
            .replace('{{diastolic}}', latestVitals.diastolicBP.toString()),
          confidence: template.defaultConfidence,
          evidence: template.evidence,
          actions: template.actions?.map((a) => ({
            label: a.label,
            type: a.type,
            actionType: a.actionType,
            metadata: { patientId: ctx.id, condition: 'hypertension' },
          })),
        };
      }
    }

    return null;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Critical Lab Values
  // ─────────────────────────────────────────────────────────────────────────
  evaluateCriticalLabs: async (ctx, template) => {
    const criticalLabs = ctx.labResults.filter((lab) => lab.isCritical);

    if (criticalLabs.length === 0) return null;

    const lab = criticalLabs[0]; // Return first critical lab

    return {
      triggered: true,
      priority: 'critical',
      title: template.titleTemplate,
      message: template.messageTemplate
        .replace('{{patientName}}', getPatientName(ctx))
        .replace('{{testName}}', lab.testName)
        .replace('{{value}}', lab.value)
        .replace('{{unit}}', lab.unit)
        .replace('{{referenceRange}}', lab.referenceRange),
      messagePortuguese: template.messageTemplatePortuguese
        .replace('{{patientName}}', getPatientName(ctx))
        .replace('{{testName}}', lab.testName)
        .replace('{{value}}', lab.value)
        .replace('{{unit}}', lab.unit)
        .replace('{{referenceRange}}', lab.referenceRange),
      confidence: template.defaultConfidence,
      actions: template.actions?.map((a) => ({
        label: a.label,
        type: a.type,
        actionType: a.actionType,
        metadata: { patientId: ctx.id, testName: lab.testName },
      })),
      metadata: { testName: lab.testName, value: lab.value, unit: lab.unit },
    };
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Polypharmacy Alert
  // ─────────────────────────────────────────────────────────────────────────
  evaluatePolypharmacy: async (ctx, template) => {
    const activeMedCount = ctx.medications.length;

    if (activeMedCount >= 10) {
      return {
        triggered: true,
        priority: 'medium',
        title: template.titleTemplate,
        message: template.messageTemplate
          .replace('{{patientName}}', getPatientName(ctx))
          .replace('{{medicationCount}}', activeMedCount.toString()),
        messagePortuguese: template.messageTemplatePortuguese
          .replace('{{patientName}}', getPatientName(ctx))
          .replace('{{medicationCount}}', activeMedCount.toString()),
        confidence: template.defaultConfidence,
        evidence: template.evidence,
        actions: template.actions?.map((a) => ({
          label: a.label,
          type: a.type,
          actionType: a.actionType,
          metadata: { patientId: ctx.id },
        })),
        metadata: { medicationCount: activeMedCount },
      };
    }

    return null;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Renal Function Monitoring
  // ─────────────────────────────────────────────────────────────────────────
  evaluateRenalMonitoring: async (ctx, template) => {
    const onNephrotoxicMeds = ctx.medications.some((m) =>
      NEPHROTOXIC_DRUGS.some((drug) => m.name.toLowerCase().includes(drug))
    );

    if (!onNephrotoxicMeds) return null;

    const hasRecentCreatinine = ctx.labResults.some(
      (lab) =>
        (lab.testName.toLowerCase().includes('creatinine') ||
          lab.testName.toLowerCase().includes('gfr')) &&
        daysSince(lab.createdAt) <= 180
    );

    if (!hasRecentCreatinine) {
      return {
        triggered: true,
        priority: 'high',
        title: template.titleTemplate,
        message: template.messageTemplate.replace('{{patientName}}', getPatientName(ctx)),
        messagePortuguese: template.messageTemplatePortuguese.replace('{{patientName}}', getPatientName(ctx)),
        confidence: template.defaultConfidence,
        evidence: template.evidence,
        actions: template.actions?.map((a) => ({
          label: a.label,
          type: a.type,
          actionType: a.actionType,
          metadata: { patientId: ctx.id, test: 'Creatinine' },
        })),
      };
    }

    return null;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // INR Monitoring (Warfarin)
  // ─────────────────────────────────────────────────────────────────────────
  evaluateInrMonitoring: async (ctx, template) => {
    const onWarfarin = ctx.medications.some((m) =>
      m.name.toLowerCase().includes('warfarin')
    );

    if (!onWarfarin) return null;

    const recentINR = ctx.labResults.find(
      (lab) =>
        lab.testName.toLowerCase().includes('inr') &&
        daysSince(lab.createdAt) <= 30
    );

    if (!recentINR) {
      return {
        triggered: true,
        priority: 'high',
        title: template.titleTemplate.replace('{{status}}', 'Overdue'),
        message: template.messageTemplate
          .replace('{{patientName}}', getPatientName(ctx))
          .replace('{{message}}', 'is on warfarin without INR testing in the past 30 days. Risk of bleeding or clotting complications.'),
        messagePortuguese: template.messageTemplatePortuguese
          .replace('{{patientName}}', getPatientName(ctx))
          .replace('{{messagePortuguese}}', 'esta usando varfarina sem teste de INR nos ultimos 30 dias. Risco de complicacoes hemorragicas ou tromboticas.'),
        confidence: template.defaultConfidence,
        evidence: template.evidence,
        actions: template.actions?.map((a) => ({
          label: 'Order INR',
          type: a.type,
          actionType: a.actionType,
          metadata: { patientId: ctx.id, test: 'INR' },
        })),
      };
    } else {
      // Check if INR is therapeutic
      const inrValue = parseFloat(recentINR.value);
      if (!isNaN(inrValue) && (inrValue < 2.0 || inrValue > 3.5)) {
        const isSubtherapeutic = inrValue < 2.0;
        const isCritical = inrValue < 1.5 || inrValue > 4.0;

        return {
          triggered: true,
          priority: isCritical ? 'critical' : 'high',
          title: template.titleTemplate.replace('{{status}}', 'Out of Range'),
          message: template.messageTemplate
            .replace('{{patientName}}', getPatientName(ctx))
            .replace('{{message}}', `INR ${inrValue} is ${isSubtherapeutic ? 'below' : 'above'} therapeutic range. ${isSubtherapeutic ? 'Increased clotting risk' : 'Increased bleeding risk'}.`),
          messagePortuguese: template.messageTemplatePortuguese
            .replace('{{patientName}}', getPatientName(ctx))
            .replace('{{messagePortuguese}}', `INR ${inrValue} esta ${isSubtherapeutic ? 'abaixo' : 'acima'} da faixa terapeutica. ${isSubtherapeutic ? 'Risco aumentado de trombose' : 'Risco aumentado de sangramento'}.`),
          confidence: 97,
          evidence: template.evidence,
          actions: [
            {
              label: 'Adjust Dose',
              type: 'primary',
              actionType: 'adjust_medication',
              metadata: { patientId: ctx.id, medication: 'warfarin', inrValue },
            },
          ],
          metadata: { inrValue, targetRange: '2.0-3.0' },
        };
      }
    }

    return null;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Diabetes Treatment Gap
  // ─────────────────────────────────────────────────────────────────────────
  evaluateDiabetesTreatmentGap: async (ctx, template) => {
    const hasDiabetes = ctx.diagnoses.some(
      (d) => d.icd10Code.startsWith('E10') || d.icd10Code.startsWith('E11')
    );

    if (!hasDiabetes) return null;

    const onDiabetesMeds = ctx.medications.some((m) =>
      DIABETES_DRUGS.some((drug) => m.name.toLowerCase().includes(drug))
    );

    if (!onDiabetesMeds) {
      return {
        triggered: true,
        priority: 'high',
        title: template.titleTemplate,
        message: template.messageTemplate.replace('{{patientName}}', getPatientName(ctx)),
        messagePortuguese: template.messageTemplatePortuguese.replace('{{patientName}}', getPatientName(ctx)),
        confidence: template.defaultConfidence,
        evidence: template.evidence,
        actions: template.actions?.map((a) => ({
          label: a.label,
          type: a.type,
          actionType: a.actionType,
          metadata: { patientId: ctx.id, condition: 'diabetes' },
        })),
      };
    }

    return null;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Duplicate Therapy
  // ─────────────────────────────────────────────────────────────────────────
  evaluateDuplicateTherapy: async (ctx, template) => {
    for (const drugClass of DRUG_CLASSES) {
      const matchingMeds = ctx.medications.filter((m) =>
        drugClass.drugs.some((drug) => m.name.toLowerCase().includes(drug))
      );

      if (matchingMeds.length > 1) {
        return {
          triggered: true,
          priority: 'medium',
          title: template.titleTemplate,
          message: template.messageTemplate
            .replace('{{patientName}}', getPatientName(ctx))
            .replace('{{className}}', drugClass.name)
            .replace('{{medications}}', matchingMeds.map((m) => m.name).join(', ')),
          messagePortuguese: template.messageTemplatePortuguese
            .replace('{{patientName}}', getPatientName(ctx))
            .replace('{{className}}', drugClass.name)
            .replace('{{medications}}', matchingMeds.map((m) => m.name).join(', ')),
          confidence: template.defaultConfidence,
          actions: template.actions?.map((a) => ({
            label: a.label,
            type: a.type,
            actionType: a.actionType,
            metadata: { patientId: ctx.id, className: drugClass.name },
          })),
          metadata: { drugClass: drugClass.name, medications: matchingMeds.map((m) => m.name) },
        };
      }
    }

    return null;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Statin Liver Monitoring
  // ─────────────────────────────────────────────────────────────────────────
  evaluateStatinMonitoring: async (ctx, template) => {
    const statins = ['atorvastatin', 'simvastatin', 'rosuvastatin', 'pravastatin'];
    const onStatins = ctx.medications.some((m) =>
      statins.some((drug) => m.name.toLowerCase().includes(drug))
    );

    if (!onStatins) return null;

    const hasRecentLFT = ctx.labResults.some(
      (lab) =>
        (lab.testName.toLowerCase().includes('alt') ||
          lab.testName.toLowerCase().includes('ast') ||
          lab.testName.toLowerCase().includes('liver')) &&
        daysSince(lab.createdAt) <= 365
    );

    if (!hasRecentLFT) {
      return {
        triggered: true,
        priority: 'medium',
        title: template.titleTemplate,
        message: template.messageTemplate.replace('{{patientName}}', getPatientName(ctx)),
        messagePortuguese: template.messageTemplatePortuguese.replace('{{patientName}}', getPatientName(ctx)),
        confidence: template.defaultConfidence,
        evidence: template.evidence,
        actions: template.actions?.map((a) => ({
          label: a.label,
          type: a.type,
          actionType: a.actionType,
          metadata: { patientId: ctx.id, test: 'Liver Function Tests' },
        })),
      };
    }

    return null;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Diabetes Screening
  // ─────────────────────────────────────────────────────────────────────────
  evaluateDiabetesScreening: async (ctx, template) => {
    const age = ctx.age || calculateAge(ctx.dateOfBirth);
    const hasHypertension = ctx.diagnoses.some((d) => d.icd10Code.startsWith('I10'));
    const hasObesity = ctx.diagnoses.some((d) => d.icd10Code.startsWith('E66'));

    if (age < 35 || (!hasHypertension && !hasObesity)) return null;

    const hasRecentA1C = ctx.labResults.some(
      (lab) =>
        lab.testName.toLowerCase().includes('a1c') &&
        daysSince(lab.createdAt) <= 365
    );

    if (!hasRecentA1C) {
      const riskFactors = [];
      if (hasHypertension) riskFactors.push('hypertension');
      if (hasObesity) riskFactors.push('obesity');
      riskFactors.push(`age ${age}`);

      return {
        triggered: true,
        priority: 'medium',
        title: template.titleTemplate,
        message: template.messageTemplate
          .replace('{{patientName}}', getPatientName(ctx))
          .replace('{{riskFactors}}', riskFactors.join(', ')),
        messagePortuguese: template.messageTemplatePortuguese
          .replace('{{patientName}}', getPatientName(ctx))
          .replace('{{riskFactors}}', riskFactors.join(', ')),
        confidence: template.defaultConfidence,
        evidence: template.evidence,
        actions: template.actions?.map((a) => ({
          label: a.label,
          type: a.type,
          actionType: a.actionType,
          metadata: { patientId: ctx.id, test: 'HbA1c' },
        })),
      };
    }

    return null;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Wellness Visit Due
  // ─────────────────────────────────────────────────────────────────────────
  evaluateWellnessVisit: async (ctx, template) => {
    if (!ctx.lastVisit || daysSince(ctx.lastVisit) > 365) {
      return {
        triggered: true,
        priority: 'low',
        title: template.titleTemplate,
        message: template.messageTemplate
          .replace('{{patientName}}', getPatientName(ctx))
          .replace('{{lastVisit}}', ctx.lastVisit ? formatDate(ctx.lastVisit) : 'Never'),
        messagePortuguese: template.messageTemplatePortuguese
          .replace('{{patientName}}', getPatientName(ctx))
          .replace('{{lastVisit}}', ctx.lastVisit ? formatDate(ctx.lastVisit) : 'Nunca'),
        confidence: template.defaultConfidence,
        actions: template.actions?.map((a) => ({
          label: a.label,
          type: a.type,
          actionType: a.actionType,
          metadata: { patientId: ctx.id, type: 'wellness' },
        })),
      };
    }

    return null;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// RULE COMPILER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compiles a rule template into an executable rule.
 */
function compileRule(template: CDSSRuleTemplate): CompiledCDSSRule {
  const evaluator = EVALUATOR_FUNCTIONS[template.conditionLogic.value];

  if (!evaluator) {
    console.warn(`No evaluator found for rule ${template.id}, rule will be inactive`);
    return {
      ...template,
      evaluate: async () => null,
    };
  }

  return {
    ...template,
    evaluate: async (ctx: CDSSPatientContext) => evaluator(ctx, template),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// RULE LOADER
// ═══════════════════════════════════════════════════════════════════════════

export interface LoadedCDSSRules {
  clinical: CompiledCDSSRule[];
  all: CompiledCDSSRule[];
}

/**
 * Loads and compiles all rule templates.
 */
export function loadCDSSRules(): LoadedCDSSRules {
  const clinicalCompiled = CLINICAL_RULES.filter((r) => r.isActive).map(compileRule);

  return {
    clinical: clinicalCompiled,
    all: clinicalCompiled,
  };
}

/**
 * Gets rule templates (for admin UI).
 */
export function getCDSSRuleTemplates() {
  return {
    clinical: CLINICAL_RULES,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

let loadedRulesCache: LoadedCDSSRules | null = null;

export function getLoadedCDSSRules(): LoadedCDSSRules {
  if (!loadedRulesCache) {
    loadedRulesCache = loadCDSSRules();
  }
  return loadedRulesCache;
}

/**
 * Reloads rules (for hot-reloading in development).
 */
export function reloadCDSSRules(): LoadedCDSSRules {
  loadedRulesCache = loadCDSSRules();
  return loadedRulesCache;
}

// ═══════════════════════════════════════════════════════════════════════════
// INSIGHT CONVERTER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Converts rule evaluation result to AIInsight format.
 */
export function convertToAIInsight(
  result: CDSSEvaluationResult,
  template: CDSSRuleTemplate,
  ctx: CDSSPatientContext
): AIInsight {
  return {
    id: `${template.id}_${ctx.id}`,
    type: template.insightType,
    priority: result.priority || template.defaultPriority,
    title: result.title || template.titleTemplate,
    description: result.message || template.messageTemplate,
    confidence: result.confidence || template.defaultConfidence,
    category: template.category,
    patientId: ctx.id,
    patientName: getPatientName(ctx),
    evidence: result.evidence || template.evidence,
    actionable: template.actionable,
    actions: result.actions,
    metadata: result.metadata,
  };
}

export default {
  loadCDSSRules,
  getCDSSRuleTemplates,
  getLoadedCDSSRules,
  reloadCDSSRules,
  convertToAIInsight,
};
