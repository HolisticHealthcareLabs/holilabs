import type { ScreeningRule } from '../screening-triggers';
import type {
  DisciplineConfig,
  PatientDisciplineInput,
  DisciplineContextOutput,
  ScreeningRecommendation,
  RiskAssessment,
  InterventionRecommendation,
  MonitoringDueItem,
  ReferralRecommendation,
} from './types';
import jsonLogic from 'json-logic-js';

const URGENCY_ORDER: Record<string, number> = {
  EMERGENT: 0,
  URGENT: 1,
  ROUTINE: 2,
  PREVENTIVE: 3,
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function generateDisciplineContext(
  input: PatientDisciplineInput,
  config: DisciplineConfig,
  allScreeningRules: ScreeningRule[],
): DisciplineContextOutput {
  const applicableScreenings = filterAndRankScreenings(input, config, allScreeningRules);
  const riskAssessment = evaluateRiskWeights(input, config);
  const prioritizedInterventions = rankInterventions(input, config);
  const monitoringSchedule = calculateMonitoringDueDates(input, config);
  const referralRecommendations = evaluateReferralTriggers(input, config);

  return {
    discipline: config.discipline,
    patientId: input.patientId,
    applicableScreenings,
    riskAssessment,
    prioritizedInterventions,
    monitoringSchedule,
    referralRecommendations,
    metadata: {
      generatedAt: new Date(),
      jurisdiction: input.jurisdiction,
      configVersion: '1.0.0',
    },
  };
}

function filterAndRankScreenings(
  input: PatientDisciplineInput,
  config: DisciplineConfig,
  allScreeningRules: ScreeningRule[],
): ScreeningRecommendation[] {
  const now = new Date();
  const configuredRules = allScreeningRules.filter(
    (rule) => config.screeningRuleIds.includes(rule.name),
  );

  const results: ScreeningRecommendation[] = [];

  for (const rule of configuredRules) {
    if (input.age < rule.ageRange.min) continue;
    if (rule.ageRange.max !== undefined && input.age > rule.ageRange.max) continue;

    if (config.screeningFilters.ageRange) {
      const [minAge, maxAge] = config.screeningFilters.ageRange;
      if (input.age < minAge || input.age > maxAge) continue;
    }

    if (rule.genderRestriction) {
      const normalizedGender = input.biologicalSex.toLowerCase();
      if (normalizedGender !== rule.genderRestriction) continue;
    }

    if (
      config.screeningFilters.biologicalSex &&
      !config.screeningFilters.biologicalSex.includes(input.biologicalSex)
    ) {
      continue;
    }

    const ruleJurisdiction = rule.jurisdiction;
    if (ruleJurisdiction !== 'ALL' && ruleJurisdiction !== input.jurisdiction) continue;

    const frequencyMonths = (rule.frequency.years ?? 0) * 12 + (rule.frequency.months ?? 0);
    const frequencyMs = frequencyMonths * 30 * MS_PER_DAY;

    const lastScreeningDate = input.lastScreenings[rule.screeningType] ?? null;

    let dueDate: Date | null = null;
    let overdue = false;

    if (lastScreeningDate) {
      dueDate = new Date(lastScreeningDate.getTime() + frequencyMs);
      overdue = dueDate.getTime() < now.getTime();
    } else {
      dueDate = now;
      overdue = true;
    }

    results.push({
      ruleName: rule.name,
      screeningType: rule.screeningType,
      dueDate,
      overdue,
      priority: rule.priority,
      sourceAuthority: rule.sourceAuthority ?? rule.guidelineSource,
    });
  }

  return results;
}

function evaluateRiskWeights(
  input: PatientDisciplineInput,
  config: DisciplineConfig,
): RiskAssessment[] {
  const results: RiskAssessment[] = [];

  for (const [factor, entry] of Object.entries(config.riskWeights)) {
    const presentInRiskFactors = input.riskFactors.includes(factor);
    const presentInIcd10 = input.icd10Codes.some(
      (code) => code === factor || code.startsWith(factor + '.'),
    );

    results.push({
      factor,
      weight: entry.weight,
      present: presentInRiskFactors || presentInIcd10,
      sourceAuthority: entry.sourceAuthority,
      evidenceTier: entry.evidenceTier,
    });
  }

  return results;
}

function rankInterventions(
  input: PatientDisciplineInput,
  config: DisciplineConfig,
): InterventionRecommendation[] {
  const results: InterventionRecommendation[] = config.interventionPriority.map((intervention) => {
    const matchesIcd10 = input.icd10Codes.some(
      (code) => code === intervention.code || code.startsWith(intervention.code + '.'),
    );
    const matchesRiskFactor = input.riskFactors.includes(intervention.code);

    return {
      code: intervention.code,
      description: intervention.description,
      urgency: intervention.urgency,
      applicable: matchesIcd10 || matchesRiskFactor,
      sourceAuthority: intervention.sourceAuthority,
    };
  });

  results.sort((a, b) => {
    const orderA = URGENCY_ORDER[a.urgency] ?? 999;
    const orderB = URGENCY_ORDER[b.urgency] ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    if (a.applicable !== b.applicable) return a.applicable ? -1 : 1;
    return 0;
  });

  return results;
}

function calculateMonitoringDueDates(
  input: PatientDisciplineInput,
  config: DisciplineConfig,
): MonitoringDueItem[] {
  const now = new Date();
  const results: MonitoringDueItem[] = [];

  for (const monitor of config.monitoringSchedule) {
    if (monitor.conditionTrigger) {
      const hasCondition = input.icd10Codes.some(
        (code) =>
          code === monitor.conditionTrigger ||
          code.startsWith(monitor.conditionTrigger + '.'),
      );
      if (!hasCondition) continue;
    }

    const labResult = input.labResults[monitor.biomarkerCode];
    const intervalMs = monitor.intervalDays * MS_PER_DAY;

    let nextDueDate: Date;

    if (labResult) {
      nextDueDate = new Date(labResult.date.getTime() + intervalMs);
    } else {
      nextDueDate = now;
    }

    results.push({
      biomarkerCode: monitor.biomarkerCode,
      nextDueDate,
      overdue: nextDueDate.getTime() <= now.getTime(),
      intervalDays: monitor.intervalDays,
      sourceAuthority: monitor.sourceAuthority,
    });
  }

  return results;
}

// AWAITING_REVIEW: JSON-Logic evaluation for referral triggers needs clinical validation
// of the rule conditions before production use
function evaluateReferralTriggers(
  input: PatientDisciplineInput,
  config: DisciplineConfig,
): ReferralRecommendation[] {
  const patientData = {
    age: input.age,
    biologicalSex: input.biologicalSex,
    icd10Codes: input.icd10Codes,
    riskFactors: input.riskFactors,
    labResults: input.labResults,
    isPregnant: input.isPregnant ?? false,
  };

  const results: ReferralRecommendation[] = [];

  for (const trigger of config.referralTriggers) {
    let triggered = false;

    try {
      triggered = Boolean(jsonLogic.apply(trigger.condition, patientData));
    } catch {
      triggered = false;
    }

    results.push({
      urgency: trigger.urgency,
      description: trigger.description,
      triggered,
      sourceAuthority: trigger.sourceAuthority,
    });
  }

  return results;
}
