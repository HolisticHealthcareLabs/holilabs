/**
 * FHIR Export Routes
 * Patient-scoped FHIR Bundle export with RBAC authorization
 * Implements FHIR $everything operation for comprehensive patient data retrieval
 */

import type { FastifyPluginAsync } from 'fastify';
import type { Bundle } from '@medplum/fhirtypes';
import { prisma } from '../index';
import { fetchPatientEverything } from '../services/fhir-sync-enhanced';

/**
 * Logging utilities
 */
function log(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    service: 'fhir-export',
    message,
    ...context,
  };
  console[level === 'error' ? 'error' : 'log'](JSON.stringify(logEntry));
}

/**
 * RBAC Roles
 */
enum UserRole {
  PATIENT = 'PATIENT',
  CLINICIAN = 'CLINICIAN',
  ADMIN = 'ADMIN',
  RESEARCHER = 'RESEARCHER',
}

/**
 * Authorization context
 */
interface AuthContext {
  userId: string;
  orgId: string;
  role: UserRole;
  patientTokenId?: string; // For PATIENT role, this is their own token
}

/**
 * Authentication middleware
 * TODO: Replace with proper JWT validation
 */
async function authenticateUser(request: any): Promise<AuthContext> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }

  // TODO: Implement proper JWT validation
  const userId = request.headers['x-user-id'];
  const orgId = request.headers['x-org-id'];
  const role = request.headers['x-role'] as UserRole;
  const patientTokenId = request.headers['x-patient-token-id'];

  if (!userId || !orgId || !role) {
    throw new Error('Missing user context headers');
  }

  if (!Object.values(UserRole).includes(role)) {
    throw new Error(`Invalid role: ${role}`);
  }

  return { userId, orgId, role, patientTokenId };
}

/**
 * RBAC authorization for patient data access
 */
async function authorizePatientAccess(
  auth: AuthContext,
  patientTokenId: string
): Promise<{ authorized: boolean; reason?: string }> {
  const correlationId = `authz-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  log('info', 'Checking patient data access authorization', {
    correlationId,
    userId: auth.userId,
    role: auth.role,
    requestedPatientTokenId: patientTokenId,
  });

  try {
    // Rule 1: ADMINs can access all patients in their org
    if (auth.role === UserRole.ADMIN) {
      const patientToken = await prisma.patientToken.findUnique({
        where: { id: patientTokenId },
      });

      if (!patientToken) {
        return { authorized: false, reason: 'Patient token not found' };
      }

      if (patientToken.orgId !== auth.orgId) {
        return { authorized: false, reason: 'Patient belongs to different organization' };
      }

      log('info', 'ADMIN access granted', { correlationId, patientTokenId });
      return { authorized: true };
    }

    // Rule 2: PATIENTs can only access their own data
    if (auth.role === UserRole.PATIENT) {
      if (auth.patientTokenId !== patientTokenId) {
        log('warn', 'PATIENT attempted to access other patient data', {
          correlationId,
          ownTokenId: auth.patientTokenId,
          requestedTokenId: patientTokenId,
        });
        return { authorized: false, reason: 'Patients can only access their own data' };
      }

      log('info', 'PATIENT self-access granted', { correlationId, patientTokenId });
      return { authorized: true };
    }

    // Rule 3: CLINICIANs can access patients they have active encounters with
    if (auth.role === UserRole.CLINICIAN) {
      const activeEncounter = await prisma.encounter.findFirst({
        where: {
          patientTokenId,
          orgId: auth.orgId,
          status: {
            in: ['PLANNED', 'IN_PROGRESS'],
          },
          // TODO: Add clinicianId field to Encounter model
          // clinicianId: auth.userId,
        },
      });

      if (!activeEncounter) {
        log('warn', 'CLINICIAN has no active encounter with patient', {
          correlationId,
          clinicianId: auth.userId,
          patientTokenId,
        });
        return { authorized: false, reason: 'No active encounter with this patient' };
      }

      log('info', 'CLINICIAN access granted via active encounter', {
        correlationId,
        encounterId: activeEncounter.id,
        patientTokenId,
      });
      return { authorized: true };
    }

    // Rule 4: RESEARCHERs can only access de-identified data
    if (auth.role === UserRole.RESEARCHER) {
      log('warn', 'RESEARCHER attempted to access identified patient data', {
        correlationId,
        userId: auth.userId,
      });
      return {
        authorized: false,
        reason: 'Researchers can only access de-identified datasets via bulk export API',
      };
    }

    return { authorized: false, reason: 'Unknown role' };
  } catch (error) {
    log('error', 'Authorization check failed', {
      correlationId,
      error: (error as Error).message,
    });
    return { authorized: false, reason: 'Authorization check failed' };
  }
}

/**
 * Consent validation for FHIR export
 */
async function validateConsent(
  patientTokenId: string,
  orgId: string
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const consent = await prisma.consent.findFirst({
      where: {
        patientTokenId,
        orgId,
        purpose: 'CARE',
        state: 'ACTIVE',
      },
    });

    if (!consent) {
      return { valid: false, reason: 'No active CARE consent found' };
    }

    // Check if consent includes required data classes
    const requiredClasses = ['CLINICAL_NOTES', 'LAB_RESULTS', 'MEDICATIONS'];
    const missingClasses = requiredClasses.filter((cls) => !consent.dataClasses.includes(cls));

    if (missingClasses.length > 0) {
      return {
        valid: false,
        reason: `Consent missing data classes: ${missingClasses.join(', ')}`,
      };
    }

    return { valid: true };
  } catch (error) {
    log('error', 'Consent validation failed', {
      error: (error as Error).message,
      patientTokenId,
    });
    return { valid: false, reason: 'Consent validation error' };
  }
}

/**
 * Filter Bundle resources by date range
 */
function filterBundleByDate(bundle: Bundle, startDate?: Date, endDate?: Date): Bundle {
  if (!startDate && !endDate) {
    return bundle;
  }

  const filteredEntries = bundle.entry?.filter((entry) => {
    const resource = entry.resource;
    if (!resource) return false;

    // Extract date from resource based on type
    let resourceDate: Date | undefined;

    switch (resource.resourceType) {
      case 'Encounter':
        resourceDate = resource.period?.start ? new Date(resource.period.start) : undefined;
        break;
      case 'Observation':
        resourceDate = resource.effectiveDateTime ? new Date(resource.effectiveDateTime) : undefined;
        break;
      case 'Condition':
        resourceDate = resource.recordedDate ? new Date(resource.recordedDate) : undefined;
        break;
      case 'MedicationRequest':
        resourceDate = resource.authoredOn ? new Date(resource.authoredOn) : undefined;
        break;
      default:
        // Include Patient and other resources by default
        return true;
    }

    if (!resourceDate) return true; // Include if no date

    if (startDate && resourceDate < startDate) return false;
    if (endDate && resourceDate > endDate) return false;

    return true;
  });

  return {
    ...bundle,
    entry: filteredEntries,
    total: filteredEntries?.length || 0,
  };
}

/**
 * Filter Bundle resources by resource type
 */
function filterBundleByType(bundle: Bundle, types: string[]): Bundle {
  if (types.length === 0) {
    return bundle;
  }

  const filteredEntries = bundle.entry?.filter((entry) => {
    const resource = entry.resource;
    return resource && types.includes(resource.resourceType);
  });

  return {
    ...bundle,
    entry: filteredEntries,
    total: filteredEntries?.length || 0,
  };
}

/**
 * Routes
 */
const fhirExportRoutes: FastifyPluginAsync = async (server) => {
  /**
   * Health check
   */
  server.get('/health', async () => {
    return { status: 'ok', service: 'fhir-export' };
  });

  /**
   * Patient $everything operation
   * Returns comprehensive FHIR Bundle with all patient-related resources
   *
   * FHIR Spec: https://www.hl7.org/fhir/patient-operation-everything.html
   */
  server.get('/patient/:patientTokenId/$everything', async (request, reply) => {
    const correlationId = `export-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      // Extract parameters
      const { patientTokenId } = request.params as { patientTokenId: string };
      const query = request.query as any;

      const startDate = query.start ? new Date(query.start) : undefined;
      const endDate = query.end ? new Date(query.end) : undefined;
      const resourceTypes = query.type ? (Array.isArray(query.type) ? query.type : [query.type]) : [];

      log('info', 'FHIR export request received', {
        correlationId,
        patientTokenId,
        startDate,
        endDate,
        resourceTypes,
      });

      // Step 1: Authenticate user
      const auth = await authenticateUser(request);

      log('info', 'User authenticated', {
        correlationId,
        userId: auth.userId,
        role: auth.role,
      });

      // Step 2: Authorize patient access (RBAC)
      const authz = await authorizePatientAccess(auth, patientTokenId);
      if (!authz.authorized) {
        log('warn', 'Authorization denied', {
          correlationId,
          userId: auth.userId,
          patientTokenId,
          reason: authz.reason,
        });

        return reply.code(403).send({
          success: false,
          error: authz.reason || 'Access denied',
        });
      }

      // Step 3: Validate consent
      const consentCheck = await validateConsent(patientTokenId, auth.orgId);
      if (!consentCheck.valid) {
        log('warn', 'Consent validation failed', {
          correlationId,
          patientTokenId,
          reason: consentCheck.reason,
        });

        return reply.code(403).send({
          success: false,
          error: consentCheck.reason || 'Consent not granted',
        });
      }

      // Step 4: Verify patient token exists
      const patientToken = await prisma.patientToken.findUnique({
        where: { id: patientTokenId },
        include: {
          org: true,
        },
      });

      if (!patientToken) {
        log('warn', 'Patient token not found', {
          correlationId,
          patientTokenId,
        });

        return reply.code(404).send({
          success: false,
          error: 'Patient not found',
        });
      }

      // Step 5: Fetch FHIR Bundle from Medplum
      log('info', 'Fetching FHIR Bundle from Medplum', {
        correlationId,
        patientTokenId,
      });

      const bundle = await fetchPatientEverything(patientTokenId, {
        correlationId,
        operation: 'export',
      });

      if (!bundle) {
        log('error', 'Failed to fetch FHIR Bundle', {
          correlationId,
          patientTokenId,
        });

        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch patient data from FHIR server',
        });
      }

      // Step 6: Apply filters
      let filteredBundle = bundle;

      if (startDate || endDate) {
        filteredBundle = filterBundleByDate(filteredBundle, startDate, endDate);
        log('info', 'Applied date filter', {
          correlationId,
          originalCount: bundle.total,
          filteredCount: filteredBundle.total,
        });
      }

      if (resourceTypes.length > 0) {
        filteredBundle = filterBundleByType(filteredBundle, resourceTypes);
        log('info', 'Applied resource type filter', {
          correlationId,
          types: resourceTypes,
          filteredCount: filteredBundle.total,
        });
      }

      // Step 7: Audit export
      await prisma.auditEvent.create({
        data: {
          orgId: auth.orgId,
          eventType: 'FHIR_EXPORT',
          payload: {
            correlationId,
            userId: auth.userId,
            userRole: auth.role,
            patientTokenId,
            resourceCount: filteredBundle.total,
            resourceTypes: resourceTypes.length > 0 ? resourceTypes : 'all',
            dateRange: {
              start: startDate?.toISOString(),
              end: endDate?.toISOString(),
            },
          },
        },
      });

      log('info', 'FHIR export completed successfully', {
        correlationId,
        patientTokenId,
        resourceCount: filteredBundle.total,
      });

      // Step 8: Return FHIR Bundle
      return reply
        .code(200)
        .header('Content-Type', 'application/fhir+json')
        .send(filteredBundle);
    } catch (error) {
      log('error', 'FHIR export failed', {
        correlationId,
        error: (error as Error).message,
        stack: (error as Error).stack,
      });

      return reply.code(500).send({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  /**
   * List available exports (for audit trail)
   */
  server.get('/exports', async (request, reply) => {
    try {
      const auth = await authenticateUser(request);
      const limit = parseInt((request.query as any).limit || '50', 10);

      // Fetch recent exports from audit log
      const exports = await prisma.auditEvent.findMany({
        where: {
          orgId: auth.orgId,
          eventType: 'FHIR_EXPORT',
          // If PATIENT role, only show their own exports
          ...(auth.role === UserRole.PATIENT
            ? { payload: { path: ['patientTokenId'], equals: auth.patientTokenId } }
            : {}),
        },
        orderBy: {
          ts: 'desc',
        },
        take: limit,
      });

      return reply.send({
        success: true,
        count: exports.length,
        exports: exports.map((e) => ({
          timestamp: e.ts,
          correlationId: (e.payload as any).correlationId,
          userId: (e.payload as any).userId,
          patientTokenId: (e.payload as any).patientTokenId,
          resourceCount: (e.payload as any).resourceCount,
        })),
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

export default fhirExportRoutes;
