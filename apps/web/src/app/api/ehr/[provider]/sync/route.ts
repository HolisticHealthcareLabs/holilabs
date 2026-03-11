/**
 * EHR Sync API
 *
 * POST /api/ehr/[provider]/sync - Sync patient data from EHR
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
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

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
    const startTime = Date.now();
    const params = await Promise.resolve(context.params ?? {});
    const provider = params.provider;

    if (!VALID_PROVIDERS.includes(provider as EhrProviderId)) {
      return NextResponse.json(
        { success: false, error: `Invalid provider: ${provider}` },
        { status: 400 }
      );
    }

    const providerId = provider as EhrProviderId;
    const userId = context.user!.id;

    const body: SyncRequestBody = await request.json();
    const { localPatientId, resourceTypes = DEFAULT_RESOURCE_TYPES, since } = body;

    if (!localPatientId) {
      return NextResponse.json(
        { success: false, error: 'localPatientId is required' },
        { status: 400 }
      );
    }

    const localPatient = await prisma.patient.findFirst({
      where: {
        id: localPatientId,
        assignedClinicianId: userId,
      },
    });

    if (!localPatient) {
      return NextResponse.json(
        { success: false, error: 'Patient not found or access denied' },
        { status: 404 }
      );
    }

    const ehrSession = await getSmartSessionForUser(userId, providerId);
    if (!ehrSession) {
      return NextResponse.json(
        { success: false, error: `Not connected to ${providerId}` },
        { status: 400 }
      );
    }

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
      userId,
      localPatientId,
      patientFhirId,
      resourceTypes,
    });

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

    for (const resourceType of resourceTypes) {
      try {
        const count = await syncResourceType(
          ehrSession.id,
          resourceType,
          patientFhirId,
          localPatientId,
          userId,
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
      userId,
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
      if (error instanceof EhrApiError) {
        return NextResponse.json(
          {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            fhirError: error.fhirOperationOutcome,
          },
          { status: error.statusCode || 500 }
        );
      }
      throw error;
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
  }
);

async function syncResourceType(
  sessionId: string,
  resourceType: SyncResourceType,
  patientFhirId: string,
  localPatientId: string,
  userId: string,
  since?: string
): Promise<number> {
  const params: Record<string, string> = {
    patient: patientFhirId,
    _count: '100',
  };

  if (since) {
    params._lastUpdated = `ge${since}`;
  }

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

async function syncObservation(
  observation: any,
  localPatientId: string
): Promise<void> {
  const labResult = fromFHIRObservation(observation, localPatientId);
  if (!labResult || !labResult.testName) return;

  const existing = await prisma.labResult.findFirst({
    where: {
      patientId: localPatientId,
      testName: labResult.testName,
      sampleCollectedAt: labResult.sampleCollectedAt,
    },
  });

  if (existing) return;

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

async function syncCondition(
  condition: any,
  localPatientId: string
): Promise<void> {
  const diagnosis = fromFHIRCondition(condition, localPatientId);
  if (!diagnosis || !diagnosis.description) return;

  const existing = await prisma.diagnosis.findFirst({
    where: {
      patientId: localPatientId,
      description: diagnosis.description,
      onsetDate: diagnosis.onsetDate,
    },
  });

  if (existing) return;

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

async function syncMedication(
  resource: any,
  localPatientId: string
): Promise<void> {
  const medication = fromFHIRMedicationStatement(resource, localPatientId);
  if (!medication || !medication.name) return;

  const existing = await prisma.medication.findFirst({
    where: {
      patientId: localPatientId,
      name: medication.name,
      startDate: medication.startDate,
    },
  });

  if (existing) return;

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

async function syncAllergy(
  allergyIntolerance: any,
  localPatientId: string,
  userId: string
): Promise<void> {
  const allergyName =
    allergyIntolerance.code?.text ||
    allergyIntolerance.code?.coding?.[0]?.display ||
    'Unknown Allergy';

  const existing = await prisma.allergy.findFirst({
    where: {
      patientId: localPatientId,
      allergen: allergyName,
    },
  });

  if (existing) return;

  let severity: 'MILD' | 'MODERATE' | 'SEVERE' = 'MODERATE';
  if (allergyIntolerance.criticality === 'high') {
    severity = 'SEVERE';
  } else if (allergyIntolerance.criticality === 'low') {
    severity = 'MILD';
  }

  const category = allergyIntolerance.category?.[0];
  let allergyType: 'MEDICATION' | 'FOOD' | 'ENVIRONMENTAL' | 'OTHER' = 'OTHER';
  if (category === 'medication') allergyType = 'MEDICATION';
  else if (category === 'food') allergyType = 'FOOD';
  else if (category === 'environment') allergyType = 'ENVIRONMENTAL';

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
