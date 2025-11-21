/**
 * FHIR R4 Patient API - Individual Resource Operations
 *
 * GET /api/fhir/r4/Patient/[id] - Get patient as FHIR R4 Patient resource
 *
 * FHIR R4 Specification: http://hl7.org/fhir/R4/patient.html
 * Implements Brazilian healthcare extensions and identifiers
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toFHIRPatient, validateFHIRPatient } from '@/lib/fhir/patient-mapper';
import { auditView } from '@/lib/audit';

// Force dynamic rendering - prevents build-time evaluation
export const dynamic = 'force-dynamic';

/**
 * FHIR OperationOutcome for error responses
 */
interface FHIROperationOutcome {
  resourceType: 'OperationOutcome';
  issue: Array<{
    severity: 'fatal' | 'error' | 'warning' | 'information';
    code: string;
    diagnostics?: string;
    details?: {
      text: string;
    };
  }>;
}

/**
 * Create FHIR OperationOutcome for errors
 */
function createOperationOutcome(
  severity: 'fatal' | 'error' | 'warning' | 'information',
  code: string,
  diagnostics: string
): FHIROperationOutcome {
  return {
    resourceType: 'OperationOutcome',
    issue: [
      {
        severity,
        code,
        diagnostics,
        details: {
          text: diagnostics,
        },
      },
    ],
  };
}

/**
 * GET /api/fhir/r4/Patient/[id]
 * Retrieve a Patient resource by ID in FHIR R4 format
 *
 * @param id - Patient ID (UUID or MRN supported)
 * @returns FHIR R4 Patient resource
 *
 * Response Codes:
 * - 200: Success
 * - 404: Patient not found
 * - 500: Server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const patientId = params.id;

    // Search by ID or MRN (flexible identifier matching)
    const patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { id: patientId },
          { mrn: patientId },
        ],
      },
    });

    // Patient not found - return FHIR OperationOutcome
    if (!patient) {
      const outcome = createOperationOutcome(
        'error',
        'not-found',
        `Patient with identifier '${patientId}' was not found in the system.`
      );

      return NextResponse.json(outcome, {
        status: 404,
        headers: {
          'Content-Type': 'application/fhir+json; charset=utf-8',
        },
      });
    }

    // Convert internal Patient model to FHIR R4 Patient resource
    const fhirPatient = toFHIRPatient(patient);

    // Validate FHIR resource (optional quality check)
    const validationErrors = validateFHIRPatient(fhirPatient);
    if (validationErrors.length > 0) {
      console.warn('FHIR validation warnings:', {
        patientId: patient.id,
        errors: validationErrors,
      });
      // Continue anyway - validation warnings shouldn't block the response
    }

    // Create audit log for PHI access (HIPAA compliance)
    await auditView('Patient', patient.id, request, {
      patientName: `${patient.firstName} ${patient.lastName}`,
      mrn: patient.mrn,
      accessType: 'FHIR_R4_GET',
      fhirVersion: 'R4',
    });

    // Return FHIR R4 Patient resource with proper Content-Type
    return NextResponse.json(fhirPatient, {
      status: 200,
      headers: {
        'Content-Type': 'application/fhir+json; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-FHIR-Version': 'R4',
      },
    });
  } catch (error: any) {
    console.error('FHIR Patient GET error:', {
      patientId: params.id,
      error: error.message,
      stack: error.stack,
    });

    // Return FHIR OperationOutcome for server errors
    const outcome = createOperationOutcome(
      'fatal',
      'exception',
      `Internal server error: ${error.message || 'Unknown error occurred'}`
    );

    return NextResponse.json(outcome, {
      status: 500,
      headers: {
        'Content-Type': 'application/fhir+json; charset=utf-8',
      },
    });
  }
}
