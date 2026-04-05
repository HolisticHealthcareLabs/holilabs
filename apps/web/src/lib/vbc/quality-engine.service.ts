/**
 * VBC Quality Measure Engine
 *
 * Evaluates HEDIS-style quality measures against patient populations using
 * JSON-Logic rules stored in QualityMeasure.numeratorRule / denominatorRule.
 *
 * ANVISA Class I: All evaluation is deterministic — JSON-Logic only.
 * ELENA invariant: Every measure has sourceAuthority + citationUrl provenance.
 *
 * AWAITING_REVIEW: JSON-Logic rule shapes need clinical validation per measure.
 */

import jsonLogic from 'json-logic-js';
import type { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PatientFacts {
  patientId: string;
  age: number;
  sex: string;
  diagnoses: string[];       // ICD-10 codes
  medications: string[];     // RxNorm codes or drug names
  labResults: LabFact[];
  encounters: EncounterFact[];
  vitals: VitalFact[];
}

interface LabFact {
  code: string;    // LOINC
  value: number;
  unit: string;
  date: string;    // ISO-8601
}

interface EncounterFact {
  type: string;
  date: string;
  providerId?: string;
}

interface VitalFact {
  type: string;
  value: number;
  unit: string;
  date: string;
}

export interface MeasureEvaluationResult {
  measureId: string;
  measureCode: string;
  measureName: string;
  patientId: string;
  inDenominator: boolean;
  inNumerator: boolean;
  excluded: boolean;
  meetsTarget: boolean;
  gaps: string[];
}

export interface PopulationMeasureResult {
  measureId: string;
  measureCode: string;
  measureName: string;
  numerator: number;
  denominator: number;
  exclusions: number;
  rate: number;
  targetRate: number | null;
  meetsTarget: boolean;
  gapPatientIds: string[];
}

// ---------------------------------------------------------------------------
// Core Evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluates a single quality measure for a single patient.
 * All logic is deterministic via JSON-Logic — no LLM calls.
 */
export function evaluateMeasureForPatient(
  numeratorRule: Record<string, unknown>,
  denominatorRule: Record<string, unknown>,
  exclusionRule: Record<string, unknown> | null,
  facts: PatientFacts,
): { inDenominator: boolean; inNumerator: boolean; excluded: boolean } {
  const excluded = exclusionRule
    ? Boolean(jsonLogic.apply(exclusionRule, facts))
    : false;

  if (excluded) {
    return { inDenominator: false, inNumerator: false, excluded: true };
  }

  const inDenominator = Boolean(jsonLogic.apply(denominatorRule, facts));
  if (!inDenominator) {
    return { inDenominator: false, inNumerator: false, excluded: false };
  }

  const inNumerator = Boolean(jsonLogic.apply(numeratorRule, facts));
  return { inDenominator: true, inNumerator, excluded: false };
}

/**
 * Identifies quality gaps for a patient against a measure.
 * Returns descriptive gap strings for failed numerator criteria.
 *
 * AWAITING_REVIEW: Gap descriptions should be clinically validated per measure.
 */
export function identifyGaps(
  numeratorRule: Record<string, unknown>,
  facts: PatientFacts,
): string[] {
  const gaps: string[] = [];
  const rules = numeratorRule as Record<string, unknown>;

  if ('and' in rules) {
    const conditions = rules.and as Record<string, unknown>[];
    for (const condition of conditions) {
      const result = jsonLogic.apply(condition, facts);
      if (!result) {
        gaps.push(describeRule(condition));
      }
    }
  } else {
    const result = jsonLogic.apply(rules, facts);
    if (!result) {
      gaps.push(describeRule(rules));
    }
  }

  return gaps;
}

function describeRule(rule: Record<string, unknown>): string {
  const op = Object.keys(rule)[0];
  if (!op) return 'Unknown criterion not met';

  const args = rule[op] as unknown[];
  if (op === 'some' || op === 'in') {
    const varRef = extractVar(args[0]);
    return `Missing required value in ${varRef || 'field'}`;
  }
  if (op === '>=' || op === '<=' || op === '>' || op === '<') {
    const varRef = extractVar(args[0]);
    return `${varRef || 'Value'} does not meet threshold (${op} ${args[1]})`;
  }
  return `Criterion "${op}" not satisfied`;
}

function extractVar(arg: unknown): string | null {
  if (typeof arg === 'object' && arg !== null && 'var' in arg) {
    return String((arg as Record<string, unknown>).var);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Population-Level Evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluates a quality measure across a population of patients.
 * Returns aggregate numerator/denominator and gap patient IDs.
 */
export function evaluateMeasureForPopulation(
  numeratorRule: Record<string, unknown>,
  denominatorRule: Record<string, unknown>,
  exclusionRule: Record<string, unknown> | null,
  targetRate: number | null,
  population: PatientFacts[],
): PopulationMeasureResult & { perPatient: MeasureEvaluationResult[] } {
  const perPatient: MeasureEvaluationResult[] = [];
  let numerator = 0;
  let denominator = 0;
  let exclusions = 0;
  const gapPatientIds: string[] = [];

  for (const facts of population) {
    const result = evaluateMeasureForPatient(
      numeratorRule,
      denominatorRule,
      exclusionRule,
      facts,
    );

    const gaps = result.inDenominator && !result.inNumerator
      ? identifyGaps(numeratorRule, facts)
      : [];

    perPatient.push({
      measureId: '',
      measureCode: '',
      measureName: '',
      patientId: facts.patientId,
      ...result,
      meetsTarget: result.inNumerator,
      gaps,
    });

    if (result.excluded) {
      exclusions++;
    } else if (result.inDenominator) {
      denominator++;
      if (result.inNumerator) {
        numerator++;
      } else {
        gapPatientIds.push(facts.patientId);
      }
    }
  }

  const rate = denominator > 0 ? numerator / denominator : 0;
  const meetsTarget = targetRate !== null ? rate >= targetRate : true;

  return {
    measureId: '',
    measureCode: '',
    measureName: '',
    numerator,
    denominator,
    exclusions,
    rate,
    targetRate,
    meetsTarget,
    gapPatientIds,
    perPatient,
  };
}

// ---------------------------------------------------------------------------
// DB-Backed Evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluates a quality measure from the DB against provided patient facts
 * and persists the result to QualityMeasureResult.
 */
export async function evaluateAndPersist(
  prisma: PrismaClient,
  measureCode: string,
  organizationId: string,
  periodStart: Date,
  periodEnd: Date,
  population: PatientFacts[],
  calculatedBy: string,
): Promise<PopulationMeasureResult> {
  const measure = await prisma.qualityMeasure.findUnique({
    where: { code: measureCode },
  });

  if (!measure) {
    throw new Error(`Quality measure with code "${measureCode}" not found`);
  }

  if (!measure.isActive) {
    throw new Error(`Quality measure "${measureCode}" is not active`);
  }

  const result = evaluateMeasureForPopulation(
    measure.numeratorRule as Record<string, unknown>,
    measure.denominatorRule as Record<string, unknown>,
    measure.exclusionRule as Record<string, unknown> | null,
    measure.targetRate,
    population,
  );

  await prisma.qualityMeasureResult.create({
    data: {
      measureId: measure.id,
      organizationId,
      periodStart,
      periodEnd,
      numerator: result.numerator,
      denominator: result.denominator,
      exclusions: result.exclusions,
      rate: result.rate,
      meetsTarget: result.meetsTarget,
      attributedPatientCount: population.length,
      gapPatientIds: result.gapPatientIds,
      calculatedBy,
    },
  });

  return {
    ...result,
    measureId: measure.id,
    measureCode: measure.code,
    measureName: measure.name,
  };
}

/**
 * Retrieves historical results for a quality measure and organization.
 */
export async function getMeasureHistory(
  prisma: PrismaClient,
  measureCode: string,
  organizationId: string,
  limit = 12,
): Promise<unknown[]> {
  const measure = await prisma.qualityMeasure.findUnique({
    where: { code: measureCode },
  });

  if (!measure) {
    throw new Error(`Quality measure with code "${measureCode}" not found`);
  }

  return prisma.qualityMeasureResult.findMany({
    where: {
      measureId: measure.id,
      organizationId,
    },
    orderBy: { periodStart: 'desc' },
    take: limit,
  });
}
