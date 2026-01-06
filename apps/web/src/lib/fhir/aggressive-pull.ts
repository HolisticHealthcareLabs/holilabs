/**
 * FHIR Aggressive Pull Service
 *
 * Automatically fetches comprehensive patient data from FHIR servers on patient onboarding:
 * - Observations (lab results, vital signs)
 * - Conditions (diagnoses, problems)
 * - MedicationStatements (medication history)
 * - Procedures (procedures, surgeries)
 *
 * Features:
 * - Parallel resource fetching for performance
 * - Automatic deduplication
 * - Error resilience (partial failures don't stop import)
 * - Comprehensive logging for troubleshooting
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  fromFHIRObservation,
  fromFHIRCondition,
  fromFHIRMedicationStatement,
  fromFHIRProcedure,
  type FHIRObservation,
  type FHIRCondition,
  type FHIRMedicationStatement,
  type FHIRProcedure,
  type FHIRBundle,
} from './resource-mappers';

// ============================================================================
// CONFIGURATION
// ============================================================================

const FHIR_SERVER_BASE_URL = process.env.MEDPLUM_BASE_URL || 'https://api.medplum.com/fhir/R4';
const FHIR_AUTH_TOKEN = process.env.MEDPLUM_AUTH_TOKEN;

// Resource types to fetch
const RESOURCE_TYPES = ['Observation', 'Condition', 'MedicationStatement', 'Procedure'] as const;
type ResourceType = typeof RESOURCE_TYPES[number];

// ============================================================================
// MAIN PULL FUNCTION
// ============================================================================

export interface PullResult {
  success: boolean;
  patientId: string;
  fhirPatientId?: string;
  summary: {
    observations: number;
    conditions: number;
    medications: number;
    procedures: number;
  };
  errors: Array<{
    resourceType: ResourceType;
    error: string;
  }>;
  durationMs: number;
}

/**
 * Aggressively pull all clinical data for a patient from FHIR server
 *
 * @param internalPatientId - Our internal patient ID
 * @param fhirPatientId - Patient ID on the FHIR server
 * @returns Pull result with counts and errors
 */
export async function aggressivePullPatientData(
  internalPatientId: string,
  fhirPatientId: string
): Promise<PullResult> {
  const startTime = Date.now();

  const result: PullResult = {
    success: false,
    patientId: internalPatientId,
    fhirPatientId,
    summary: {
      observations: 0,
      conditions: 0,
      medications: 0,
      procedures: 0,
    },
    errors: [],
    durationMs: 0,
  };

  logger.info({
    event: 'fhir_aggressive_pull_started',
    patientId: internalPatientId,
    fhirPatientId,
  });

  try {
    // Fetch all resource types in parallel for performance
    const [observations, conditions, medications, procedures] = await Promise.allSettled([
      fetchResources<FHIRObservation>('Observation', fhirPatientId),
      fetchResources<FHIRCondition>('Condition', fhirPatientId),
      fetchResources<FHIRMedicationStatement>('MedicationStatement', fhirPatientId),
      fetchResources<FHIRProcedure>('Procedure', fhirPatientId),
    ]);

    // Process Observations (Lab Results)
    if (observations.status === 'fulfilled') {
      result.summary.observations = await importObservations(
        internalPatientId,
        observations.value
      );
    } else {
      result.errors.push({
        resourceType: 'Observation',
        error: observations.reason?.message || 'Failed to fetch observations',
      });
      logger.error({
        event: 'fhir_pull_observation_failed',
        patientId: internalPatientId,
        error: observations.reason,
      });
    }

    // Process Conditions (Diagnoses)
    if (conditions.status === 'fulfilled') {
      result.summary.conditions = await importConditions(
        internalPatientId,
        conditions.value
      );
    } else {
      result.errors.push({
        resourceType: 'Condition',
        error: conditions.reason?.message || 'Failed to fetch conditions',
      });
      logger.error({
        event: 'fhir_pull_condition_failed',
        patientId: internalPatientId,
        error: conditions.reason,
      });
    }

    // Process MedicationStatements
    if (medications.status === 'fulfilled') {
      result.summary.medications = await importMedications(
        internalPatientId,
        medications.value
      );
    } else {
      result.errors.push({
        resourceType: 'MedicationStatement',
        error: medications.reason?.message || 'Failed to fetch medications',
      });
      logger.error({
        event: 'fhir_pull_medication_failed',
        patientId: internalPatientId,
        error: medications.reason,
      });
    }

    // Process Procedures
    if (procedures.status === 'fulfilled') {
      result.summary.procedures = await importProcedures(
        internalPatientId,
        procedures.value
      );
    } else {
      result.errors.push({
        resourceType: 'Procedure',
        error: procedures.reason?.message || 'Failed to fetch procedures',
      });
      logger.error({
        event: 'fhir_pull_procedure_failed',
        patientId: internalPatientId,
        error: procedures.reason,
      });
    }

    // Consider success if at least one resource type was imported
    result.success = Object.values(result.summary).some(count => count > 0);
    result.durationMs = Date.now() - startTime;

    logger.info({
      event: 'fhir_aggressive_pull_completed',
      patientId: internalPatientId,
      fhirPatientId,
      summary: result.summary,
      errorCount: result.errors.length,
      durationMs: result.durationMs,
      success: result.success,
    });

    // Track pull event for analytics
    await trackPullEvent(internalPatientId, result);

    return result;
  } catch (error: any) {
    result.durationMs = Date.now() - startTime;
    logger.error({
      event: 'fhir_aggressive_pull_fatal_error',
      patientId: internalPatientId,
      fhirPatientId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

// ============================================================================
// FHIR SERVER INTERACTION
// ============================================================================

/**
 * Fetch resources from FHIR server
 */
async function fetchResources<T>(
  resourceType: ResourceType,
  patientId: string
): Promise<T[]> {
  const url = `${FHIR_SERVER_BASE_URL}/${resourceType}?patient=${patientId}&_count=100`;

  const headers: Record<string, string> = {
    'Accept': 'application/fhir+json',
  };

  if (FHIR_AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${FHIR_AUTH_TOKEN}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`FHIR server returned ${response.status}: ${await response.text()}`);
  }

  const bundle: FHIRBundle = await response.json();

  if (!bundle.entry || bundle.entry.length === 0) {
    return [];
  }

  return bundle.entry.map(entry => entry.resource as T).filter(Boolean);
}

// ============================================================================
// IMPORT FUNCTIONS WITH DEDUPLICATION
// ============================================================================

/**
 * Import observations (lab results) with deduplication
 */
async function importObservations(
  patientId: string,
  observations: FHIRObservation[]
): Promise<number> {
  if (observations.length === 0) return 0;

  const labResults = observations.map(obs => fromFHIRObservation(obs, patientId));

  // Deduplicate by test name + date (prevent duplicate imports)
  const existingResults = await prisma.labResult.findMany({
    where: { patientId },
    select: { testName: true, sampleCollectedAt: true },
  });

  const existingSet = new Set(
    existingResults.map(r =>
      `${r.testName}:${r.sampleCollectedAt?.toISOString() || 'null'}`
    )
  );

  const newResults = labResults.filter(result => {
    const key = `${result.testName}:${result.sampleCollectedAt?.toISOString() || 'null'}`;
    return !existingSet.has(key);
  });

  if (newResults.length === 0) {
    logger.info({
      event: 'fhir_observations_already_imported',
      patientId,
      totalFetched: observations.length,
      alreadyExists: observations.length,
    });
    return 0;
  }

  // Batch create
  await prisma.labResult.createMany({
    data: newResults as any,
    skipDuplicates: true,
  });

  logger.info({
    event: 'fhir_observations_imported',
    patientId,
    imported: newResults.length,
    skippedDuplicates: observations.length - newResults.length,
  });

  return newResults.length;
}

/**
 * Import conditions (diagnoses) with deduplication
 */
async function importConditions(
  patientId: string,
  conditions: FHIRCondition[]
): Promise<number> {
  if (conditions.length === 0) return 0;

  const diagnoses = conditions.map(cond => fromFHIRCondition(cond, patientId));

  // Deduplicate by diagnosis description + onset date
  const existingDiagnoses = await prisma.diagnosis.findMany({
    where: { patientId },
    select: { description: true, onsetDate: true },
  });

  const existingSet = new Set(
    existingDiagnoses.map(d =>
      `${d.description}:${d.onsetDate?.toISOString() || 'null'}`
    )
  );

  const newDiagnoses = diagnoses.filter(diagnosis => {
    const key = `${diagnosis.description}:${diagnosis.onsetDate?.toISOString() || 'null'}`;
    return !existingSet.has(key);
  });

  if (newDiagnoses.length === 0) {
    logger.info({
      event: 'fhir_conditions_already_imported',
      patientId,
      totalFetched: conditions.length,
      alreadyExists: conditions.length,
    });
    return 0;
  }

  // Batch create
  await prisma.diagnosis.createMany({
    data: newDiagnoses as any,
    skipDuplicates: true,
  });

  logger.info({
    event: 'fhir_conditions_imported',
    patientId,
    imported: newDiagnoses.length,
    skippedDuplicates: conditions.length - newDiagnoses.length,
  });

  return newDiagnoses.length;
}

/**
 * Import medications with deduplication
 */
async function importMedications(
  patientId: string,
  medications: FHIRMedicationStatement[]
): Promise<number> {
  if (medications.length === 0) return 0;

  const meds = medications.map(med => fromFHIRMedicationStatement(med, patientId));

  // Deduplicate by medication name + start date
  const existingMeds = await prisma.medication.findMany({
    where: { patientId },
    select: { name: true, startDate: true },
  });

  const existingSet = new Set(
    existingMeds.map(m =>
      `${m.name}:${m.startDate?.toISOString() || 'null'}`
    )
  );

  const newMeds = meds.filter(medication => {
    const key = `${medication.name}:${medication.startDate?.toISOString() || 'null'}`;
    return !existingSet.has(key);
  });

  if (newMeds.length === 0) {
    logger.info({
      event: 'fhir_medications_already_imported',
      patientId,
      totalFetched: medications.length,
      alreadyExists: medications.length,
    });
    return 0;
  }

  // Batch create
  await prisma.medication.createMany({
    data: newMeds as any,
    skipDuplicates: true,
  });

  logger.info({
    event: 'fhir_medications_imported',
    patientId,
    imported: newMeds.length,
    skippedDuplicates: medications.length - newMeds.length,
  });

  return newMeds.length;
}

/**
 * Import procedures with deduplication
 * TODO: Add ProcedureRecord model to schema, then enable this function
 */
async function importProcedures(
  patientId: string,
  procedures: FHIRProcedure[]
): Promise<number> {
  if (procedures.length === 0) return 0;

  // TODO: Uncomment when ProcedureRecord model is added to schema
  logger.warn({
    event: 'fhir_procedures_import_skipped',
    reason: 'ProcedureRecord model not yet in schema',
    patientId,
    procedureCount: procedures.length,
  });

  return 0;

  /* Original code - requires ProcedureRecord model:
  const procs = procedures.map(proc => fromFHIRProcedure(proc, patientId));

  // Deduplicate by procedure name + performed date
  const existingProcs = await prisma.procedureRecord.findMany({
    where: { patientId },
    select: { procedureName: true, performedAt: true },
  });

  const existingSet = new Set(
    existingProcs.map((p: any) =>
      `${p.procedureName}:${p.performedAt?.toISOString() || 'null'}`
    )
  );

  const newProcs = procs.filter(procedure => {
    const key = `${procedure.procedureName}:${procedure.performedAt?.toISOString() || 'null'}`;
    return !existingSet.has(key);
  });

  if (newProcs.length === 0) {
    logger.info({
      event: 'fhir_procedures_already_imported',
      patientId,
      totalFetched: procedures.length,
      alreadyExists: procedures.length,
    });
    return 0;
  }

  // Batch create
  await prisma.procedureRecord.createMany({
    data: newProcs as any,
    skipDuplicates: true,
  });

  logger.info({
    event: 'fhir_procedures_imported',
    patientId,
    imported: newProcs.length,
    skippedDuplicates: procedures.length - newProcs.length,
  });

  return newProcs.length;
  */
}

// ============================================================================
// ANALYTICS TRACKING
// ============================================================================

/**
 * Track FHIR pull event for analytics
 * TODO: Add UserBehaviorEvent model to schema, then enable this function
 */
async function trackPullEvent(patientId: string, result: PullResult): Promise<void> {
  // TODO: Uncomment when UserBehaviorEvent model is added to schema
  logger.info({
    event: 'fhir_pull_analytics_skipped',
    reason: 'UserBehaviorEvent model not yet in schema',
    patientId,
    summary: result.summary,
  });

  /* Original code - requires UserBehaviorEvent model:
  try {
    await prisma.userBehaviorEvent.create({
      data: {
        userId: 'system',
        eventType: 'FHIR_AGGRESSIVE_PULL',
        metadata: {
          patientId,
          fhirPatientId: result.fhirPatientId,
          success: result.success,
          observations: result.summary.observations,
          conditions: result.summary.conditions,
          medications: result.summary.medications,
          procedures: result.summary.procedures,
          totalResources: Object.values(result.summary).reduce((a, b) => a + b, 0),
          errorCount: result.errors.length,
          errors: result.errors,
          durationMs: result.durationMs,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (error: any) {
    logger.error({
      event: 'fhir_pull_tracking_failed',
      error: error.message,
    });
  }
  */
}
