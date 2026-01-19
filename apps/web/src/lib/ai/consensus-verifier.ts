/**
 * Multi-Model Consensus Verification
 *
 * CDSS V3 - Critical healthcare decisions require verification.
 *
 * "If all checks pass, proceed. If any model says 'I don't know', escalate."
 *
 * This module implements:
 * 1. Secondary model verification for critical decisions
 * 2. Rule-based sanity checks
 * 3. Historical pattern matching
 * 4. Automatic escalation when confidence is low
 *
 * Exception Cascade:
 *   AI Response (low confidence)
 *       ↓
 *   Secondary Model Verification
 *       ↓
 *   Rule-Based Sanity Check
 *       ↓
 *   If still uncertain → Human Escalation Queue (Priority 10)
 *       ↓
 *   If human unavailable → BLOCK ACTION (fail safe)
 */

import { chat, type AIProvider } from './chat';
import { reviewQueueService } from '@/lib/services/review-queue.service';
import logger from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

export interface ClinicalContext {
  patientId: string;
  encounterId?: string;
  age?: number;
  sex?: string;
  conditions?: string[];
  medications?: string[];
  recentLabs?: Array<{ name: string; value: string; unit: string; flag?: 'high' | 'low' | 'critical' }>;
  chiefComplaint?: string;
}

export interface AIResponse {
  content: string;
  confidence?: number;
  provider: AIProvider;
  reasoning?: string;
}

export interface VerifierResult {
  verifierName: string;
  agrees: boolean;
  confidence: number;
  concerns?: string[];
  reasoning?: string;
  error?: string;
}

export interface ConsensusResult {
  decision: string;
  overallConfidence: number;
  agreements: number;
  disagreements: number;
  escalationRequired: boolean;
  escalationReason?: string;
  verifierResults: VerifierResult[];
  reviewQueueId?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85,      // No escalation needed
  MEDIUM: 0.70,    // Requires secondary verification
  LOW: 0.50,       // Requires human review
  CRITICAL: 0.30,  // Block action, immediate escalation
};

const SAFETY_CRITICAL_PATTERNS = [
  /\b(contraindicated|contraindication)\b/i,
  /\b(overdose|toxic|toxicity)\b/i,
  /\b(allergic|allergy|anaphylaxis)\b/i,
  /\b(black box warning)\b/i,
  /\b(do not use|avoid)\b/i,
  /\b(life-threatening|fatal|death)\b/i,
  /\b(pregnancy category [xd])\b/i,
];

// ============================================================================
// Verifiers
// ============================================================================

/**
 * Verify with a secondary AI model
 * Uses a different provider to cross-check the primary response
 */
async function verifyWithSecondModel(
  context: ClinicalContext,
  primaryResponse: AIResponse
): Promise<VerifierResult> {
  const verifierName = 'secondary_model';

  try {
    // Use a different provider than the primary
    const secondaryProvider: AIProvider = primaryResponse.provider === 'claude' ? 'gemini' : 'claude';

    const verificationPrompt = `You are a clinical verification assistant. Review the following clinical decision and determine if it is appropriate.

PATIENT CONTEXT:
- Age: ${context.age || 'Unknown'}
- Sex: ${context.sex || 'Unknown'}
- Conditions: ${context.conditions?.join(', ') || 'None documented'}
- Medications: ${context.medications?.join(', ') || 'None documented'}
${context.chiefComplaint ? `- Chief Complaint: ${context.chiefComplaint}` : ''}

CLINICAL DECISION TO VERIFY:
${primaryResponse.content}

INSTRUCTIONS:
1. Analyze if this decision is clinically appropriate
2. Identify any safety concerns or contraindications
3. Rate your confidence (0.0-1.0) in this decision

Respond in JSON format:
{
  "agrees": true/false,
  "confidence": 0.0-1.0,
  "concerns": ["list of concerns if any"],
  "reasoning": "brief explanation"
}`;

    const response = await chat({
      messages: [{ role: 'user', content: verificationPrompt }],
      provider: secondaryProvider,
      temperature: 0.1, // Low temperature for consistency
    });

    if (!response.success || !response.message) {
      return {
        verifierName,
        agrees: false,
        confidence: 0,
        error: 'Secondary model verification failed',
      };
    }

    // Parse JSON response
    try {
      const jsonMatch = response.message.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          verifierName,
          agrees: parsed.agrees === true,
          confidence: Math.max(0, Math.min(1, parsed.confidence || 0)),
          concerns: parsed.concerns || [],
          reasoning: parsed.reasoning,
        };
      }
    } catch {
      // If JSON parsing fails, assume disagreement for safety
      logger.warn({
        event: 'consensus_json_parse_failed',
        verifierName,
        response: response.message?.slice(0, 200),
      });
    }

    return {
      verifierName,
      agrees: false,
      confidence: 0.5,
      reasoning: 'Could not parse verification response',
    };
  } catch (error) {
    logger.error({
      event: 'consensus_verifier_error',
      verifierName,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      verifierName,
      agrees: false,
      confidence: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Rule-based sanity check
 * Checks for known safety patterns and contraindications
 */
async function verifyWithRuleEngine(
  context: ClinicalContext,
  primaryResponse: AIResponse
): Promise<VerifierResult> {
  const verifierName = 'rule_engine';
  const concerns: string[] = [];
  let confidence = 1.0;

  try {
    const content = primaryResponse.content.toLowerCase();

    // Check for safety-critical patterns
    for (const pattern of SAFETY_CRITICAL_PATTERNS) {
      if (pattern.test(primaryResponse.content)) {
        concerns.push(`Safety pattern detected: ${pattern.source}`);
        confidence -= 0.2;
      }
    }

    // Check for medication-condition conflicts (simplified rule engine)
    if (context.medications && context.conditions) {
      // Example rules - in production, this would be a comprehensive database
      const conflictRules = [
        { medication: /metformin/i, condition: /renal failure|kidney disease/i, concern: 'Metformin contraindicated in renal failure' },
        { medication: /warfarin/i, condition: /active bleeding/i, concern: 'Warfarin contraindicated with active bleeding' },
        { medication: /nsaid|ibuprofen|naproxen/i, condition: /gi bleed|ulcer/i, concern: 'NSAIDs contraindicated with GI bleeding history' },
      ];

      for (const rule of conflictRules) {
        const hasMed = context.medications.some(m => rule.medication.test(m));
        const hasCond = context.conditions.some(c => rule.condition.test(c));

        if (hasMed && hasCond && content.includes(rule.medication.source.toLowerCase())) {
          concerns.push(rule.concern);
          confidence -= 0.3;
        }
      }
    }

    // Check for uncertain language in AI response
    const uncertainPhrases = [
      'i\'m not sure',
      'it\'s unclear',
      'possibly',
      'might be',
      'could be',
      'uncertain',
      'insufficient information',
    ];

    for (const phrase of uncertainPhrases) {
      if (content.includes(phrase)) {
        concerns.push(`Uncertain language detected: "${phrase}"`);
        confidence -= 0.15;
      }
    }

    confidence = Math.max(0, confidence);

    return {
      verifierName,
      agrees: concerns.length === 0,
      confidence,
      concerns: concerns.length > 0 ? concerns : undefined,
      reasoning: concerns.length > 0
        ? `Rule engine flagged ${concerns.length} concern(s)`
        : 'No rule violations detected',
    };
  } catch (error) {
    logger.error({
      event: 'consensus_verifier_error',
      verifierName,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      verifierName,
      agrees: false,
      confidence: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Historical pattern verification
 * Checks if the decision aligns with typical patterns for similar cases
 * (Placeholder - would connect to historical outcomes database in production)
 */
async function verifyWithHistoricalPatterns(
  context: ClinicalContext,
  primaryResponse: AIResponse
): Promise<VerifierResult> {
  const verifierName = 'historical_patterns';

  try {
    // In production, this would query a database of historical decisions and outcomes
    // For now, we implement basic pattern matching

    let confidence = 0.75; // Default moderate confidence
    const concerns: string[] = [];

    // Age-appropriate checks
    if (context.age) {
      const content = primaryResponse.content.toLowerCase();

      // Pediatric safety
      if (context.age < 18) {
        const adultOnlyPatterns = [
          /adult dose/i,
          /not approved for children/i,
          /pediatric safety not established/i,
        ];

        for (const pattern of adultOnlyPatterns) {
          if (pattern.test(primaryResponse.content)) {
            concerns.push('Adult-only medication/dosing mentioned for pediatric patient');
            confidence -= 0.3;
          }
        }
      }

      // Geriatric safety
      if (context.age >= 65) {
        const geriatricConcerns = [
          /beers criteria/i,
          /avoid in elderly/i,
          /increased fall risk/i,
        ];

        for (const pattern of geriatricConcerns) {
          if (pattern.test(primaryResponse.content)) {
            concerns.push('Geriatric safety concern detected');
            confidence -= 0.2;
          }
        }
      }
    }

    confidence = Math.max(0, confidence);

    return {
      verifierName,
      agrees: concerns.length === 0,
      confidence,
      concerns: concerns.length > 0 ? concerns : undefined,
      reasoning: 'Historical pattern analysis complete',
    };
  } catch (error) {
    logger.error({
      event: 'consensus_verifier_error',
      verifierName,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      verifierName,
      agrees: false,
      confidence: 0.5, // Moderate confidence on error - don't fully block
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Main Consensus Function
// ============================================================================

/**
 * Calculate weighted consensus confidence from verifier results
 */
function calculateConsensusConfidence(results: VerifierResult[]): number {
  const weights = {
    secondary_model: 0.4,
    rule_engine: 0.35,
    historical_patterns: 0.25,
  };

  let totalWeight = 0;
  let weightedConfidence = 0;

  for (const result of results) {
    const weight = weights[result.verifierName as keyof typeof weights] || 0.25;
    if (!result.error) {
      weightedConfidence += result.confidence * weight;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? weightedConfidence / totalWeight : 0;
}

/**
 * Verify a clinical AI response with multi-model consensus
 *
 * @param context - Patient clinical context
 * @param primaryResponse - The primary AI response to verify
 * @param clinicianId - ID of the clinician (for escalation queue)
 * @returns ConsensusResult with verification details and optional escalation
 */
export async function verifyWithConsensus(
  context: ClinicalContext,
  primaryResponse: AIResponse,
  clinicianId: string
): Promise<ConsensusResult> {
  logger.info({
    event: 'consensus_verification_started',
    patientId: context.patientId,
    primaryProvider: primaryResponse.provider,
    primaryConfidence: primaryResponse.confidence,
  });

  // Run all verifiers in parallel
  const verifierPromises = [
    verifyWithSecondModel(context, primaryResponse),
    verifyWithRuleEngine(context, primaryResponse),
    verifyWithHistoricalPatterns(context, primaryResponse),
  ];

  const settledResults = await Promise.allSettled(verifierPromises);

  // Extract results
  const verifierResults: VerifierResult[] = settledResults.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return {
      verifierName: ['secondary_model', 'rule_engine', 'historical_patterns'][index],
      agrees: false,
      confidence: 0,
      error: result.reason?.message || 'Verifier failed',
    };
  });

  // Calculate consensus metrics
  const overallConfidence = calculateConsensusConfidence(verifierResults);
  const agreements = verifierResults.filter(r => r.agrees && !r.error).length;
  const disagreements = verifierResults.filter(r => !r.agrees && !r.error).length;

  // Determine if escalation is required
  let escalationRequired = false;
  let escalationReason: string | undefined;
  let reviewQueueId: string | undefined;

  // Escalation rules:
  // 1. Overall confidence below threshold
  // 2. Any verifier with critical concerns
  // 3. Primary response has low confidence
  // 4. More disagreements than agreements

  if (overallConfidence < CONFIDENCE_THRESHOLDS.LOW) {
    escalationRequired = true;
    escalationReason = `Low consensus confidence: ${(overallConfidence * 100).toFixed(1)}%`;
  } else if (primaryResponse.confidence && primaryResponse.confidence < CONFIDENCE_THRESHOLDS.LOW) {
    escalationRequired = true;
    escalationReason = `Primary AI confidence too low: ${(primaryResponse.confidence * 100).toFixed(1)}%`;
  } else if (disagreements > agreements) {
    escalationRequired = true;
    escalationReason = `Verifier disagreement: ${disagreements} disagree vs ${agreements} agree`;
  } else if (verifierResults.some(r => r.concerns && r.concerns.length > 0)) {
    const allConcerns = verifierResults.flatMap(r => r.concerns || []);
    if (allConcerns.some(c => c.toLowerCase().includes('contraindicated') || c.toLowerCase().includes('safety'))) {
      escalationRequired = true;
      escalationReason = `Safety concerns flagged: ${allConcerns.slice(0, 2).join('; ')}`;
    }
  }

  // If escalation required, add to review queue
  if (escalationRequired) {
    logger.warn({
      event: 'consensus_escalation_triggered',
      patientId: context.patientId,
      overallConfidence,
      escalationReason,
      agreements,
      disagreements,
    });

    try {
      const reviewItem = await reviewQueueService.enforceClinicalReview({
        clinicianId,
        patientId: context.patientId,
        aiResponse: primaryResponse.content,
        contentType: 'diagnosis_suggestion',
        confidence: overallConfidence,
        encounterId: context.encounterId,
        metadata: {
          escalationReason,
          verifierResults: verifierResults.map(r => ({
            name: r.verifierName,
            agrees: r.agrees,
            confidence: r.confidence,
            concerns: r.concerns,
          })),
          primaryProvider: primaryResponse.provider,
        },
      });

      reviewQueueId = reviewItem.reviewQueueId;
    } catch (error) {
      logger.error({
        event: 'consensus_escalation_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const result: ConsensusResult = {
    decision: primaryResponse.content,
    overallConfidence,
    agreements,
    disagreements,
    escalationRequired,
    escalationReason,
    verifierResults,
    reviewQueueId,
  };

  logger.info({
    event: 'consensus_verification_completed',
    patientId: context.patientId,
    overallConfidence,
    escalationRequired,
    reviewQueueId,
  });

  return result;
}

/**
 * Quick check if a response needs consensus verification
 * Use this to decide if full verification is needed
 */
export function needsConsensusVerification(
  primaryResponse: AIResponse,
  contentType: 'diagnosis' | 'prescription' | 'treatment' | 'general'
): boolean {
  // Always verify critical content types
  if (contentType === 'diagnosis' || contentType === 'prescription') {
    return true;
  }

  // Verify if primary confidence is below threshold
  if (primaryResponse.confidence && primaryResponse.confidence < CONFIDENCE_THRESHOLDS.MEDIUM) {
    return true;
  }

  // Verify if safety patterns detected
  for (const pattern of SAFETY_CRITICAL_PATTERNS) {
    if (pattern.test(primaryResponse.content)) {
      return true;
    }
  }

  return false;
}

/**
 * Fail-safe wrapper for critical clinical actions
 * Blocks action if consensus fails or escalation is required
 */
export async function requireConsensusOrFail(
  context: ClinicalContext,
  primaryResponse: AIResponse,
  clinicianId: string,
  actionDescription: string
): Promise<ConsensusResult> {
  const result = await verifyWithConsensus(context, primaryResponse, clinicianId);

  if (result.escalationRequired) {
    logger.error({
      event: 'clinical_action_blocked_by_consensus',
      patientId: context.patientId,
      actionDescription,
      overallConfidence: result.overallConfidence,
      escalationReason: result.escalationReason,
      reviewQueueId: result.reviewQueueId,
    });

    throw new Error(
      `Clinical action "${actionDescription}" blocked: ${result.escalationReason}. ` +
      `Review queue ID: ${result.reviewQueueId || 'N/A'}. Human review required.`
    );
  }

  return result;
}
