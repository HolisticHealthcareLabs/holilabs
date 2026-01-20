/**
 * EHR Sync API
 *
 * POST /api/ehr/[provider]/sync - Sync patient data from EHR
 *
 * Request Body:
 * - patientFhirId: FHIR ID of patient in EHR (optional, uses context if available)
 * - localPatientId: Local patient ID to sync to
 * - resourceTypes: Array of resource types to sync (optional, defaults to all)
 * - since: ISO date for incremental sync (optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import {
  getSmartSessionForUser,
  fetchFhirResource,
  EhrProviderId,
  EhrSyncResult,
  SyncResourceType,
  EhrApiError,
} from '@/lib/ehr';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import logger from '@/lib/logger';
import {
  fromFHIRObservation,
  fromFHIRCondition,
  fromFHIRMedicationStatement,
} from '@/lib/fhir/resource-mappers';

export const dynamic = 'force-dynamic';

const VALID_PROVIDERS: EhrProviderId[] = ['epic', 'cerner', 'athena', 'medplum'];

const DEFAULT_RESOURCE_TYPES: SyncResourceType[] = [
  'Observation',
  'Condition',
  'MedicationStatement',
  'MedicationRequest',
  'AllergyIntolerance',
];

interface SyncRequestBody {
  patientFhirId?: string;
  localPatientId: string;
  resourceTypes?: SyncResourceType[];
  since?: string;
}

export async function POST(
  request: NextRequest,
  context: any
) {
  const startTime = Date.now();

  try {
    const { provider } = await context.params;

    // Validate provider
    if (!VALID_PROVIDERS.includes(provider as EhrProviderId)) {
      return NextResponse.json(
        { success: false, error: `Invalid provider: ${provider}` },
        { status: 400 }
      );
    }

    const providerId = provider as EhrProviderId;

    // Require authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: SyncRequestBody = await request.json();
    const { localPatientId, resourceTypes = DEFAULT_RESOURCE_TYPES, since } = body;

    if (!localPatientId) {
      return NextResponse.json(
        { success: false, error: 'localPatientId is required' },
        { status: 400 }
      );
    }

    // Verify local patient exists and user has access
    const localPatient = await prisma.patient.findFirst({
      where: {
        id: localPatientId,
        assignedClinicianId: session.user.id,
      },
    });

    if (!localPatient) {
      return NextResponse.json(
        { success: false, error: 'Patient not found or access denied' },
        { status: 404 }
      );
    }

    // Get EHR session
    const ehrSession = await getSmartSessionForUser(session.user.id, providerId);
    if (!ehrSession) {
      return NextResponse.json(
        { success: false, error: `Not connected to ${providerId}` },
        { status: 400 }
      );
    }

    // Determine patient FHIR ID
    const patientFhirId = body.patientFhirId || ehrSession.patientFhirId;
    if (!patientFhirId) {
      return NextResponse.json(
        { success: false, error: 'patientFhirId is required (no patient context from EHR launch)' },
        { status: 400 }
      );
    }

    logger.info({
      event: 'ehr_sync_started',
      providerId,
      userId: session.user.id,
      localPatientId,
      patientFhirId,
      resourceTypes,
    });

    // Initialize result
    const result: EhrSyncResult = {
      success: true,
      providerId,
      patientFhirId,
      localPatientId,
      resourceCounts: {},
      errors: [],
      duration: 0,
      syncedAt: new Date(),
    };

    // Sync each resource type
    for (const resourceType of resourceTypes) {
      try {
        const count = await syncResourceType(
          ehrSession.id,
          resourceType,
          patientFhirId,
          localPatientId,
          session.user.id,
          since
        );
        result.resourceCounts[resourceType] = count;
      } catch (error) {
        result.errors.push({
          resourceType,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        logger.warn({
          event: 'ehr_sync_resource_error',
          providerId,
          resourceType,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    result.duration = Date.now() - startTime;
    result.success = result.errors.length === 0;

    // Audit log
    await createAuditLog({
      action: 'CREATE',
      resource: 'EhrSync',
      resourceId: localPatientId,
      details: {
        providerId,
        patientFhirId,
        localPatientId,
        resourceTypes,
        resourceCounts: result.resourceCounts,
        errorsCount: result.errors.length,
        duration: result.duration,
        accessType: 'EHR_PATIENT_SYNC',
      },
      success: result.success,
    });

    logger.info({
      event: 'ehr_sync_completed',
      providerId,
      userId: session.user.id,
      localPatientId,
      patientFhirId,
      duration: result.duration,
      resourceCounts: result.resourceCounts,
      errorsCount: result.errors.length,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error({
      event: 'ehr_sync_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof EhrApiError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          fhirError: error.fhirOperationOutcome,
        },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to sync data' },
      { status: 500 }
    );
  }
}

/**
 * Sync a specific resource type from EHR
 */
async function syncResourceType(
  sessionId: string,
  resourceType: SyncResourceType,
  patientFhirId: string,
  localPatientId: string,
  userId: string,
  since?: string
): Promise<number> {
  // Build search parameters
  const params: Record<string, string> = {
    patient: patientFhirId,
    _count: '100',
  };

  if (since) {
    params._lastUpdated = `ge${since}`;
  }

  // Fetch resources from EHR
  const bundle = await fetchFhirResource<any>(
    sessionId,
    resourceType,
    undefined,
    params
  );

  if (!bundle.entry || bundle.entry.length === 0) {
    return 0;
  }

  let syncedCount = 0;

  // Process each resource
  for (const entry of bundle.entry) {
    const resource = entry.resource;
    if (!resource) continue;

    try {
      switch (resourceType) {
        case 'Observation':
          await syncObservation(resource, localPatientId);
          syncedCount++;
          break;

        case 'Condition':
          await syncCondition(resource, localPatientId);
          syncedCount++;
          break;

        case 'MedicationStatement':
        case 'MedicationRequest':
          await syncMedication(resource, localPatientId);
          syncedCount++;
          break;

        case 'AllergyIntolerance':
          await syncAllergy(resource, localPatientId, userId);
          syncedCount++;
          break;

        // Add more resource types as needed
        default:
          logger.debug({
            event: 'ehr_sync_unsupported_type',
            resourceType,
          });
      }
    } catch (error) {
      logger.warn({
        event: 'ehr_sync_resource_error',
        resourceType,
        resourceId: resource.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return syncedCount;
}

/**
 * Sync Observation to LabResult
 */
async function syncObservation(
  observation: any,
  localPatientId: string
): Promise<void> {
  const labResult = fromFHIRObservation(observation, localPatientId);
  if (!labResult || !labResult.testName) return;

  // Check for duplicates
  const existing = await prisma.labResult.findFirst({
    where: {
      patientId: localPatientId,
      testName: labResult.testName,
      sampleCollectedAt: labResult.sampleCollectedAt,
    },
  });

  if (existing) return; // Skip duplicates

  await prisma.labResult.create({
    data: {
      patientId: localPatientId,
      testName: labResult.testName || 'Unknown Test',
      value: labResult.value || null,
      unit: labResult.unit || null,
      referenceRange: labResult.referenceRange || null,
      status: labResult.status || 'FINAL',
      sampleCollectedAt: labResult.sampleCollectedAt || null,
      resultDate: labResult.sampleCollectedAt || new Date(),
      isAbnormal: labResult.isAbnormal || false,
      isCritical: labResult.isCritical || false,
    },
  });
}

/**
 * Sync Condition to Diagnosis
 */
async function syncCondition(
  condition: any,
  localPatientId: string
): Promise<void> {
  const diagnosis = fromFHIRCondition(condition, localPatientId);
  if (!diagnosis || !diagnosis.description) return;

  // Check for duplicates
  const existing = await prisma.diagnosis.findFirst({
    where: {
      patientId: localPatientId,
      description: diagnosis.description,
      onsetDate: diagnosis.onsetDate,
    },
  });

  if (existing) return; // Skip duplicates

  await prisma.diagnosis.create({
    data: {
      patientId: localPatientId,
      icd10Code: diagnosis.icd10Code || 'UNKNOWN',
      description: diagnosis.description,
      snomedCode: diagnosis.snomedCode,
      severity: diagnosis.severity,
      onsetDate: diagnosis.onsetDate,
      diagnosedAt: new Date(),
      status: diagnosis.status || 'ACTIVE',
    },
  });
}

/**
 * Sync MedicationStatement/MedicationRequest to Medication
 */
async function syncMedication(
  resource: any,
  localPatientId: string
): Promise<void> {
  const medication = fromFHIRMedicationStatement(resource, localPatientId);
  if (!medication || !medication.name) return;

  // Check for duplicates
  const existing = await prisma.medication.findFirst({
    where: {
      patientId: localPatientId,
      name: medication.name,
      startDate: medication.startDate,
    },
  });

  if (existing) return; // Skip duplicates

  await prisma.medication.create({
    data: {
      patientId: localPatientId,
      name: medication.name,
      dose: medication.dose || 'As directed',
      frequency: medication.frequency || 'As directed',
      route: medication.route,
      startDate: medication.startDate || new Date(),
      endDate: medication.endDate,
      isActive: true,
    },
  });
}

/**
 * Sync AllergyIntolerance to Allergy
 */
async function syncAllergy(
  allergyIntolerance: any,
  localPatientId: string,
  userId: string
): Promise<void> {
  // Extract allergy name
  const allergyName =
    allergyIntolerance.code?.text ||
    allergyIntolerance.code?.coding?.[0]?.display ||
    'Unknown Allergy';

  // Check for duplicates
  const existing = await prisma.allergy.findFirst({
    where: {
      patientId: localPatientId,
      allergen: allergyName,
    },
  });

  if (existing) return; // Skip duplicates

  // Extract severity
  let severity: 'MILD' | 'MODERATE' | 'SEVERE' = 'MODERATE';
  if (allergyIntolerance.criticality === 'high') {
    severity = 'SEVERE';
  } else if (allergyIntolerance.criticality === 'low') {
    severity = 'MILD';
  }

  // Determine allergy type based on category
  const category = allergyIntolerance.category?.[0];
  let allergyType: 'MEDICATION' | 'FOOD' | 'ENVIRONMENTAL' | 'OTHER' = 'OTHER';
  if (category === 'medication') allergyType = 'MEDICATION';
  else if (category === 'food') allergyType = 'FOOD';
  else if (category === 'environment') allergyType = 'ENVIRONMENTAL';

  // Extract reactions as array
  const reactions: string[] = allergyIntolerance.reaction
    ?.flatMap((r: any) =>
      r.manifestation?.map((m: any) => m.text || m.coding?.[0]?.display).filter(Boolean)
    ) || [];

  await prisma.allergy.create({
    data: {
      patientId: localPatientId,
      allergen: allergyName,
      allergyType,
      severity,
      reactions,
      onsetDate: allergyIntolerance.onsetDateTime
        ? new Date(allergyIntolerance.onsetDateTime)
        : null,
      createdBy: userId,
    },
  });
}
