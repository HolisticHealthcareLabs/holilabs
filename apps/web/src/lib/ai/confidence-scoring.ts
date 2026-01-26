/**
 * Confidence Scoring System for AI-Generated Clinical Notes
 *
 * Validates and scores the quality of AI-generated SOAP notes
 * to ensure clinical accuracy and completeness before clinician review.
 *
 * Scoring Criteria:
 * - Completeness: All SOAP sections present and adequately detailed
 * - Medical Entity Quality: High-confidence medical entities extracted
 * - Consistency: No contradictions between sections
 * - Clinical Standards: Adherence to medical documentation standards
 *
 * @compliance HIPAA, HL7 FHIR R4
 */

import type { SOAPSections, MedicalEntity } from '../clinical-notes/soap-generator';

/**
 * Confidence score breakdown
 */
export interface ConfidenceScore {
  overall: number; // 0.0 to 1.0
  breakdown: {
    completeness: number;
    entityQuality: number;
    consistency: number;
    clinicalStandards: number;
  };
  flags: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    message: string;
    section?: 'subjective' | 'objective' | 'assessment' | 'plan';
  }>;
  recommendations: string[];
  requiresReview: boolean; // True if confidence < threshold
}

/**
 * Validation result for a SOAP section
 */
interface SectionValidation {
  isComplete: boolean;
  wordCount: number;
  hasRequiredElements: boolean;
  issues: string[];
}

/**
 * Confidence Scoring Service
 */
export class ConfidenceScoringService {
  private static instance: ConfidenceScoringService;
  private readonly CONFIDENCE_THRESHOLD = 0.70; // Minimum confidence for auto-approval
  private readonly MIN_SECTION_WORDS = 10; // Minimum words per section

  private constructor() {}

  public static getInstance(): ConfidenceScoringService {
    if (!ConfidenceScoringService.instance) {
      ConfidenceScoringService.instance = new ConfidenceScoringService();
    }
    return ConfidenceScoringService.instance;
  }

  /**
   * Score AI-generated SOAP note
   */
  public scoreSOAPNote(
    sections: SOAPSections,
    entities: MedicalEntity[],
    chiefComplaint?: string
  ): ConfidenceScore {
    // Calculate individual scores
    const completeness = this.scoreCompleteness(sections, chiefComplaint);
    const entityQuality = this.scoreEntityQuality(entities);
    const consistency = this.scoreConsistency(sections, entities);
    const clinicalStandards = this.scoreClinicalStandards(sections);

    // Calculate weighted overall score
    const overall = this.calculateWeightedScore({
      completeness,
      entityQuality,
      consistency,
      clinicalStandards,
    });

    // Generate flags and recommendations
    const flags = this.generateFlags(sections, entities, {
      completeness,
      entityQuality,
      consistency,
      clinicalStandards,
    });

    const recommendations = this.generateRecommendations(flags);

    return {
      overall,
      breakdown: {
        completeness,
        entityQuality,
        consistency,
        clinicalStandards,
      },
      flags,
      recommendations,
      requiresReview: overall < this.CONFIDENCE_THRESHOLD || flags.some(f => f.severity === 'critical'),
    };
  }

  // ============================================================================
  // SCORING METHODS
  // ============================================================================

  /**
   * Score completeness (40% weight)
   * Checks if all SOAP sections are present and adequately detailed
   */
  private scoreCompleteness(sections: SOAPSections, chiefComplaint?: string): number {
    let score = 0;
    let maxScore = 5;

    // Chief complaint present (1 point)
    if (chiefComplaint && chiefComplaint.length > 3) {
      score += 1;
    }

    // Each SOAP section (1 point each)
    const sectionValidations = {
      subjective: this.validateSection(sections.subjective, 'subjective'),
      objective: this.validateSection(sections.objective, 'objective'),
      assessment: this.validateSection(sections.assessment, 'assessment'),
      plan: this.validateSection(sections.plan, 'plan'),
    };

    Object.values(sectionValidations).forEach(validation => {
      if (validation.isComplete) score += 1;
    });

    return score / maxScore;
  }

  /**
   * Score medical entity quality (30% weight)
   * Evaluates confidence of extracted medical entities
   */
  private scoreEntityQuality(entities: MedicalEntity[]): number {
    if (entities.length === 0) return 0;

    // Average entity confidence score
    const avgEntityScore = entities.reduce((sum, e) => sum + e.score, 0) / entities.length;

    // Entity diversity bonus (multiple categories)
    const categories = new Set(entities.map(e => e.category));
    const diversityBonus = Math.min(categories.size / 6, 1) * 0.2; // Up to 0.2 bonus

    // High-confidence entity bonus (score > 0.9)
    const highConfidenceCount = entities.filter(e => e.score > 0.9).length;
    const highConfidenceBonus = Math.min(highConfidenceCount / entities.length, 0.5) * 0.1; // Up to 0.1 bonus

    return Math.min(avgEntityScore + diversityBonus + highConfidenceBonus, 1);
  }

  /**
   * Score consistency (15% weight)
   * Checks for contradictions between sections
   */
  private scoreConsistency(sections: SOAPSections, entities: MedicalEntity[]): number {
    let score = 1.0; // Start with perfect score, deduct for issues

    // Check if medications mentioned in subjective appear in plan
    const medicationEntities = entities.filter(e => e.category === 'MEDICATION');
    if (medicationEntities.length > 0) {
      const planMentionsMeds = medicationEntities.some(med =>
        sections.plan.toLowerCase().includes(med.text.toLowerCase())
      );
      if (!planMentionsMeds) score -= 0.2;
    }

    // Check if conditions in assessment are mentioned in subjective/objective
    const conditionEntities = entities.filter(e => e.category === 'MEDICAL_CONDITION');
    if (conditionEntities.length > 0) {
      const conditionsInSubjective = conditionEntities.filter(cond =>
        sections.subjective.toLowerCase().includes(cond.text.toLowerCase()) ||
        sections.objective.toLowerCase().includes(cond.text.toLowerCase())
      );
      const consistencyRatio = conditionsInSubjective.length / conditionEntities.length;
      if (consistencyRatio < 0.5) score -= 0.3;
    }

    // Check if vital signs in objective are referenced in assessment
    const hasVitalSigns = /vital signs|temperature|blood pressure|heart rate|bp|hr/i.test(sections.objective);
    if (hasVitalSigns) {
      const assessmentReferencesVitals = /vital|temp|pressure|rate/i.test(sections.assessment);
      if (!assessmentReferencesVitals) score -= 0.1;
    }

    return Math.max(score, 0);
  }

  /**
   * Score clinical standards adherence (15% weight)
   * Checks if note follows medical documentation best practices
   */
  private scoreClinicalStandards(sections: SOAPSections): number {
    let score = 0;
    let maxScore = 6;

    // Assessment has diagnosis or clinical reasoning (2 points)
    if (/diagnosis|differential|impression|condition/i.test(sections.assessment)) {
      score += 2;
    }

    // Plan has treatment details (2 points)
    if (/medication|treatment|procedure|prescription|rx/i.test(sections.plan)) {
      score += 1;
    }
    if (/follow.?up|return|appointment/i.test(sections.plan)) {
      score += 1;
    }

    // Subjective has symptom descriptions (1 point)
    if (/pain|symptom|complain|report|experience|feel/i.test(sections.subjective)) {
      score += 1;
    }

    // Objective has measurable data (1 point)
    if (/\d+|measurement|exam|finding|observed/i.test(sections.objective)) {
      score += 1;
    }

    return score / maxScore;
  }

  /**
   * Calculate weighted overall score
   */
  private calculateWeightedScore(scores: {
    completeness: number;
    entityQuality: number;
    consistency: number;
    clinicalStandards: number;
  }): number {
    const weighted =
      scores.completeness * 0.40 +
      scores.entityQuality * 0.30 +
      scores.consistency * 0.15 +
      scores.clinicalStandards * 0.15;

    return Math.round(weighted * 100) / 100;
  }

  // ============================================================================
  // VALIDATION HELPERS
  // ============================================================================

  /**
   * Validate individual SOAP section
   */
  private validateSection(content: string, section: 'subjective' | 'objective' | 'assessment' | 'plan'): SectionValidation {
    const wordCount = content.trim().split(/\s+/).length;
    const issues: string[] = [];

    // Check minimum length
    if (wordCount < this.MIN_SECTION_WORDS) {
      issues.push(`Section is too short (${wordCount} words)`);
    }

    // Check for required elements by section
    let hasRequiredElements = true;

    switch (section) {
      case 'subjective':
        // Should mention patient perspective
        if (!/patient|reports?|states?|complains?|describes?|feels?/i.test(content)) {
          hasRequiredElements = false;
          issues.push('Missing patient perspective language');
        }
        break;

      case 'objective':
        // Should have measurable data
        if (!/\d+|exam|finding|observed|vital/i.test(content)) {
          hasRequiredElements = false;
          issues.push('Missing objective measurements or findings');
        }
        break;

      case 'assessment':
        // Should have clinical reasoning
        if (!/diagnosis|assessment|impression|condition|likely|differential/i.test(content)) {
          hasRequiredElements = false;
          issues.push('Missing clinical assessment or diagnosis');
        }
        break;

      case 'plan':
        // Should have actionable items
        if (!/treatment|medication|procedure|follow.?up|referral|rx|prescribe/i.test(content)) {
          hasRequiredElements = false;
          issues.push('Missing treatment plan or follow-up instructions');
        }
        break;
    }

    return {
      isComplete: wordCount >= this.MIN_SECTION_WORDS && hasRequiredElements,
      wordCount,
      hasRequiredElements,
      issues,
    };
  }

  /**
   * Generate flags for issues
   */
  private generateFlags(
    sections: SOAPSections,
    entities: MedicalEntity[],
    scores: {
      completeness: number;
      entityQuality: number;
      consistency: number;
      clinicalStandards: number;
    }
  ): ConfidenceScore['flags'] {
    const flags: ConfidenceScore['flags'] = [];

    // Completeness flags
    if (scores.completeness < 0.6) {
      Object.entries(sections).forEach(([key, content]) => {
        const validation = this.validateSection(content, key as any);
        if (!validation.isComplete) {
          flags.push({
            severity: 'high',
            category: 'completeness',
            message: `${key.toUpperCase()} section is incomplete: ${validation.issues.join(', ')}`,
            section: key as any,
          });
        }
      });
    }

    // Entity quality flags
    if (scores.entityQuality < 0.5) {
      flags.push({
        severity: 'medium',
        category: 'entity_quality',
        message: `Low confidence in extracted medical entities (${Math.round(scores.entityQuality * 100)}%)`,
      });
    }

    // Missing critical entities
    const hasMedications = entities.some(e => e.category === 'MEDICATION');
    const hasConditions = entities.some(e => e.category === 'MEDICAL_CONDITION');

    if (!hasConditions && sections.assessment.length > 0) {
      flags.push({
        severity: 'medium',
        category: 'entity_extraction',
        message: 'No medical conditions detected - manual review required',
        section: 'assessment',
      });
    }

    // Consistency flags
    if (scores.consistency < 0.7) {
      flags.push({
        severity: 'high',
        category: 'consistency',
        message: 'Potential inconsistencies detected between SOAP sections',
      });
    }

    // Clinical standards flags
    if (scores.clinicalStandards < 0.5) {
      flags.push({
        severity: 'high',
        category: 'clinical_standards',
        message: 'Note does not meet clinical documentation standards',
      });
    }

    // Missing diagnosis in assessment
    if (!/diagnosis|differential|impression|assessment.*:.*\w/i.test(sections.assessment)) {
      flags.push({
        severity: 'critical',
        category: 'clinical_standards',
        message: 'Assessment section is missing diagnosis or clinical impression',
        section: 'assessment',
      });
    }

    // Missing treatment plan
    if (!/medication|treatment|rx|prescri/i.test(sections.plan) && sections.plan.length > 0) {
      flags.push({
        severity: 'medium',
        category: 'clinical_standards',
        message: 'Plan section may be missing treatment details',
        section: 'plan',
      });
    }

    return flags;
  }

  /**
   * Generate recommendations based on flags
   */
  private generateRecommendations(flags: ConfidenceScore['flags']): string[] {
    const recommendations: string[] = [];

    // Group flags by category
    const byCategory = flags.reduce((acc, flag) => {
      if (!acc[flag.category]) acc[flag.category] = [];
      acc[flag.category].push(flag);
      return acc;
    }, {} as Record<string, typeof flags>);

    // Generate category-specific recommendations
    if (byCategory.completeness) {
      recommendations.push('Review and expand incomplete SOAP sections with additional clinical details');
    }

    if (byCategory.entity_quality) {
      recommendations.push('Verify medical terminology and entity extraction accuracy');
    }

    if (byCategory.consistency) {
      recommendations.push('Check for consistency between subjective complaints, objective findings, and assessment');
    }

    if (byCategory.clinical_standards) {
      recommendations.push('Ensure note includes diagnosis, treatment plan, and follow-up instructions');
    }

    // Critical flags get priority recommendations
    const criticalFlags = flags.filter(f => f.severity === 'critical');
    if (criticalFlags.length > 0) {
      recommendations.unshift('⚠️ CRITICAL: This note requires immediate clinician review before signing');
    }

    // Generic recommendation if high issues count
    if (flags.length > 5) {
      recommendations.push('Consider regenerating the note with additional context or manual editing');
    }

    return recommendations;
  }

  /**
   * Get confidence threshold
   */
  public getConfidenceThreshold(): number {
    return this.CONFIDENCE_THRESHOLD;
  }

  /**
   * Check if score meets approval threshold
   */
  public meetsApprovalThreshold(score: number): boolean {
    return score >= this.CONFIDENCE_THRESHOLD;
  }
}

// Export singleton instance
export const confidenceScoringService = ConfidenceScoringService.getInstance();
