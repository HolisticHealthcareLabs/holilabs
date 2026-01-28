/**
 * Traffic Light Rule Loader (Prompt-Native)
 *
 * Loads rule templates and compiles them into evaluators.
 * Supports both:
 * - Deterministic evaluation (function-based, for embedded data)
 * - LLM-based evaluation (for complex rules without deterministic logic)
 *
 * PROMPT-NATIVE ARCHITECTURE:
 * Rules are defined in templates, loaded and compiled at runtime.
 * This enables rule updates without code deployments.
 */

import {
  RuleTemplate,
  RuleEvaluationContext,
  RuleEvaluationResult,
  CompiledRule,
  TrafficLightColor,
} from './types';

import { CLINICAL_RULES, DRUG_INTERACTIONS, ALLERGY_GROUPS, CROSS_REACTIVITY } from './clinical-rules';
import { BILLING_RULES, TISS_CODES, GLOSA_CODES } from './billing-rules';
import { ADMINISTRATIVE_RULES, DOCUMENTATION_REQUIREMENTS, CONSENT_REQUIREMENTS } from './administrative-rules';

// ═══════════════════════════════════════════════════════════════════════════
// RULE EVALUATOR FUNCTIONS (Deterministic)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Evaluator function registry.
 * Maps function names to implementations.
 */
const EVALUATOR_FUNCTIONS: Record<
  string,
  (ctx: RuleEvaluationContext, template: RuleTemplate) => Promise<RuleEvaluationResult | null>
> = {
  // ─────────────────────────────────────────────────────────────────────────
  // CLINICAL EVALUATORS
  // ─────────────────────────────────────────────────────────────────────────

  evaluateDirectAllergyMatch: async (ctx, template) => {
    const medication = ctx.payload.medication as { name?: string } | undefined;
    if (!medication?.name) return null;

    const medName = medication.name.toLowerCase();
    const allergies = ctx.patientData.allergies || [];

    for (const allergy of allergies) {
      const allergen = allergy.allergen.toLowerCase();
      if (medName.includes(allergen) || allergen.includes(medName)) {
        return {
          triggered: true,
          color: template.defaultColor,
          message: template.messageTemplate
            .replace('{{medication}}', medication.name)
            .replace('{{reaction}}', allergy.reaction || 'documented'),
          messagePortuguese: template.messageTemplatePortuguese
            .replace('{{medication}}', medication.name)
            .replace('{{reaction}}', allergy.reaction || 'documentada'),
          evidence: [`Documented allergy: ${allergy.allergen}`, `Severity: ${allergy.severity}`],
          suggestedCorrection: template.suggestedCorrectionTemplate?.replace('{{alternatives}}', 'consult formulary'),
        };
      }
    }
    return null;
  },

  evaluateCrossReactivity: async (ctx, template) => {
    const medication = ctx.payload.medication as { name?: string } | undefined;
    if (!medication?.name) return null;

    const medName = medication.name.toLowerCase();
    const allergies = ctx.patientData.allergies || [];

    // Find which drug group the medication belongs to
    let medGroup: string | null = null;
    for (const [group, drugs] of Object.entries(ALLERGY_GROUPS)) {
      if (drugs.some(d => medName.includes(d) || d.includes(medName))) {
        medGroup = group;
        break;
      }
    }

    if (!medGroup) return null;

    // Check if any allergy has cross-reactivity with this group
    for (const allergy of allergies) {
      const allergen = allergy.allergen.toLowerCase();

      for (const [group, drugs] of Object.entries(ALLERGY_GROUPS)) {
        if (drugs.some(d => allergen.includes(d) || d.includes(allergen))) {
          // Check cross-reactivity
          const crossReact = CROSS_REACTIVITY[group as keyof typeof CROSS_REACTIVITY];
          if (crossReact && crossReact[medGroup as keyof typeof crossReact]) {
            const risk = crossReact[medGroup as keyof typeof crossReact] * 100;
            return {
              triggered: true,
              color: template.defaultColor,
              message: template.messageTemplate
                .replace('{{medication}}', medication.name)
                .replace('{{risk}}', risk.toString())
                .replace('{{allergen}}', allergy.allergen)
                .replace('{{group}}', group),
              messagePortuguese: template.messageTemplatePortuguese
                .replace('{{medication}}', medication.name)
                .replace('{{risk}}', risk.toString())
                .replace('{{allergen}}', allergy.allergen)
                .replace('{{group}}', group),
              evidence: [
                `Allergen group: ${group}`,
                `Medication group: ${medGroup}`,
                `Cross-reactivity risk: ${risk}%`,
              ],
            };
          }
        }
      }
    }
    return null;
  },

  evaluateDrugInteraction: async (ctx, template) => {
    const medication = ctx.payload.medication as { name?: string } | undefined;
    if (!medication?.name) return null;

    const newDrug = medication.name.toLowerCase();
    const currentMeds = ctx.patientData.medications || [];

    // Determine severity level from template
    const severityLevels: Record<string, typeof DRUG_INTERACTIONS.lethal> = {
      INTERACTION_LETHAL: DRUG_INTERACTIONS.lethal,
      INTERACTION_SEVERE: DRUG_INTERACTIONS.severe,
      INTERACTION_MODERATE: DRUG_INTERACTIONS.moderate,
    };

    const interactions = severityLevels[template.id] || [];

    for (const interaction of interactions) {
      const [drug1, drug2] = interaction.drugs.map(d => d.toLowerCase());

      for (const currentMed of currentMeds) {
        const currentDrug = currentMed.name.toLowerCase();

        if (
          (newDrug.includes(drug1) && currentDrug.includes(drug2)) ||
          (newDrug.includes(drug2) && currentDrug.includes(drug1))
        ) {
          return {
            triggered: true,
            color: template.defaultColor,
            message: template.messageTemplate
              .replace('{{newDrug}}', medication.name)
              .replace('{{currentDrug}}', currentMed.name)
              .replace('{{risk}}', interaction.risk),
            messagePortuguese: template.messageTemplatePortuguese
              .replace('{{newDrug}}', medication.name)
              .replace('{{currentDrug}}', currentMed.name)
              .replace('{{risk}}', interaction.risk),
            evidence: [
              `New medication: ${medication.name}`,
              `Current medication: ${currentMed.name}`,
              `Risk: ${interaction.risk}`,
            ],
            suggestedCorrection: template.suggestedCorrectionTemplate
              ?.replace('{{currentDrug}}', currentMed.name)
              .replace('{{newDrug}}', medication.name),
          };
        }
      }
    }
    return null;
  },

  evaluateRenalContraindication: async (ctx, template) => {
    const medication = ctx.payload.medication as { name?: string } | undefined;
    const renalFunction = ctx.patientData.renalFunction;

    if (!medication?.name || !renalFunction) return null;

    // Nephrotoxic medications requiring dose adjustment when eGFR < 60
    const nephrotoxicMeds = ['metformin', 'vancomycin', 'gentamicin', 'nsaid', 'lithium', 'digoxin'];
    const medName = medication.name.toLowerCase();

    if (renalFunction.eGFR < 60 && nephrotoxicMeds.some(m => medName.includes(m))) {
      const adjustment = renalFunction.eGFR < 30 ? 'Contraindicated or significant dose reduction' : 'Dose reduction recommended';

      return {
        triggered: true,
        color: template.defaultColor,
        message: template.messageTemplate
          .replace('{{medication}}', medication.name)
          .replace('{{eGFR}}', renalFunction.eGFR.toString())
          .replace('{{adjustment}}', adjustment),
        messagePortuguese: template.messageTemplatePortuguese
          .replace('{{medication}}', medication.name)
          .replace('{{eGFR}}', renalFunction.eGFR.toString())
          .replace('{{adjustment}}', adjustment),
        evidence: [`eGFR: ${renalFunction.eGFR} mL/min`, `Creatinine: ${renalFunction.creatinine}`],
        suggestedCorrection: template.suggestedCorrectionTemplate
          ?.replace('{{eGFR}}', renalFunction.eGFR.toString())
          .replace('{{adjustment}}', adjustment),
      };
    }
    return null;
  },

  evaluateAgeContraindication: async (ctx, template) => {
    const medication = ctx.payload.medication as { name?: string } | undefined;
    const age = ctx.patientData.age;

    if (!medication?.name || age === undefined) return null;

    // Pediatric contraindications
    const pediatricContraindications = [
      { drug: 'tetracycline', maxAge: 8, reason: 'Tooth discoloration' },
      { drug: 'fluoroquinolone', maxAge: 18, reason: 'Cartilage damage' },
      { drug: 'aspirin', maxAge: 18, reason: "Reye's syndrome risk" },
    ];

    const medName = medication.name.toLowerCase();

    for (const contra of pediatricContraindications) {
      if (medName.includes(contra.drug) && age < contra.maxAge) {
        return {
          triggered: true,
          color: template.defaultColor,
          message: template.messageTemplate
            .replace('{{medication}}', medication.name)
            .replace('{{age}}', age.toString())
            .replace('{{reason}}', contra.reason),
          messagePortuguese: template.messageTemplatePortuguese
            .replace('{{medication}}', medication.name)
            .replace('{{age}}', age.toString())
            .replace('{{reason}}', contra.reason),
          evidence: [`Patient age: ${age}`, `Contraindication age: <${contra.maxAge}`, `Reason: ${contra.reason}`],
        };
      }
    }
    return null;
  },

  evaluatePregnancyContraindication: async (ctx, template) => {
    const medication = ctx.payload.medication as { name?: string } | undefined;
    const isPregnant = ctx.patientData.isPregnant;

    if (!medication?.name || !isPregnant) return null;

    // Category X medications
    const categoryX = ['isotretinoin', 'thalidomide', 'warfarin', 'methotrexate', 'finasteride', 'statin'];
    const medName = medication.name.toLowerCase();

    if (categoryX.some(m => medName.includes(m))) {
      return {
        triggered: true,
        color: template.defaultColor,
        message: template.messageTemplate.replace('{{medication}}', medication.name),
        messagePortuguese: template.messageTemplatePortuguese.replace('{{medication}}', medication.name),
        evidence: [`Category X medication`, `Patient is pregnant`],
        suggestedCorrection: template.suggestedCorrectionTemplate,
      };
    }
    return null;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // BILLING EVALUATORS
  // ─────────────────────────────────────────────────────────────────────────

  evaluateTissCodeValidity: async (ctx, template) => {
    const tissCode = ctx.billingData?.tissCode || (ctx.payload.tissCode as string);
    if (!tissCode) return null;

    const codeInfo = TISS_CODES[tissCode as keyof typeof TISS_CODES];
    if (!codeInfo) {
      return {
        triggered: true,
        color: template.defaultColor,
        message: template.messageTemplate.replace('{{tissCode}}', tissCode),
        messagePortuguese: template.messageTemplatePortuguese.replace('{{tissCode}}', tissCode),
        evidence: [`TISS code ${tissCode} not in valid code database`],
        glosaRisk: {
          probability: 1.0,
          estimatedAmount: (ctx.billingData?.billedAmount || 0),
          denialCode: 'G001',
        },
        suggestedCorrection: template.suggestedCorrectionTemplate,
      };
    }
    return null;
  },

  evaluateAuthorizationRequired: async (ctx, template) => {
    const tissCode = ctx.billingData?.tissCode || (ctx.payload.tissCode as string);
    const authStatus = ctx.billingData?.priorAuthStatus;

    if (!tissCode) return null;

    const codeInfo = TISS_CODES[tissCode as keyof typeof TISS_CODES];
    if (!codeInfo?.authRequired) return null;

    if (authStatus !== 'approved') {
      return {
        triggered: true,
        color: template.defaultColor,
        message: template.messageTemplate
          .replace('{{tissCode}}', tissCode)
          .replace('{{procedureName}}', codeInfo.name)
          .replace('{{authStatus}}', authStatus || 'not_requested'),
        messagePortuguese: template.messageTemplatePortuguese
          .replace('{{tissCode}}', tissCode)
          .replace('{{procedureName}}', codeInfo.name)
          .replace('{{authStatus}}', authStatus || 'não_solicitada'),
        evidence: [`TISS code ${tissCode} requires authorization`, `Current status: ${authStatus || 'none'}`],
        glosaRisk: {
          probability: template.glosaRiskWeight || 0.78,
          estimatedAmount: (ctx.billingData?.billedAmount || 0) * (template.glosaRiskWeight || 0.78),
          denialCode: 'G002',
        },
        suggestedCorrection: template.suggestedCorrectionTemplate,
      };
    }
    return null;
  },

  evaluateCidProcedureCompatibility: async (ctx, template) => {
    const tissCode = ctx.billingData?.tissCode || (ctx.payload.tissCode as string);
    if (!tissCode) return null;

    const codeInfo = TISS_CODES[tissCode as keyof typeof TISS_CODES];
    if (!codeInfo) return null;

    const diagnoses = ctx.patientData.diagnoses || [];
    if (diagnoses.length === 0) return null;

    // Simple category matching (can be extended)
    const procedureCategory = codeInfo.category;
    const cidPrefix = diagnoses[0]?.icd10Code?.charAt(0);

    // Basic compatibility check
    if (procedureCategory === 'opme' && !['M', 'S', 'I'].includes(cidPrefix || '')) {
      return {
        triggered: true,
        color: template.defaultColor,
        message: template.messageTemplate
          .replace('{{tissCode}}', tissCode)
          .replace('{{procedureCategory}}', procedureCategory)
          .replace('{{cidCode}}', diagnoses[0]?.icd10Code || 'unknown')
          .replace('{{cidCategory}}', cidPrefix || 'unknown'),
        messagePortuguese: template.messageTemplatePortuguese
          .replace('{{tissCode}}', tissCode)
          .replace('{{procedureCategory}}', procedureCategory)
          .replace('{{cidCode}}', diagnoses[0]?.icd10Code || 'desconhecido')
          .replace('{{cidCategory}}', cidPrefix || 'desconhecida'),
        evidence: [`Procedure: ${tissCode} (${procedureCategory})`, `CID-10: ${diagnoses[0]?.icd10Code}`],
        glosaRisk: {
          probability: template.glosaRiskWeight || 0.65,
          estimatedAmount: (ctx.billingData?.billedAmount || 0) * (template.glosaRiskWeight || 0.65),
          denialCode: 'G003',
        },
        suggestedCorrection: template.suggestedCorrectionTemplate,
      };
    }
    return null;
  },

  evaluateOpmeAuthorization: async (ctx, template) => {
    const opmeItems = ctx.billingData?.opmeItems || (ctx.payload.opmeItems as string[]);
    const opmeAuthApproved = ctx.billingData?.opmeAuthApproved;

    if (!opmeItems || opmeItems.length === 0) return null;

    if (!opmeAuthApproved) {
      const estimatedAmount = opmeItems.length * 5000; // Rough estimate per OPME item
      return {
        triggered: true,
        color: template.defaultColor,
        message: template.messageTemplate
          .replace('{{opmeCount}}', opmeItems.length.toString())
          .replace('{{glosaAmount}}', estimatedAmount.toLocaleString('pt-BR')),
        messagePortuguese: template.messageTemplatePortuguese
          .replace('{{opmeCount}}', opmeItems.length.toString())
          .replace('{{glosaAmount}}', estimatedAmount.toLocaleString('pt-BR')),
        evidence: [`OPME items: ${opmeItems.join(', ')}`, `Authorization: ${opmeAuthApproved ? 'approved' : 'not approved'}`],
        glosaRisk: {
          probability: template.glosaRiskWeight || 0.85,
          estimatedAmount,
          denialCode: 'G008',
        },
        suggestedCorrection: template.suggestedCorrectionTemplate,
      };
    }
    return null;
  },

  evaluateHistoricalGlosaRisk: async (ctx, template) => {
    const tissCode = ctx.billingData?.tissCode || (ctx.payload.tissCode as string);
    if (!tissCode) return null;

    const codeInfo = TISS_CODES[tissCode as keyof typeof TISS_CODES];
    if (!codeInfo || codeInfo.avgGlosaRate <= 0.20) return null;

    const glosaRate = Math.round(codeInfo.avgGlosaRate * 100);
    return {
      triggered: true,
      color: template.defaultColor,
      message: template.messageTemplate
        .replace('{{tissCode}}', tissCode)
        .replace('{{procedureName}}', codeInfo.name)
        .replace('{{glosaRate}}', glosaRate.toString()),
      messagePortuguese: template.messageTemplatePortuguese
        .replace('{{tissCode}}', tissCode)
        .replace('{{procedureName}}', codeInfo.name)
        .replace('{{glosaRate}}', glosaRate.toString()),
      evidence: [`Historical glosa rate: ${glosaRate}%`, `Procedure: ${codeInfo.name}`],
      glosaRisk: {
        probability: codeInfo.avgGlosaRate,
        estimatedAmount: (ctx.billingData?.billedAmount || 0) * codeInfo.avgGlosaRate,
      },
      suggestedCorrection: template.suggestedCorrectionTemplate,
    };
  },

  evaluateBillingAmountOutlier: async (ctx, template) => {
    const tissCode = ctx.billingData?.tissCode || (ctx.payload.tissCode as string);
    const billedAmount = ctx.billingData?.billedAmount || (ctx.payload.billedAmount as number);

    if (!tissCode || !billedAmount) return null;

    // Rough expected amounts by category (simplified)
    const expectedAmounts: Record<string, number> = {
      consultation: 200,
      lab: 50,
      imaging: 500,
      procedure: 2000,
      opme: 10000,
    };

    const codeInfo = TISS_CODES[tissCode as keyof typeof TISS_CODES];
    if (!codeInfo) return null;

    const expected = expectedAmounts[codeInfo.category] || 500;
    const deviation = billedAmount / expected;

    if (deviation > 2) {
      return {
        triggered: true,
        color: template.defaultColor,
        message: template.messageTemplate
          .replace('{{billedAmount}}', billedAmount.toLocaleString('pt-BR'))
          .replace('{{tissCode}}', tissCode)
          .replace('{{expectedAmount}}', expected.toLocaleString('pt-BR'))
          .replace('{{deviation}}', deviation.toFixed(1)),
        messagePortuguese: template.messageTemplatePortuguese
          .replace('{{billedAmount}}', billedAmount.toLocaleString('pt-BR'))
          .replace('{{tissCode}}', tissCode)
          .replace('{{expectedAmount}}', expected.toLocaleString('pt-BR'))
          .replace('{{deviation}}', deviation.toFixed(1)),
        evidence: [`Billed: R$ ${billedAmount}`, `Expected: R$ ${expected}`, `Deviation: ${deviation.toFixed(1)}x`],
        glosaRisk: {
          probability: Math.min(0.5, deviation * 0.15),
          estimatedAmount: billedAmount * Math.min(0.5, deviation * 0.15),
          denialCode: 'G005',
        },
        suggestedCorrection: template.suggestedCorrectionTemplate,
      };
    }
    return null;
  },

  evaluateAuthorizationExpiry: async (ctx, template) => {
    const priorAuthExpiry = ctx.billingData?.priorAuthExpiry || (ctx.payload.priorAuthExpiry as string);
    const tissCode = ctx.billingData?.tissCode || (ctx.payload.tissCode as string);

    if (!priorAuthExpiry) return null;

    const expiryDate = new Date(priorAuthExpiry);
    const now = new Date();
    const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 1) {
      return {
        triggered: true,
        color: template.defaultColor,
        message: template.messageTemplate
          .replace('{{tissCode}}', tissCode || 'N/A')
          .replace('{{expiryDate}}', expiryDate.toLocaleDateString('pt-BR'))
          .replace('{{daysRemaining}}', daysRemaining.toString()),
        messagePortuguese: template.messageTemplatePortuguese
          .replace('{{tissCode}}', tissCode || 'N/A')
          .replace('{{expiryDate}}', expiryDate.toLocaleDateString('pt-BR'))
          .replace('{{daysRemaining}}', daysRemaining.toString()),
        evidence: [`Expiry: ${expiryDate.toISOString()}`, `Days remaining: ${daysRemaining}`],
        glosaRisk: {
          probability: daysRemaining <= 0 ? 0.85 : 0.30,
          estimatedAmount: (ctx.billingData?.billedAmount || 0) * (daysRemaining <= 0 ? 0.85 : 0.30),
          denialCode: 'G007',
        },
        suggestedCorrection: template.suggestedCorrectionTemplate,
      };
    }
    return null;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ADMINISTRATIVE EVALUATORS
  // ─────────────────────────────────────────────────────────────────────────

  evaluateDocumentationCompleteness: async (ctx, template) => {
    const providedDocs = ctx.documentationData?.providedDocuments || (ctx.payload.providedDocuments as string[]) || [];
    const action = ctx.action;

    const required = DOCUMENTATION_REQUIREMENTS[action as keyof typeof DOCUMENTATION_REQUIREMENTS] || [];
    if (required.length === 0) return null;

    const missing = required.filter(doc => !providedDocs.includes(doc));
    if (missing.length === 0) return null;

    return {
      triggered: true,
      color: template.defaultColor,
      message: template.messageTemplate
        .replace('{{missingDocs}}', missing.join(', '))
        .replace('{{procedureType}}', action)
        .replace('{{missingCount}}', missing.length.toString())
        .replace('{{totalRequired}}', required.length.toString()),
      messagePortuguese: template.messageTemplatePortuguese
        .replace('{{missingDocs}}', missing.join(', '))
        .replace('{{procedureType}}', action)
        .replace('{{missingCount}}', missing.length.toString())
        .replace('{{totalRequired}}', required.length.toString()),
      evidence: [`Required: ${required.join(', ')}`, `Provided: ${providedDocs.join(', ')}`, `Missing: ${missing.join(', ')}`],
      glosaRisk: {
        probability: template.glosaRiskWeight || 0.45,
        estimatedAmount: (ctx.billingData?.billedAmount || 0) * (template.glosaRiskWeight || 0.45),
        denialCode: 'G004',
      },
      suggestedCorrection: template.suggestedCorrectionTemplate?.replace('{{missingDocs}}', missing.join(', ')),
    };
  },

  evaluateInformedConsent: async (ctx, template) => {
    const isInvasive = ctx.payload.isInvasive as boolean;
    const consentSigned = ctx.documentationData?.informedConsentSigned;

    if (!isInvasive) return null;
    if (consentSigned) return null;

    return {
      triggered: true,
      color: template.defaultColor,
      message: template.messageTemplate.replace('{{procedureType}}', ctx.action),
      messagePortuguese: template.messageTemplatePortuguese.replace('{{procedureType}}', ctx.action),
      evidence: [`Invasive procedure: ${ctx.action}`, `Informed consent: not signed`],
      suggestedCorrection: template.suggestedCorrectionTemplate,
    };
  },

  evaluateLgpdConsent: async (ctx, template) => {
    const dataSharing = ctx.payload.dataSharing as boolean;
    const lgpdConsentSigned = ctx.documentationData?.lgpdConsentSigned;

    if (!dataSharing) return null;
    if (lgpdConsentSigned) return null;

    return {
      triggered: true,
      color: template.defaultColor,
      message: template.messageTemplate.replace('{{dataPurpose}}', 'healthcare data processing'),
      messagePortuguese: template.messageTemplatePortuguese.replace('{{dataPurpose}}', 'processamento de dados de saúde'),
      evidence: [`Data sharing required`, `LGPD consent: not signed`],
      suggestedCorrection: template.suggestedCorrectionTemplate,
    };
  },

  evaluatePatientIdVerification: async (ctx, template) => {
    const verified = ctx.documentationData?.patientIdentificationVerified;

    if (verified) return null;

    return {
      triggered: true,
      color: template.defaultColor,
      message: template.messageTemplate,
      messagePortuguese: template.messageTemplatePortuguese,
      evidence: [`Patient identification verification: not documented`],
      suggestedCorrection: template.suggestedCorrectionTemplate,
    };
  },

  evaluateTeamCompleteness: async (ctx, template) => {
    const isInvasive = ctx.payload.isInvasive as boolean;
    const team = ctx.documentationData?.surgicalTeam;

    if (!isInvasive) return null;

    const missing: string[] = [];
    if (!team?.surgeon) missing.push('surgeon');
    if (!team?.anesthesiologist) missing.push('anesthesiologist');

    if (missing.length === 0) return null;

    return {
      triggered: true,
      color: template.defaultColor,
      message: template.messageTemplate
        .replace('{{missingRoles}}', missing.join(', '))
        .replace('{{procedureType}}', ctx.action),
      messagePortuguese: template.messageTemplatePortuguese
        .replace('{{missingRoles}}', missing.join(', '))
        .replace('{{procedureType}}', ctx.action),
      evidence: [`Missing team members: ${missing.join(', ')}`],
      suggestedCorrection: template.suggestedCorrectionTemplate?.replace('{{missingRoles}}', missing.join(', ')),
    };
  },

  evaluatePreopEvaluation: async (ctx, template) => {
    const isInvasive = ctx.payload.isInvasive as boolean;
    const preopDate = ctx.documentationData?.preopEvaluationDate;

    if (!isInvasive) return null;

    if (!preopDate) {
      return {
        triggered: true,
        color: template.defaultColor,
        message: template.messageTemplate.replace('{{daysSince}}', 'N/A'),
        messagePortuguese: template.messageTemplatePortuguese.replace('{{daysSince}}', 'N/A'),
        evidence: [`No preoperative evaluation documented`],
        suggestedCorrection: template.suggestedCorrectionTemplate,
      };
    }

    const evalDate = new Date(preopDate);
    const daysSince = Math.floor((Date.now() - evalDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSince > 30) {
      return {
        triggered: true,
        color: template.defaultColor,
        message: template.messageTemplate.replace('{{daysSince}}', daysSince.toString()),
        messagePortuguese: template.messageTemplatePortuguese.replace('{{daysSince}}', daysSince.toString()),
        evidence: [`Preop evaluation: ${preopDate}`, `Days since: ${daysSince}`],
        suggestedCorrection: template.suggestedCorrectionTemplate,
      };
    }
    return null;
  },

  evaluateSurgicalChecklist: async (ctx, template) => {
    const isInvasive = ctx.payload.isInvasive as boolean;
    const documents = ctx.documentationData?.providedDocuments || [];

    if (!isInvasive) return null;
    if (documents.includes('surgical_checklist')) return null;

    return {
      triggered: true,
      color: template.defaultColor,
      message: template.messageTemplate,
      messagePortuguese: template.messageTemplatePortuguese,
      evidence: [`WHO Surgical Safety Checklist not documented`],
      suggestedCorrection: template.suggestedCorrectionTemplate,
    };
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// RULE COMPILER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compiles a rule template into an executable rule.
 */
function compileRule(template: RuleTemplate): CompiledRule {
  const evaluator = template.conditionLogic?.type === 'function-name'
    ? EVALUATOR_FUNCTIONS[template.conditionLogic.value as string]
    : null;

  if (!evaluator) {
    // Fallback: create a passthrough evaluator (rule never triggers)
    console.warn(`No evaluator found for rule ${template.id}, rule will be inactive`);
    return {
      ...template,
      evaluate: async () => null,
    };
  }

  return {
    ...template,
    evaluate: async (ctx: RuleEvaluationContext) => {
      // Check applicability
      if (!template.applicableActions.includes(ctx.action)) {
        return null;
      }

      // Check required payload fields
      if (template.requiredPayloadFields) {
        for (const field of template.requiredPayloadFields) {
          if (ctx.payload[field] === undefined) {
            return null;
          }
        }
      }

      // Execute evaluator
      return evaluator(ctx, template);
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// RULE LOADER
// ═══════════════════════════════════════════════════════════════════════════

export interface LoadedRules {
  clinical: CompiledRule[];
  billing: CompiledRule[];
  administrative: CompiledRule[];
  all: CompiledRule[];
}

/**
 * Loads and compiles all rule templates.
 */
export function loadRules(): LoadedRules {
  const clinicalCompiled = CLINICAL_RULES.filter(r => r.isActive).map(compileRule);
  const billingCompiled = BILLING_RULES.filter(r => r.isActive).map(compileRule);
  const administrativeCompiled = ADMINISTRATIVE_RULES.filter(r => r.isActive).map(compileRule);

  return {
    clinical: clinicalCompiled,
    billing: billingCompiled,
    administrative: administrativeCompiled,
    all: [...clinicalCompiled, ...billingCompiled, ...administrativeCompiled],
  };
}

/**
 * Gets rule templates (for admin UI).
 */
export function getRuleTemplates() {
  return {
    clinical: CLINICAL_RULES,
    billing: BILLING_RULES,
    administrative: ADMINISTRATIVE_RULES,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

let loadedRulesCache: LoadedRules | null = null;

export function getLoadedRules(): LoadedRules {
  if (!loadedRulesCache) {
    loadedRulesCache = loadRules();
  }
  return loadedRulesCache;
}

/**
 * Reloads rules (for hot-reloading in development).
 */
export function reloadRules(): LoadedRules {
  loadedRulesCache = loadRules();
  return loadedRulesCache;
}

export default {
  loadRules,
  getRuleTemplates,
  getLoadedRules,
  reloadRules,
};
