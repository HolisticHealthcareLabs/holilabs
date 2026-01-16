import { RiskScoreType } from '@prisma/client';

export type SeedClinicalFacts = Readonly<{
  ageYears: number;
  sexAtBirth?: 'M' | 'F' | 'U';
  hasHypertension: boolean;
  hasType2Diabetes: boolean;
  tobaccoUse: boolean;
  bmi?: number;
  systolicBP?: number;
  diastolicBP?: number;
}>;

export type SeedRiskScore = Readonly<{
  riskType: RiskScoreType;
  algorithmVersion: string;
  score: number;
  scorePercentage: string;
  category: 'Low' | 'Moderate' | 'High' | 'Very High';
  inputData: Record<string, unknown>;
  recommendation: string;
  nextSteps: string[];
  clinicalEvidence: string[];
}>;

/**
 * Derive deterministic, clinically-plausible risk scores for synthetic demo patients.
 *
 * This is designed for investor demos and local development, not clinical use.
 * It intentionally avoids any PHI leakage by operating on already-structured facts.
 *
 * @param facts - Normalized clinical facts (comorbidities + vitals snapshot).
 * @returns A set of risk scores suitable for seeding `RiskScore` rows.
 */
export function deriveSeedRiskScores(facts: SeedClinicalFacts): SeedRiskScore[] {
  const age = Math.max(0, Math.min(120, Math.round(facts.ageYears)));
  const systolic = facts.systolicBP ?? (facts.hasHypertension ? 145 : 122);
  const diastolic = facts.diastolicBP ?? (facts.hasHypertension ? 92 : 78);

  const bmi = facts.bmi;
  const obese = typeof bmi === 'number' ? bmi >= 30 : false;

  // Very small heuristic model to produce stable demo scores:
  // - Tobacco + HTN + DM2 in middle-age should land "High".
  // - Otherwise scale down.
  const baseAscvd = 0.03;
  const ageFactor = Math.max(0, (age - 40) * 0.005); // +0.5% per year > 40
  const htnFactor = facts.hasHypertension ? 0.06 : 0.0;
  const dmFactor = facts.hasType2Diabetes ? 0.08 : 0.0;
  const tobaccoFactor = facts.tobaccoUse ? 0.06 : 0.0;
  const obesityFactor = obese ? 0.03 : 0.0;
  const bpFactor = systolic >= 140 || diastolic >= 90 ? 0.02 : 0.0;

  const ascvdScore = clamp01(baseAscvd + ageFactor + htnFactor + dmFactor + tobaccoFactor + obesityFactor + bpFactor);
  const ascvdPct = `${(ascvdScore * 100).toFixed(1)}%`;
  const ascvdCategory = categorizePercent(ascvdScore);

  const diabetesScore = facts.hasType2Diabetes ? 0.85 : obese || facts.tobaccoUse ? 0.35 : 0.12;
  const diabetesCategory = diabetesScore >= 0.75 ? 'Very High' : diabetesScore >= 0.45 ? 'High' : diabetesScore >= 0.2 ? 'Moderate' : 'Low';

  const htnScore = systolic >= 160 || diastolic >= 100 ? 0.85 : systolic >= 140 || diastolic >= 90 ? 0.65 : 0.18;
  const htnCategory = htnScore >= 0.75 ? 'High' : htnScore >= 0.4 ? 'Moderate' : 'Low';

  return [
    {
      riskType: RiskScoreType.ASCVD,
      algorithmVersion: 'ASCVD-DEMO-HEURISTIC-v1',
      score: ascvdScore,
      scorePercentage: ascvdPct,
      category: ascvdCategory,
      inputData: {
        ageYears: age,
        systolicBP: systolic,
        diastolicBP: diastolic,
        bmi: bmi ?? null,
        tobaccoUse: facts.tobaccoUse,
        hasHypertension: facts.hasHypertension,
        hasType2Diabetes: facts.hasType2Diabetes,
      },
      recommendation:
        ascvdCategory === 'High' || ascvdCategory === 'Very High'
          ? 'High cardiovascular risk. Optimize BP control, address tobacco use, and consider statin therapy per guidelines.'
          : 'Continue preventive care: maintain healthy lifestyle, monitor BP and lipids, and reassess risk periodically.',
      nextSteps: [
        'Confirm BP with repeat measurements',
        'Assess lipid profile and HbA1c as indicated',
        facts.tobaccoUse ? 'Offer tobacco cessation support' : 'Reinforce avoidance of tobacco exposure',
      ],
      clinicalEvidence: [
        'ACC/AHA Primary Prevention Guideline (2019)',
        'ACC/AHA Cholesterol Guideline (2018)',
      ],
    },
    {
      riskType: RiskScoreType.DIABETES,
      algorithmVersion: 'DIABETES-DEMO-HEURISTIC-v1',
      score: clamp01(diabetesScore),
      scorePercentage: `${(clamp01(diabetesScore) * 100).toFixed(1)}%`,
      category: diabetesCategory,
      inputData: {
        ageYears: age,
        bmi: bmi ?? null,
        tobaccoUse: facts.tobaccoUse,
        hasType2Diabetes: facts.hasType2Diabetes,
      },
      recommendation:
        facts.hasType2Diabetes
          ? 'Type 2 diabetes present. Optimize glycemic control and risk-factor management.'
          : diabetesCategory === 'High' || diabetesCategory === 'Very High'
            ? 'Elevated diabetes risk. Consider intensive lifestyle intervention and follow-up screening.'
            : 'Routine screening and healthy lifestyle counseling.',
      nextSteps: [
        'Check HbA1c and fasting glucose as appropriate',
        obese ? 'Recommend weight management plan' : 'Encourage regular physical activity',
      ],
      clinicalEvidence: [
        'ADA Standards of Care in Diabetes (annual update)',
      ],
    },
    {
      riskType: RiskScoreType.HYPERTENSION,
      algorithmVersion: 'HTN-DEMO-HEURISTIC-v1',
      score: clamp01(htnScore),
      scorePercentage: `${(clamp01(htnScore) * 100).toFixed(1)}%`,
      category: htnCategory,
      inputData: {
        systolicBP: systolic,
        diastolicBP: diastolic,
        hasHypertension: facts.hasHypertension,
      },
      recommendation:
        htnCategory === 'High'
          ? 'Hypertension likely. Confirm with repeat readings and initiate guideline-directed therapy.'
          : 'Monitor BP and reinforce lifestyle modifications.',
      nextSteps: [
        'Repeat BP measurements (proper cuff size, seated, rested)',
        'Counsel on sodium reduction and activity',
      ],
      clinicalEvidence: [
        'ACC/AHA Hypertension Guideline (2017)',
      ],
    },
  ];
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function categorizePercent(score01: number): 'Low' | 'Moderate' | 'High' | 'Very High' {
  const p = clamp01(score01) * 100;
  if (p >= 20) return 'High';
  if (p >= 7.5) return 'Moderate';
  if (p >= 5) return 'Low';
  return 'Low';
}


