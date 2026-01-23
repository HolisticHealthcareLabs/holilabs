/**
 * Tests for Quality Grading Rubric
 *
 * Tests the grading rubric constants and helper functions:
 * - calculateOverallScore
 * - determineRecommendation
 * - parseGradingResult
 * - generateGradingSummary
 */

import {
  SCRIBE_QUALITY_RUBRIC,
  EXTRACTION_QUALITY_RUBRIC,
  GRADING_PROMPT_TEMPLATE,
  calculateOverallScore,
  determineRecommendation,
  parseGradingResult,
  generateGradingSummary,
} from '../grading-rubric';
import type { QualityDimension, QualityGradingResult, QualityRubric } from '@med-app/types';

// ============================================
// RUBRIC CONSTANT TESTS
// ============================================

describe('SCRIBE_QUALITY_RUBRIC', () => {
  it('should have four dimensions', () => {
    expect(SCRIBE_QUALITY_RUBRIC.dimensions).toHaveLength(4);
  });

  it('should have Factual Accuracy as highest weight', () => {
    const factualAccuracy = SCRIBE_QUALITY_RUBRIC.dimensions.find(
      d => d.name === 'Factual Accuracy'
    );
    expect(factualAccuracy).toBeDefined();
    expect(factualAccuracy?.weight).toBe(0.4);
  });

  it('should have weights that sum to 1.0', () => {
    const totalWeight = SCRIBE_QUALITY_RUBRIC.dimensions.reduce(
      (sum, d) => sum + d.weight,
      0
    );
    expect(totalWeight).toBeCloseTo(1.0, 2);
  });

  it('should have a passing score of 70', () => {
    expect(SCRIBE_QUALITY_RUBRIC.passingScore).toBe(70);
  });

  it('should have flag threshold of 50', () => {
    expect(SCRIBE_QUALITY_RUBRIC.flagForReviewThreshold).toBe(50);
  });

  it('should have criteria for each dimension', () => {
    for (const dimension of SCRIBE_QUALITY_RUBRIC.dimensions) {
      expect(dimension.criteria.length).toBeGreaterThan(0);
    }
  });
});

describe('EXTRACTION_QUALITY_RUBRIC', () => {
  it('should have four dimensions', () => {
    expect(EXTRACTION_QUALITY_RUBRIC.dimensions).toHaveLength(4);
  });

  it('should have Vital Signs Accuracy as highest weight', () => {
    const vitalSigns = EXTRACTION_QUALITY_RUBRIC.dimensions.find(
      d => d.name === 'Vital Signs Accuracy'
    );
    expect(vitalSigns).toBeDefined();
    expect(vitalSigns?.weight).toBe(0.35);
  });

  it('should have weights that sum to 1.0', () => {
    const totalWeight = EXTRACTION_QUALITY_RUBRIC.dimensions.reduce(
      (sum, d) => sum + d.weight,
      0
    );
    expect(totalWeight).toBeCloseTo(1.0, 2);
  });

  it('should have a passing score of 75', () => {
    expect(EXTRACTION_QUALITY_RUBRIC.passingScore).toBe(75);
  });
});

describe('GRADING_PROMPT_TEMPLATE', () => {
  it('should contain placeholders for transcript and note', () => {
    expect(GRADING_PROMPT_TEMPLATE).toContain('{transcript}');
    expect(GRADING_PROMPT_TEMPLATE).toContain('{note}');
  });

  it('should contain grading instructions', () => {
    expect(GRADING_PROMPT_TEMPLATE).toContain('hallucination');
    expect(GRADING_PROMPT_TEMPLATE).toContain('medication');
    expect(GRADING_PROMPT_TEMPLATE).toContain('vital signs');
  });

  it('should contain output format instructions', () => {
    expect(GRADING_PROMPT_TEMPLATE).toContain('overallScore');
    expect(GRADING_PROMPT_TEMPLATE).toContain('dimensions');
    expect(GRADING_PROMPT_TEMPLATE).toContain('hallucinations');
    expect(GRADING_PROMPT_TEMPLATE).toContain('recommendation');
  });

  it('should contain recommendation guidelines', () => {
    expect(GRADING_PROMPT_TEMPLATE).toContain('pass');
    expect(GRADING_PROMPT_TEMPLATE).toContain('review_required');
    expect(GRADING_PROMPT_TEMPLATE).toContain('fail');
  });
});

// ============================================
// calculateOverallScore TESTS
// ============================================

describe('calculateOverallScore', () => {
  it('should calculate weighted average correctly', () => {
    const dimensions: QualityDimension[] = [
      { name: 'Dim1', score: 100, weight: 0.5, issues: [] },
      { name: 'Dim2', score: 50, weight: 0.5, issues: [] },
    ];
    const score = calculateOverallScore(dimensions);
    expect(score).toBe(75); // (100*0.5 + 50*0.5) / 1.0 = 75
  });

  it('should handle different weights correctly', () => {
    const dimensions: QualityDimension[] = [
      { name: 'Factual Accuracy', score: 80, weight: 0.4, issues: [] },
      { name: 'Completeness', score: 70, weight: 0.3, issues: [] },
      { name: 'Clinical Relevance', score: 90, weight: 0.2, issues: [] },
      { name: 'Format Quality', score: 100, weight: 0.1, issues: [] },
    ];
    // (80*0.4 + 70*0.3 + 90*0.2 + 100*0.1) / 1.0 = 32 + 21 + 18 + 10 = 81
    const score = calculateOverallScore(dimensions);
    expect(score).toBe(81);
  });

  it('should round to nearest integer', () => {
    const dimensions: QualityDimension[] = [
      { name: 'Dim1', score: 75, weight: 0.6, issues: [] },
      { name: 'Dim2', score: 80, weight: 0.4, issues: [] },
    ];
    // (75*0.6 + 80*0.4) / 1.0 = 45 + 32 = 77
    const score = calculateOverallScore(dimensions);
    expect(score).toBe(77);
  });

  it('should handle all zeros', () => {
    const dimensions: QualityDimension[] = [
      { name: 'Dim1', score: 0, weight: 0.5, issues: [] },
      { name: 'Dim2', score: 0, weight: 0.5, issues: [] },
    ];
    const score = calculateOverallScore(dimensions);
    expect(score).toBe(0);
  });

  it('should handle all perfect scores', () => {
    const dimensions: QualityDimension[] = [
      { name: 'Dim1', score: 100, weight: 0.4, issues: [] },
      { name: 'Dim2', score: 100, weight: 0.3, issues: [] },
      { name: 'Dim3', score: 100, weight: 0.2, issues: [] },
      { name: 'Dim4', score: 100, weight: 0.1, issues: [] },
    ];
    const score = calculateOverallScore(dimensions);
    expect(score).toBe(100);
  });
});

// ============================================
// determineRecommendation TESTS
// ============================================

describe('determineRecommendation', () => {
  it('should return "fail" for critical issues', () => {
    const recommendation = determineRecommendation(
      85, // High score
      [], // No hallucinations
      ['Critical patient safety issue'], // Critical issue
      SCRIBE_QUALITY_RUBRIC
    );
    expect(recommendation).toBe('fail');
  });

  it('should return "fail" for score below threshold', () => {
    const recommendation = determineRecommendation(
      45, // Below flagForReviewThreshold (50)
      [],
      [],
      SCRIBE_QUALITY_RUBRIC
    );
    expect(recommendation).toBe('fail');
  });

  it('should return "review_required" for hallucinations', () => {
    const recommendation = determineRecommendation(
      80, // Passing score
      ['Medication X mentioned but not in transcript'],
      [],
      SCRIBE_QUALITY_RUBRIC
    );
    expect(recommendation).toBe('review_required');
  });

  it('should return "review_required" for score between thresholds', () => {
    const recommendation = determineRecommendation(
      60, // Between 50 (flag) and 70 (pass)
      [],
      [],
      SCRIBE_QUALITY_RUBRIC
    );
    expect(recommendation).toBe('review_required');
  });

  it('should return "pass" for passing score with no issues', () => {
    const recommendation = determineRecommendation(
      85,
      [],
      [],
      SCRIBE_QUALITY_RUBRIC
    );
    expect(recommendation).toBe('pass');
  });

  it('should return "pass" for exactly passing score', () => {
    const recommendation = determineRecommendation(
      70, // Exactly passing
      [],
      [],
      SCRIBE_QUALITY_RUBRIC
    );
    expect(recommendation).toBe('pass');
  });

  it('should prioritize critical issues over score', () => {
    const recommendation = determineRecommendation(
      100, // Perfect score
      [],
      ['Critical issue'],
      SCRIBE_QUALITY_RUBRIC
    );
    expect(recommendation).toBe('fail');
  });

  it('should use different thresholds for extraction rubric', () => {
    // Extraction rubric has passingScore: 75, flagForReviewThreshold: 60
    const recommendation = determineRecommendation(
      72, // Between 60 and 75 for extraction rubric
      [],
      [],
      EXTRACTION_QUALITY_RUBRIC
    );
    expect(recommendation).toBe('review_required');
  });
});

// ============================================
// parseGradingResult TESTS
// ============================================

describe('parseGradingResult', () => {
  it('should parse valid JSON response', () => {
    const validResponse = JSON.stringify({
      overallScore: 85,
      dimensions: [
        { name: 'Factual Accuracy', score: 90, weight: 0.4, issues: [] },
        { name: 'Completeness', score: 80, weight: 0.3, issues: ['Missing allergy'] },
        { name: 'Clinical Relevance', score: 85, weight: 0.2, issues: [] },
        { name: 'Format Quality', score: 90, weight: 0.1, issues: [] },
      ],
      hallucinations: [],
      criticalIssues: [],
      recommendation: 'pass',
    });

    const result = parseGradingResult(validResponse, SCRIBE_QUALITY_RUBRIC);

    expect(result).not.toBeNull();
    expect(result?.overallScore).toBeDefined();
    expect(result?.dimensions).toHaveLength(4);
    expect(result?.recommendation).toBe('pass');
  });

  it('should extract JSON from markdown response', () => {
    const markdownResponse = `Here is the grading result:
\`\`\`json
{
  "overallScore": 75,
  "dimensions": [
    { "name": "Dim1", "score": 75, "weight": 1.0, "issues": [] }
  ],
  "hallucinations": [],
  "criticalIssues": [],
  "recommendation": "pass"
}
\`\`\`
The note was good overall.`;

    const result = parseGradingResult(markdownResponse, SCRIBE_QUALITY_RUBRIC);

    expect(result).not.toBeNull();
    expect(result?.dimensions).toHaveLength(1);
  });

  it('should return null for invalid JSON', () => {
    const invalidResponse = 'This is not JSON at all';
    const result = parseGradingResult(invalidResponse, SCRIBE_QUALITY_RUBRIC);
    expect(result).toBeNull();
  });

  it('should return null for missing required fields', () => {
    const incompleteResponse = JSON.stringify({
      overallScore: 85,
      // Missing dimensions, hallucinations, criticalIssues
    });

    const result = parseGradingResult(incompleteResponse, SCRIBE_QUALITY_RUBRIC);
    expect(result).toBeNull();
  });

  it('should clamp scores to 0-100 range', () => {
    const outOfRangeResponse = JSON.stringify({
      overallScore: 150,
      dimensions: [
        { name: 'Dim1', score: 150, weight: 0.5, issues: [] }, // Over 100
        { name: 'Dim2', score: -10, weight: 0.5, issues: [] }, // Below 0
      ],
      hallucinations: [],
      criticalIssues: [],
      recommendation: 'pass',
    });

    const result = parseGradingResult(outOfRangeResponse, SCRIBE_QUALITY_RUBRIC);

    expect(result).not.toBeNull();
    expect(result?.dimensions[0].score).toBe(100); // Clamped to 100
    expect(result?.dimensions[1].score).toBe(0); // Clamped to 0
  });

  it('should recalculate overall score for consistency', () => {
    const responseWithWrongTotal = JSON.stringify({
      overallScore: 99, // Wrong total
      dimensions: [
        { name: 'Dim1', score: 100, weight: 0.5, issues: [] },
        { name: 'Dim2', score: 50, weight: 0.5, issues: [] },
      ],
      hallucinations: [],
      criticalIssues: [],
      recommendation: 'pass',
    });

    const result = parseGradingResult(responseWithWrongTotal, SCRIBE_QUALITY_RUBRIC);

    expect(result).not.toBeNull();
    expect(result?.overallScore).toBe(75); // Recalculated: (100*0.5 + 50*0.5)
  });

  it('should recalculate recommendation based on rules', () => {
    const responseWithHallucinations = JSON.stringify({
      overallScore: 85,
      dimensions: [
        { name: 'Dim1', score: 85, weight: 1.0, issues: [] },
      ],
      hallucinations: ['Fabricated medication'],
      criticalIssues: [],
      recommendation: 'pass', // Should be overridden
    });

    const result = parseGradingResult(responseWithHallucinations, SCRIBE_QUALITY_RUBRIC);

    expect(result).not.toBeNull();
    expect(result?.recommendation).toBe('review_required'); // Recalculated
  });

  it('should handle empty issues array', () => {
    const responseWithNoIssues = JSON.stringify({
      overallScore: 95,
      dimensions: [
        { name: 'Dim1', score: 95, weight: 1.0 }, // Missing issues
      ],
      hallucinations: [],
      criticalIssues: [],
      recommendation: 'pass',
    });

    const result = parseGradingResult(responseWithNoIssues, SCRIBE_QUALITY_RUBRIC);

    expect(result).not.toBeNull();
    expect(result?.dimensions[0].issues).toEqual([]);
  });
});

// ============================================
// generateGradingSummary TESTS
// ============================================

describe('generateGradingSummary', () => {
  it('should generate summary for passing result', () => {
    const result: QualityGradingResult = {
      overallScore: 85,
      dimensions: [
        { name: 'Factual Accuracy', score: 90, weight: 0.4, issues: [] },
        { name: 'Completeness', score: 80, weight: 0.3, issues: [] },
      ],
      hallucinations: [],
      criticalIssues: [],
      recommendation: 'pass',
    };

    const summary = generateGradingSummary(result);

    expect(summary).toContain('Overall Score: 85/100');
    expect(summary).toContain('PASS');
    expect(summary).toContain('Factual Accuracy: 90/100');
    expect(summary).toContain('Completeness: 80/100');
  });

  it('should include issues in summary', () => {
    const result: QualityGradingResult = {
      overallScore: 70,
      dimensions: [
        {
          name: 'Factual Accuracy',
          score: 70,
          weight: 1.0,
          issues: ['Wrong dosage for metformin'],
        },
      ],
      hallucinations: [],
      criticalIssues: [],
      recommendation: 'pass',
    };

    const summary = generateGradingSummary(result);

    expect(summary).toContain('Wrong dosage for metformin');
  });

  it('should include hallucinations in summary', () => {
    const result: QualityGradingResult = {
      overallScore: 65,
      dimensions: [
        { name: 'Factual Accuracy', score: 65, weight: 1.0, issues: [] },
      ],
      hallucinations: ['Medication X not mentioned in transcript'],
      criticalIssues: [],
      recommendation: 'review_required',
    };

    const summary = generateGradingSummary(result);

    expect(summary).toContain('Hallucinations Detected');
    expect(summary).toContain('Medication X not mentioned in transcript');
  });

  it('should include critical issues in summary', () => {
    const result: QualityGradingResult = {
      overallScore: 40,
      dimensions: [
        { name: 'Factual Accuracy', score: 40, weight: 1.0, issues: [] },
      ],
      hallucinations: [],
      criticalIssues: ['Wrong patient name - potential safety issue'],
      recommendation: 'fail',
    };

    const summary = generateGradingSummary(result);

    expect(summary).toContain('Critical Issues');
    expect(summary).toContain('Wrong patient name');
    expect(summary).toContain('FAIL');
  });

  it('should include weight percentages', () => {
    const result: QualityGradingResult = {
      overallScore: 80,
      dimensions: [
        { name: 'Factual Accuracy', score: 80, weight: 0.4, issues: [] },
      ],
      hallucinations: [],
      criticalIssues: [],
      recommendation: 'pass',
    };

    const summary = generateGradingSummary(result);

    expect(summary).toContain('weight: 40%');
  });

  it('should handle review_required recommendation', () => {
    const result: QualityGradingResult = {
      overallScore: 60,
      dimensions: [
        { name: 'Dim1', score: 60, weight: 1.0, issues: [] },
      ],
      hallucinations: [],
      criticalIssues: [],
      recommendation: 'review_required',
    };

    const summary = generateGradingSummary(result);

    expect(summary).toContain('REVIEW_REQUIRED');
  });
});
