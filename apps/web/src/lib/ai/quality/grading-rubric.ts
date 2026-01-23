/**
 * LLM-as-a-Judge Quality Grading Rubric
 *
 * Defines the "Golden Standard" rubric for evaluating AI-generated
 * clinical documentation against the original transcript.
 *
 * This rubric is used by the async grading pipeline to score AI outputs
 * and identify hallucinations or quality issues.
 */

import type {
  QualityRubric,
  QualityGradingResult,
  QualityDimension,
  QualityRecommendation,
} from '@med-app/types';

// ============================================
// SCRIBE QUALITY RUBRIC
// ============================================

export const SCRIBE_QUALITY_RUBRIC: QualityRubric = {
  dimensions: [
    {
      name: 'Factual Accuracy',
      weight: 0.4,
      criteria: [
        'No hallucinated medications not mentioned in transcript',
        'No invented diagnoses or symptoms',
        'Vital signs match what was dictated',
        'Patient demographics are accurate',
        'No fabricated lab values or test results',
        'Dosages and frequencies match what was stated',
      ],
    },
    {
      name: 'Completeness',
      weight: 0.3,
      criteria: [
        'All mentioned symptoms captured',
        'All medications documented',
        'Chief complaint identified correctly',
        'Relevant history included',
        'All mentioned allergies documented',
        'Family history captured if mentioned',
      ],
    },
    {
      name: 'Clinical Relevance',
      weight: 0.2,
      criteria: [
        'Important findings highlighted',
        'Red flags identified',
        'Appropriate follow-up suggested',
        'Critical values noted if present',
        'Relevant differential considerations included',
      ],
    },
    {
      name: 'Format Quality',
      weight: 0.1,
      criteria: [
        'Proper SOAP structure (if applicable)',
        'Clear organization',
        'Professional language',
        'Appropriate abbreviations used',
        'Coherent narrative flow',
      ],
    },
  ],
  passingScore: 70,
  flagForReviewThreshold: 50,
};

// ============================================
// GRADING PROMPT TEMPLATE
// ============================================

export const GRADING_PROMPT_TEMPLATE = `You are a clinical documentation quality assessor with expertise in medical terminology and documentation standards. Your task is to grade an AI-generated clinical note against the original transcript.

## IMPORTANT RULES:
1. A hallucination is ANY medical information in the note that was NOT mentioned in the transcript
2. Be extremely strict about medications - if a drug is in the note but not mentioned verbatim in the transcript, it's a hallucination
3. Be strict about vital signs - numbers must match exactly what was said
4. Missing information is NOT as severe as hallucinated information
5. Consider the clinical context - some inferences are acceptable (e.g., "hypertension" from "high blood pressure")

## TRANSCRIPT (source of truth):
---
{transcript}
---

## AI-GENERATED NOTE TO EVALUATE:
---
{note}
---

## GRADING RUBRIC:
${JSON.stringify(SCRIBE_QUALITY_RUBRIC, null, 2)}

## YOUR TASK:
Grade each dimension and identify ALL hallucinations. Be thorough and precise.

## OUTPUT FORMAT (JSON only, no markdown):
{
  "overallScore": <number 0-100>,
  "dimensions": [
    {
      "name": "Factual Accuracy",
      "score": <number 0-100>,
      "weight": 0.4,
      "issues": ["specific issue 1", "specific issue 2"]
    },
    {
      "name": "Completeness",
      "score": <number 0-100>,
      "weight": 0.3,
      "issues": ["specific issue 1"]
    },
    {
      "name": "Clinical Relevance",
      "score": <number 0-100>,
      "weight": 0.2,
      "issues": []
    },
    {
      "name": "Format Quality",
      "score": <number 0-100>,
      "weight": 0.1,
      "issues": []
    }
  ],
  "hallucinations": [
    "Medication 'X' mentioned in note but never stated in transcript",
    "Vital sign 'Y' shows 120 but transcript says 110"
  ],
  "criticalIssues": [
    "Critical issue that could impact patient safety"
  ],
  "recommendation": "pass" | "review_required" | "fail"
}

Recommendations:
- "pass": Score >= 70 AND no critical hallucinations
- "review_required": Score 50-69 OR has non-critical hallucinations
- "fail": Score < 50 OR has critical/safety-impacting hallucinations

Return ONLY valid JSON.`;

// ============================================
// PATIENT STATE EXTRACTION RUBRIC
// ============================================

export const EXTRACTION_QUALITY_RUBRIC: QualityRubric = {
  dimensions: [
    {
      name: 'Vital Signs Accuracy',
      weight: 0.35,
      criteria: [
        'All extracted vital signs match transcript values exactly',
        'Units are correctly converted (F to C, lbs to kg)',
        'No vital signs fabricated',
        'Blood pressure systolic/diastolic correctly parsed',
      ],
    },
    {
      name: 'Medication Extraction',
      weight: 0.25,
      criteria: [
        'All mentioned medications captured',
        'Medication names normalized correctly',
        'No hallucinated medications',
        'Generic/brand name mapping accurate',
      ],
    },
    {
      name: 'Condition/ICD-10 Mapping',
      weight: 0.25,
      criteria: [
        'Conditions correctly identified',
        'ICD-10 codes are appropriate',
        'No invented conditions',
        'Severity appropriately captured',
      ],
    },
    {
      name: 'Symptom Extraction',
      weight: 0.15,
      criteria: [
        'All symptoms mentioned are captured',
        'Pain points correctly located',
        'Severity ratings accurate when mentioned',
        'No symptom hallucinations',
      ],
    },
  ],
  passingScore: 75,
  flagForReviewThreshold: 60,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate weighted overall score from dimension scores
 */
export function calculateOverallScore(dimensions: QualityDimension[]): number {
  const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0);
  const weightedSum = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0);
  return Math.round(weightedSum / totalWeight);
}

/**
 * Determine recommendation based on score and issues
 */
export function determineRecommendation(
  score: number,
  hallucinations: string[],
  criticalIssues: string[],
  rubric: QualityRubric
): QualityRecommendation {
  // Critical issues always fail
  if (criticalIssues.length > 0) {
    return 'fail';
  }

  // Below threshold always fails
  if (score < rubric.flagForReviewThreshold) {
    return 'fail';
  }

  // Hallucinations require review
  if (hallucinations.length > 0) {
    return 'review_required';
  }

  // Below passing but above threshold requires review
  if (score < rubric.passingScore) {
    return 'review_required';
  }

  return 'pass';
}

/**
 * Parse and validate grading result from LLM response
 */
export function parseGradingResult(
  llmResponse: string,
  rubric: QualityRubric
): QualityGradingResult | null {
  try {
    // Extract JSON from response
    const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (
      typeof parsed.overallScore !== 'number' ||
      !Array.isArray(parsed.dimensions) ||
      !Array.isArray(parsed.hallucinations) ||
      !Array.isArray(parsed.criticalIssues)
    ) {
      return null;
    }

    // Validate and normalize dimensions
    const dimensions: QualityDimension[] = parsed.dimensions.map((d: QualityDimension) => ({
      name: d.name,
      score: Math.min(100, Math.max(0, d.score)),
      weight: d.weight,
      issues: d.issues || [],
    }));

    // Recalculate overall score for consistency
    const overallScore = calculateOverallScore(dimensions);

    // Determine recommendation
    const recommendation = determineRecommendation(
      overallScore,
      parsed.hallucinations,
      parsed.criticalIssues,
      rubric
    );

    return {
      overallScore,
      dimensions,
      hallucinations: parsed.hallucinations,
      criticalIssues: parsed.criticalIssues,
      recommendation,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Generate a human-readable summary of grading results
 */
export function generateGradingSummary(result: QualityGradingResult): string {
  const lines: string[] = [
    `Overall Score: ${result.overallScore}/100 (${result.recommendation.toUpperCase()})`,
    '',
    'Dimension Scores:',
  ];

  for (const dim of result.dimensions) {
    lines.push(`  ${dim.name}: ${dim.score}/100 (weight: ${dim.weight * 100}%)`);
    if (dim.issues.length > 0) {
      for (const issue of dim.issues) {
        lines.push(`    - ${issue}`);
      }
    }
  }

  if (result.hallucinations.length > 0) {
    lines.push('', 'Hallucinations Detected:');
    for (const h of result.hallucinations) {
      lines.push(`  ⚠️ ${h}`);
    }
  }

  if (result.criticalIssues.length > 0) {
    lines.push('', 'Critical Issues:');
    for (const issue of result.criticalIssues) {
      lines.push(`  🚨 ${issue}`);
    }
  }

  return lines.join('\n');
}

// ============================================
// EXPORTS
// ============================================

export {
  SCRIBE_QUALITY_RUBRIC as default,
};
