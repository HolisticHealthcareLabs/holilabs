/**
 * FHIR Ingress Route
 * Receives FHIR resources from external EHRs and transforms them into Holi's data model
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type {
  Observation as FHIRObservation,
  Encounter as FHIREncounter,
  Patient as FHIRPatient,
} from '@medplum/fhirtypes';
import { prisma } from '../index';

/**
 * Logging utilities
 */
function log(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    service: 'fhir-ingress',
    message,
    ...context,
  };
  console[level === 'error' ? 'error' : 'log'](JSON.stringify(logEntry));
}

/**
 * FHIR Resource Validation Schemas
 */

const fhirObservationSchema = z.object({
  resourceType: z.literal('Observation'),
  id: z.string(),
  status: z.enum(['registered', 'preliminary', 'final', 'amended', 'corrected', 'cancelled']),
  code: z.object({
    coding: z.array(
      z.object({
        system: z.string().url(),
        code: z.string(),
        display: z.string().optional(),
      })
    ),
  }),
  subject: z.object({
    reference: z.string(), // e.g., "Patient/pt_abc123"
  }),
  encounter: z
    .object({
      reference: z.string(), // e.g., "Encounter/enc_xyz789"
    })
    .optional(),
  effectiveDateTime: z.string(),
  valueQuantity: z
    .object({
      value: z.number(),
      unit: z.string().optional(),
      system: z.string().url().optional(),
      code: z.string().optional(),
    })
    .optional(),
  valueString: z.string().optional(),
  valueBoolean: z.boolean().optional(),
});

const fhirEncounterSchema = z.object({
  resourceType: z.literal('Encounter'),
  id: z.string(),
  status: z.enum(['planned', 'in-progress', 'finished', 'cancelled', 'entered-in-error']),
  class: z.object({
    system: z.string().url().optional(),
    code: z.string(),
  }),
  subject: z.object({
    reference: z.string(), // e.g., "Patient/pt_abc123"
  }),
  period: z
    .object({
      start: z.string().optional(),
      end: z.string().optional(),
    })
    .optional(),
  reasonCode: z
    .array(
      z.object({
        coding: z.array(
          z.object({
            system: z.string().url().optional(),
            code: z.string(),
            display: z.string().optional(),
          })
        ),
      })
    )
    .optional(),
  location: z
    .array(
      z.object({
        location: z.object({
          display: z.string().optional(),
        }),
      })
    )
    .optional(),
});

/**
 * Batch ingestion schema (for bulk imports)
 */
const fhirBundleSchema = z.object({
  resourceType: z.literal('Bundle'),
  type: z.enum(['transaction', 'batch', 'collection']),
  entry: z.array(
    z.object({
      resource: z.union([fhirObservationSchema, fhirEncounterSchema]),
    })
  ),
});

/**
 * Authentication middleware
 */
async function authenticateIngressRequest(request: any): Promise<{ orgId: string }> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }

  // TODO: Implement proper JWT validation
  // For now, we'll extract orgId from a custom header
  const orgId = request.headers['x-org-id'];
  if (!orgId) {
    throw new Error('Missing X-Org-ID header');
  }

  // Verify org exists
  const org = await prisma.org.findUnique({ where: { id: orgId } });
  if (!org) {
    throw new Error(`Organization ${orgId} not found`);
  }

  return { orgId };
}

/**
 * Ingest FHIR Observation
 */
async function ingestObservation(
  fhirObs: FHIRObservation,
  orgId: string
): Promise<{ success: boolean; holiId?: string; error?: string }> {
  const correlationId = `ingress-obs-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  try {
    log('info', 'Ingesting FHIR Observation', {
      correlationId,
      fhirId: fhirObs.id,
      orgId,
    });

    // Extract patient reference
    const patientRef = fhirObs.subject?.reference?.split('/')[1];
    if (!patientRef) {
      throw new Error('Observation missing subject reference');
    }

    // Resolve patient token
    const patientToken = await prisma.patientToken.findUnique({
      where: { id: patientRef },
    });
    if (!patientToken) {
      throw new Error(`Patient token not found: ${patientRef}`);
    }

    // Check for duplicate (by FHIR resource ID)
    const existing = await prisma.observation.findUnique({
      where: { fhirResourceId: fhirObs.id },
    });
    if (existing) {
      log('warn', 'Observation already exists, skipping', {
        correlationId,
        fhirId: fhirObs.id,
        holiId: existing.id,
      });
      return { success: true, holiId: existing.id };
    }

    // Extract encounter reference (if present)
    let encounterId: string | undefined;
    if (fhirObs.encounter?.reference) {
      const encounterRef = fhirObs.encounter.reference.split('/')[1];
      const encounter = await prisma.encounter.findFirst({
        where: {
          OR: [{ id: encounterRef }, { fhirResourceId: encounterRef }],
        },
      });
      encounterId = encounter?.id;
    }

    // Extract code (prefer LOINC)
    const loincCoding = fhirObs.code.coding.find((c) => c.system?.includes('loinc.org'));
    const coding = loincCoding || fhirObs.code.coding[0];

    // Transform to Holi model
    const observation = await prisma.observation.create({
      data: {
        orgId,
        patientTokenId: patientToken.id,
        encounterId,
        code: coding.code,
        codeSystem: coding.system || 'http://loinc.org',
        display: coding.display || coding.code,
        valueQuantity: fhirObs.valueQuantity?.value ? String(fhirObs.valueQuantity.value) : null,
        valueUnit: fhirObs.valueQuantity?.unit,
        valueString: fhirObs.valueString,
        valueBoolean: fhirObs.valueBoolean,
        effectiveDateTime: new Date(fhirObs.effectiveDateTime!),
        fhirResourceId: fhirObs.id,
        fhirSyncEnabled: false, // Don't sync back to source
      },
    });

    // Audit ingress
    await prisma.auditEvent.create({
      data: {
        orgId,
        eventType: 'FHIR_INGRESS',
        payload: {
          correlationId,
          resourceType: 'Observation',
          externalId: fhirObs.id,
          holiId: observation.id,
          source: 'external',
        },
      },
    });

    log('info', 'Observation ingested successfully', {
      correlationId,
      fhirId: fhirObs.id,
      holiId: observation.id,
    });

    return { success: true, holiId: observation.id };
  } catch (error) {
    log('error', 'Observation ingestion failed', {
      correlationId,
      fhirId: fhirObs.id,
      error: (error as Error).message,
    });
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Ingest FHIR Encounter
 */
async function ingestEncounter(
  fhirEnc: FHIREncounter,
  orgId: string
): Promise<{ success: boolean; holiId?: string; error?: string }> {
  const correlationId = `ingress-enc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  try {
    log('info', 'Ingesting FHIR Encounter', {
      correlationId,
      fhirId: fhirEnc.id,
      orgId,
    });

    // Extract patient reference
    const patientRef = fhirEnc.subject?.reference?.split('/')[1];
    if (!patientRef) {
      throw new Error('Encounter missing subject reference');
    }

    // Resolve patient token
    const patientToken = await prisma.patientToken.findUnique({
      where: { id: patientRef },
    });
    if (!patientToken) {
      throw new Error(`Patient token not found: ${patientRef}`);
    }

    // Check for duplicate
    const existing = await prisma.encounter.findUnique({
      where: { fhirResourceId: fhirEnc.id },
    });
    if (existing) {
      log('warn', 'Encounter already exists, skipping', {
        correlationId,
        fhirId: fhirEnc.id,
        holiId: existing.id,
      });
      return { success: true, holiId: existing.id };
    }

    // Map FHIR status to Holi status
    const statusMap: Record<string, string> = {
      'planned': 'PLANNED',
      'in-progress': 'IN_PROGRESS',
      'finished': 'FINISHED',
      'cancelled': 'CANCELLED',
      'entered-in-error': 'ENTERED_IN_ERROR',
    };

    // Map FHIR class code to Holi type
    const typeMap: Record<string, string> = {
      'AMB': 'OFFICE_VISIT',
      'EMER': 'EMERGENCY',
      'VR': 'TELEHEALTH',
      'HH': 'HOME_HEALTH',
    };

    const status = statusMap[fhirEnc.status] || 'PLANNED';
    const type = typeMap[fhirEnc.class.code] || 'OFFICE_VISIT';

    // Extract reason code (if present)
    const reasonCoding = fhirEnc.reasonCode?.[0]?.coding?.[0];

    // Transform to Holi model
    const encounter = await prisma.encounter.create({
      data: {
        orgId,
        patientTokenId: patientToken.id,
        status: status as any,
        type: type as any,
        reasonCode: reasonCoding?.code,
        reasonDisplay: reasonCoding?.display,
        start: fhirEnc.period?.start ? new Date(fhirEnc.period.start) : null,
        end: fhirEnc.period?.end ? new Date(fhirEnc.period.end) : null,
        locationDisplay: fhirEnc.location?.[0]?.location?.display,
        fhirResourceId: fhirEnc.id,
        fhirSyncEnabled: false, // Don't sync back to source
      },
    });

    // Audit ingress
    await prisma.auditEvent.create({
      data: {
        orgId,
        eventType: 'FHIR_INGRESS',
        payload: {
          correlationId,
          resourceType: 'Encounter',
          externalId: fhirEnc.id,
          holiId: encounter.id,
          source: 'external',
        },
      },
    });

    log('info', 'Encounter ingested successfully', {
      correlationId,
      fhirId: fhirEnc.id,
      holiId: encounter.id,
    });

    return { success: true, holiId: encounter.id };
  } catch (error) {
    log('error', 'Encounter ingestion failed', {
      correlationId,
      fhirId: fhirEnc.id,
      error: (error as Error).message,
    });
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Routes
 */
const fhirIngressRoutes: FastifyPluginAsync = async (server) => {
  /**
   * Health check
   */
  server.get('/health', async () => {
    return { status: 'ok', service: 'fhir-ingress' };
  });

  /**
   * Ingest single FHIR Observation
   */
  server.post('/observation', async (request, reply) => {
    try {
      const { orgId } = await authenticateIngressRequest(request);

      const fhirObs = fhirObservationSchema.parse(request.body);
      const result = await ingestObservation(fhirObs, orgId);

      if (result.success) {
        return reply.code(201).send({
          success: true,
          resourceType: 'Observation',
          id: result.holiId,
        });
      } else {
        return reply.code(400).send({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  /**
   * Ingest single FHIR Encounter
   */
  server.post('/encounter', async (request, reply) => {
    try {
      const { orgId } = await authenticateIngressRequest(request);

      const fhirEnc = fhirEncounterSchema.parse(request.body);
      const result = await ingestEncounter(fhirEnc, orgId);

      if (result.success) {
        return reply.code(201).send({
          success: true,
          resourceType: 'Encounter',
          id: result.holiId,
        });
      } else {
        return reply.code(400).send({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  /**
   * Batch ingest (FHIR Bundle)
   */
  server.post('/batch', async (request, reply) => {
    try {
      const { orgId } = await authenticateIngressRequest(request);

      const bundle = fhirBundleSchema.parse(request.body);
      const results: Array<{ resourceType: string; id?: string; success: boolean; error?: string }> = [];

      for (const entry of bundle.entry) {
        const resource = entry.resource;

        if (resource.resourceType === 'Observation') {
          const result = await ingestObservation(resource, orgId);
          results.push({
            resourceType: 'Observation',
            id: result.holiId,
            success: result.success,
            error: result.error,
          });
        } else if (resource.resourceType === 'Encounter') {
          const result = await ingestEncounter(resource, orgId);
          results.push({
            resourceType: 'Encounter',
            id: result.holiId,
            success: result.success,
            error: result.error,
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      return reply.code(200).send({
        success: failureCount === 0,
        total: results.length,
        succeeded: successCount,
        failed: failureCount,
        results,
      });
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: (error as Error).message,
      });
    }
  });
};

export default fhirIngressRoutes;
