/**
 * Risk Calculator Service — Blue Ocean Phase 1
 *
 * Aggregates patient risk factors into a CompositeRiskScore (0-100)
 * consumed by the Enterprise API for insurer actuarial pricing.
 *
 * Input sources (all from existing Prisma Patient model):
 *   - cvdRiskScore (Framingham 0-100%)
 *   - diabetesRiskScore (FINDRISC 0-26)
 *   - Screening compliance (date checks)
 *   - Lifestyle factors (tobacco, alcohol, activity)
 *   - Override history (GovernanceEvent: did doctor ignore safety rules?)
 *
 * Output: CompositeRiskScore matching EnterpriseRiskAssessment.compositeRiskScore
 *
 * CONSTRAINT: Does NOT modify engine.ts. Reads engine output, not the engine itself.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface PatientRiskInput {
  // Clinical risk scores (from Patient model)
  cvdRiskScore: number | null;          // Framingham 0-100%
  diabetesRiskScore: number | null;     // FINDRISC 0-26

  // Screening compliance (dates — null = never screened)
  lastBloodPressureCheck: Date | null;
  lastCholesterolTest: Date | null;
  lastHbA1c: Date | null;
  lastPhysicalExam: Date | null;

  // Lifestyle factors
  tobaccoUse: boolean;
  tobaccoPackYears: number | null;
  alcoholUse: boolean;
  alcoholDrinksPerWeek: number | null;
  physicalActivityMinutesWeek: number | null;

  // BMI
  bmi: number | null;

  // Demographics
  ageYears: number;
}

export interface OverrideHistoryInput {
  /** Total governance events where doctor overrode a safety rule */
  totalOverrides: number;
  /** How many of those were HARD_BLOCK overrides (most dangerous) */
  hardBlockOverrides: number;
  /** Total rules evaluated (for compliance rate) */
  totalRulesEvaluated: number;
}

export type RiskTier = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface CompositeRiskResult {
  /** Overall risk score 0-100 (higher = riskier) */
  compositeScore: number;
  /** Tier classification */
  riskTier: RiskTier;
  /** Individual domain scores for transparency */
  domainBreakdown: {
    cardiovascular: number;       // 0-30 weight
    metabolic: number;            // 0-20 weight
    screeningCompliance: number;  // 0-15 weight
    lifestyle: number;            // 0-20 weight
    overrideRisk: number;         // 0-15 weight
  };
  /** Confidence level 0-1 (penalized by missing data) */
  confidence: number;
  /** Fields that were null/missing */
  missingFields: string[];
  /** Computed at */
  computedAt: string;
}

// =============================================================================
// CONSTANTS — Domain weights (sum to 100)
// =============================================================================

const WEIGHTS = {
  CARDIOVASCULAR: 30,
  METABOLIC: 20,
  SCREENING: 15,
  LIFESTYLE: 20,
  OVERRIDE: 15,
} as const;

/** Screening is "overdue" if more than this many days old */
const SCREENING_OVERDUE_DAYS = 365;

// =============================================================================
// DOMAIN SCORERS
// =============================================================================

/**
 * Cardiovascular domain: Framingham CVD risk (0-100%) → normalized to 0-30.
 * If missing, returns a moderate default with confidence penalty.
 */
function scoreCardiovascular(
  cvdRiskScore: number | null,
  ageYears: number,
): { score: number; missing: string[] } {
  const missing: string[] = [];

  if (cvdRiskScore === null || cvdRiskScore === undefined) {
    missing.push('cvdRiskScore');
    // Age-based fallback: older patients get moderate default
    const ageFactor = Math.min(ageYears / 100, 1);
    return { score: Math.round(ageFactor * WEIGHTS.CARDIOVASCULAR * 0.5), missing };
  }

  // Framingham is 0-100%. Map linearly to 0-30.
  const clamped = Math.max(0, Math.min(100, cvdRiskScore));
  return { score: Math.round((clamped / 100) * WEIGHTS.CARDIOVASCULAR), missing };
}

/**
 * Metabolic domain: FINDRISC diabetes risk (0-26) + BMI → normalized to 0-20.
 */
function scoreMetabolic(
  diabetesRiskScore: number | null,
  bmi: number | null,
): { score: number; missing: string[] } {
  const missing: string[] = [];
  let score = 0;

  // FINDRISC (0-26): contributes up to 12 points of the 20
  if (diabetesRiskScore === null) {
    missing.push('diabetesRiskScore');
    score += 6; // moderate default
  } else {
    const clamped = Math.max(0, Math.min(26, diabetesRiskScore));
    score += Math.round((clamped / 26) * 12);
  }

  // BMI: contributes up to 8 points of the 20
  if (bmi === null) {
    missing.push('bmi');
    score += 4; // moderate default
  } else {
    // Optimal BMI ~22. Risk increases as deviation grows.
    const deviation = Math.abs(bmi - 22);
    const bmiRisk = Math.min(deviation / 20, 1); // cap at deviation of 20
    score += Math.round(bmiRisk * 8);
  }

  return { score: Math.min(score, WEIGHTS.METABOLIC), missing };
}

/**
 * Screening compliance: How many screenings are up-to-date?
 * Overdue screenings increase risk. No screenings = max risk.
 */
function scoreScreeningCompliance(
  screenings: {
    lastBloodPressureCheck: Date | null;
    lastCholesterolTest: Date | null;
    lastHbA1c: Date | null;
    lastPhysicalExam: Date | null;
  },
  now: Date = new Date(),
): { score: number; missing: string[] } {
  const missing: string[] = [];
  const checks = [
    { field: 'lastBloodPressureCheck', date: screenings.lastBloodPressureCheck },
    { field: 'lastCholesterolTest', date: screenings.lastCholesterolTest },
    { field: 'lastHbA1c', date: screenings.lastHbA1c },
    { field: 'lastPhysicalExam', date: screenings.lastPhysicalExam },
  ];

  let overdueCount = 0;
  const overdueThreshold = SCREENING_OVERDUE_DAYS * 24 * 60 * 60 * 1000;

  for (const check of checks) {
    if (!check.date) {
      missing.push(check.field);
      overdueCount++;
    } else {
      const age = now.getTime() - new Date(check.date).getTime();
      if (age > overdueThreshold) {
        overdueCount++;
      }
    }
  }

  // 0 overdue = 0 risk, all 4 overdue = max risk (15)
  const score = Math.round((overdueCount / checks.length) * WEIGHTS.SCREENING);
  return { score, missing };
}

/**
 * Lifestyle domain: tobacco, alcohol, physical activity → 0-20.
 */
function scoreLifestyle(input: {
  tobaccoUse: boolean;
  tobaccoPackYears: number | null;
  alcoholUse: boolean;
  alcoholDrinksPerWeek: number | null;
  physicalActivityMinutesWeek: number | null;
}): { score: number; missing: string[] } {
  const missing: string[] = [];
  let score = 0;

  // Tobacco: up to 8 points
  if (input.tobaccoUse) {
    const packYears = input.tobaccoPackYears ?? 10; // default moderate if unknown
    if (input.tobaccoPackYears === null) missing.push('tobaccoPackYears');
    // Scale: 0 pack-years = 2 (still a smoker), 30+ = 8
    score += Math.min(2 + Math.round((Math.min(packYears, 30) / 30) * 6), 8);
  }

  // Alcohol: up to 6 points
  if (input.alcoholUse) {
    const drinks = input.alcoholDrinksPerWeek ?? 7; // default moderate
    if (input.alcoholDrinksPerWeek === null) missing.push('alcoholDrinksPerWeek');
    // >14 drinks/week = heavy → max 6 points
    score += Math.min(Math.round((Math.min(drinks, 21) / 21) * 6), 6);
  }

  // Physical inactivity: up to 6 points
  if (input.physicalActivityMinutesWeek === null) {
    missing.push('physicalActivityMinutesWeek');
    score += 3; // moderate default
  } else {
    // WHO recommends 150 min/week. 0 min = max risk.
    const activityRatio = Math.min(input.physicalActivityMinutesWeek / 150, 1);
    score += Math.round((1 - activityRatio) * 6);
  }

  return { score: Math.min(score, WEIGHTS.LIFESTYLE), missing };
}

/**
 * Override risk: Doctor overrides of safety rules indicate non-standard risk.
 *
 * This is actuarial gold — patients whose doctors override BLOCK rules
 * are statistically more likely to have adverse outcomes.
 */
function scoreOverrideRisk(history: OverrideHistoryInput): { score: number; missing: string[] } {
  if (history.totalRulesEvaluated === 0) {
    return { score: 0, missing: [] };
  }

  // Override rate: overrides / total evaluations
  const overrideRate = history.totalOverrides / history.totalRulesEvaluated;

  // HARD_BLOCK overrides are weighted 3x (much more dangerous)
  const hardBlockWeight = history.hardBlockOverrides * 3;
  const softOverrides = history.totalOverrides - history.hardBlockOverrides;
  const weightedOverrides = hardBlockWeight + softOverrides;

  // Normalize: assume > 10 weighted overrides = max risk
  const normalizedRisk = Math.min(weightedOverrides / 10, 1);

  // Also factor in the override *rate* (high rate = systemic issue)
  const rateFactor = Math.min(overrideRate * 2, 1); // 50%+ override rate = max

  // Blend: 60% absolute count, 40% rate
  const blendedScore = normalizedRisk * 0.6 + rateFactor * 0.4;

  return {
    score: Math.round(blendedScore * WEIGHTS.OVERRIDE),
    missing: [],
  };
}

// =============================================================================
// TIER CLASSIFICATION
// =============================================================================

function classifyTier(score: number): RiskTier {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MODERATE';
  return 'LOW';
}

// =============================================================================
// MAIN CALCULATOR
// =============================================================================

/**
 * Compute composite risk score from patient data + override history.
 *
 * The engine stays untouched — this is a new layer ON TOP of engine output.
 */
export function calculateCompositeRisk(
  patient: PatientRiskInput,
  overrides: OverrideHistoryInput,
): CompositeRiskResult {
  const allMissing: string[] = [];

  // Score each domain
  const cvd = scoreCardiovascular(patient.cvdRiskScore, patient.ageYears);
  allMissing.push(...cvd.missing);

  const metabolic = scoreMetabolic(patient.diabetesRiskScore, patient.bmi);
  allMissing.push(...metabolic.missing);

  const screening = scoreScreeningCompliance({
    lastBloodPressureCheck: patient.lastBloodPressureCheck,
    lastCholesterolTest: patient.lastCholesterolTest,
    lastHbA1c: patient.lastHbA1c,
    lastPhysicalExam: patient.lastPhysicalExam,
  });
  allMissing.push(...screening.missing);

  const lifestyle = scoreLifestyle({
    tobaccoUse: patient.tobaccoUse,
    tobaccoPackYears: patient.tobaccoPackYears,
    alcoholUse: patient.alcoholUse,
    alcoholDrinksPerWeek: patient.alcoholDrinksPerWeek,
    physicalActivityMinutesWeek: patient.physicalActivityMinutesWeek,
  });
  allMissing.push(...lifestyle.missing);

  const override = scoreOverrideRisk(overrides);
  allMissing.push(...override.missing);

  // Sum
  const compositeScore = Math.min(
    cvd.score + metabolic.score + screening.score + lifestyle.score + override.score,
    100,
  );

  // Confidence: 1.0 = all data present, penalize 0.08 per missing field
  const confidence = Math.max(0, Math.min(1, 1 - allMissing.length * 0.08));

  return {
    compositeScore,
    riskTier: classifyTier(compositeScore),
    domainBreakdown: {
      cardiovascular: cvd.score,
      metabolic: metabolic.score,
      screeningCompliance: screening.score,
      lifestyle: lifestyle.score,
      overrideRisk: override.score,
    },
    confidence: Math.round(confidence * 100) / 100,
    missingFields: allMissing,
    computedAt: new Date().toISOString(),
  };
}
