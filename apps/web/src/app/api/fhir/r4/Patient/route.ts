/**
 * FHIR R4 Patient API - Collection Operations
 *
 * GET  /api/fhir/r4/Patient - Search patients with FHIR search parameters
 * POST /api/fhir/r4/Patient - Create new patient from FHIR R4 Patient resource
 *
 * FHIR R4 Specification: http://hl7.org/fhir/R4/patient.html
 * Implements Brazilian healthcare extensions and identifiers
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fromFHIRPatient, validateFHIRPatient, generateMRN, generateTokenId, toFHIRPatient, type FHIRPatient } from '@/lib/fhir/patient-mapper';
import { auditCreate, auditView } from '@/lib/audit';
import { generatePatientDataHash } from '@/lib/blockchain/hashing';
import { logger } from '@/lib/logger';

// Force dynamic rendering
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
 * FHIR Bundle for search results
 */
interface FHIRBundle {
  resourceType: 'Bundle';
  type: 'searchset';
  total: number;
  entry?: Array<{
    fullUrl: string;
    resource: FHIRPatient;
  }>;
}

/**
 * GET /api/fhir/r4/Patient
 * Search for patients using FHIR search parameters
 *
 * Supported search parameters:
 * - family: Patient's family (last) name
 * - given: Patient's given (first) name
 * - identifier: Any identifier (MRN, CPF, CNS, etc.)
 * - birthdate: Patient's date of birth (format: YYYY-MM-DD)
 * - gender: male, female, other, unknown
 * - active: true or false
 * - _count: Number of results to return (default: 20, max: 100)
 * - _offset: Offset for pagination (default: 0)
 *
 * @returns FHIR Bundle with search results
 *
 * Response Codes:
 * - 200: Success (may return empty bundle)
 * - 400: Invalid search parameters
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Extract FHIR search parameters
    const family = searchParams.get('family');
    const given = searchParams.get('given');
    const identifier = searchParams.get('identifier');
    const birthdate = searchParams.get('birthdate');
    const gender = searchParams.get('gender');
    const active = searchParams.get('active');
    const count = Math.min(parseInt(searchParams.get('_count') || '20'), 100);
    const offset = parseInt(searchParams.get('_offset') || '0');

    // Build Prisma where clause
    const where: any = { isActive: true };

    if (family) {
      where.lastName = { contains: family, mode: 'insensitive' };
    }

    if (given) {
      where.firstName = { contains: given, mode: 'insensitive' };
    }

    if (identifier) {
      // Search across multiple identifier fields
      where.OR = [
        { mrn: { contains: identifier, mode: 'insensitive' } },
        { cpf: { contains: identifier, mode: 'insensitive' } },
        { cns: { contains: identifier, mode: 'insensitive' } },
        { rg: { contains: identifier, mode: 'insensitive' } },
        { externalMrn: { contains: identifier, mode: 'insensitive' } },
        { tokenId: { contains: identifier, mode: 'insensitive' } },
      ];
    }

    if (birthdate) {
      try {
        const date = new Date(birthdate);
        if (isNaN(date.getTime())) {
          const outcome = createOperationOutcome(
            'error',
            'invalid',
            `Invalid birthdate format: ${birthdate}. Expected YYYY-MM-DD.`
          );
          return NextResponse.json(outcome, {
            status: 400,
            headers: { 'Content-Type': 'application/fhir+json; charset=utf-8' },
          });
        }
        where.dateOfBirth = date;
      } catch (error) {
        const outcome = createOperationOutcome(
          'error',
          'invalid',
          `Invalid birthdate format: ${birthdate}. Expected YYYY-MM-DD.`
        );
        return NextResponse.json(outcome, {
          status: 400,
          headers: { 'Content-Type': 'application/fhir+json; charset=utf-8' },
        });
      }
    }

    if (gender) {
      const genderMap: Record<string, string> = {
        male: 'MALE',
        female: 'FEMALE',
        other: 'OTHER',
        unknown: 'UNKNOWN',
      };
      const mappedGender = genderMap[gender.toLowerCase()];
      if (!mappedGender) {
        const outcome = createOperationOutcome(
          'error',
          'invalid',
          `Invalid gender value: ${gender}. Expected male, female, other, or unknown.`
        );
        return NextResponse.json(outcome, {
          status: 400,
          headers: { 'Content-Type': 'application/fhir+json; charset=utf-8' },
        });
      }
      where.gender = mappedGender;
    }

    if (active !== null) {
      if (active === 'true') {
        where.isActive = true;
      } else if (active === 'false') {
        where.isActive = false;
      }
    }

    // Execute search query
    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        take: count,
        skip: offset,
        orderBy: { lastName: 'asc' },
      }),
      prisma.patient.count({ where }),
    ]);

    // Convert to FHIR Bundle
    const bundle: FHIRBundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total,
      entry: patients.map((patient) => ({
        fullUrl: `${request.nextUrl.origin}/api/fhir/r4/Patient/${patient.id}`,
        resource: toFHIRPatient(patient),
      })),
    };

    // Create audit log for search (HIPAA compliance)
    await auditView('Patient', 'search', request, {
      searchParameters: Object.fromEntries(searchParams.entries()),
      resultCount: patients.length,
      accessType: 'FHIR_R4_SEARCH',
      fhirVersion: 'R4',
    });

    // Return FHIR Bundle
    return NextResponse.json(bundle, {
      status: 200,
      headers: {
        'Content-Type': 'application/fhir+json; charset=utf-8',
        'X-FHIR-Version': 'R4',
      },
    });
  } catch (error: any) {
    logger.error({
      event: 'fhir_patient_search_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error?.stack,
    });

    // Return FHIR OperationOutcome for server errors
    const errorMessage = process.env.NODE_ENV === 'development'
      ? error.message || 'Unknown error occurred'
      : 'Internal server error occurred';
    const outcome = createOperationOutcome(
      'fatal',
      'exception',
      errorMessage
    );

    return NextResponse.json(outcome, {
      status: 500,
      headers: {
        'Content-Type': 'application/fhir+json; charset=utf-8',
      },
    });
  }
}

/**
 * POST /api/fhir/r4/Patient
 * Create a new Patient from FHIR R4 Patient resource
 *
 * @body FHIR R4 Patient resource
 * @returns Created FHIR R4 Patient resource with generated ID
 *
 * Response Codes:
 * - 201: Created successfully
 * - 400: Invalid FHIR Patient resource
 * - 409: Patient already exists (duplicate identifier)
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Parse FHIR Patient resource from request body
    let fhirPatient: FHIRPatient;
    try {
      fhirPatient = await request.json();
    } catch (error) {
      const outcome = createOperationOutcome(
        'error',
        'invalid',
        'Invalid JSON in request body. Expected FHIR R4 Patient resource.'
      );
      return NextResponse.json(outcome, {
        status: 400,
        headers: { 'Content-Type': 'application/fhir+json; charset=utf-8' },
      });
    }

    // Validate FHIR Patient resource
    const validationErrors = validateFHIRPatient(fhirPatient);
    if (validationErrors.length > 0) {
      // ============================================================================
      // DATA SUPREMACY: Track FHIR validation errors for data quality improvement
      // ============================================================================
      try {
        // @ts-ignore - dataQualityEvent model not yet in Prisma schema
        await prisma.dataQualityEvent.createMany({
          data: validationErrors.map(error => ({
            source: 'FHIR_R4_IMPORT',
            errorType: 'FHIR_VALIDATION_ERROR',
            errorMessage: error,
            metadata: {
              fhirResourceType: fhirPatient.resourceType,
              fhirId: fhirPatient.id,
              totalErrors: validationErrors.length,
              timestamp: new Date().toISOString(),
            },
          })),
          skipDuplicates: true,
        });
      } catch (trackingError) {
        logger.error({
          event: 'data_quality_tracking_failed',
          error: trackingError instanceof Error ? trackingError.message : 'Unknown error',
        });
      }

      const outcome = createOperationOutcome(
        'error',
        'invalid',
        `FHIR validation failed: ${validationErrors.join('; ')}`
      );
      return NextResponse.json(outcome, {
        status: 400,
        headers: { 'Content-Type': 'application/fhir+json; charset=utf-8' },
      });
    }

    // Convert FHIR Patient to internal Patient model
    const patientData = fromFHIRPatient(fhirPatient);

    // Generate required identifiers if not provided
    if (!patientData.mrn) {
      patientData.mrn = generateMRN();
    }
    if (!patientData.tokenId) {
      patientData.tokenId = generateTokenId();
    }

    // Check for duplicate patient (by CPF, CNS, or MRN)
    const duplicateCheck = await prisma.patient.findFirst({
      where: {
        OR: [
          patientData.cpf ? { cpf: patientData.cpf } : {},
          patientData.cns ? { cns: patientData.cns } : {},
          { mrn: patientData.mrn },
        ].filter(condition => Object.keys(condition).length > 0),
      },
    });

    if (duplicateCheck) {
      const outcome = createOperationOutcome(
        'error',
        'duplicate',
        `Patient already exists with identifier: ${duplicateCheck.mrn} (CPF: ${duplicateCheck.cpf}, CNS: ${duplicateCheck.cns})`
      );
      return NextResponse.json(outcome, {
        status: 409,
        headers: { 'Content-Type': 'application/fhir+json; charset=utf-8' },
      });
    }

    // Validate required fields for internal model
    if (!patientData.firstName || !patientData.lastName) {
      // ============================================================================
      // DATA SUPREMACY: Track FHIR mapping errors for data quality
      // ============================================================================
      try {
        // @ts-ignore - dataQualityEvent model not yet in Prisma schema
        await prisma.dataQualityEvent.create({
          data: {
            source: 'FHIR_R4_IMPORT',
            errorType: 'FHIR_MAPPING_ERROR',
            errorMessage: 'Missing firstName or lastName after FHIR conversion',
            metadata: {
              fhirResourceType: fhirPatient.resourceType,
              fhirId: fhirPatient.id,
              missingFields: [
                !patientData.firstName && 'firstName',
                !patientData.lastName && 'lastName',
              ].filter(Boolean),
              timestamp: new Date().toISOString(),
            },
          },
        });
      } catch (trackingError) {
        logger.error({
          event: 'data_quality_tracking_failed',
          error: trackingError instanceof Error ? trackingError.message : 'Unknown error',
        });
      }

      const outcome = createOperationOutcome(
        'error',
        'required',
        'Patient must have firstName and lastName (from FHIR name.given and name.family)'
      );
      return NextResponse.json(outcome, {
        status: 400,
        headers: { 'Content-Type': 'application/fhir+json; charset=utf-8' },
      });
    }

    if (!patientData.dateOfBirth) {
      // ============================================================================
      // DATA SUPREMACY: Track FHIR mapping errors for data quality
      // ============================================================================
      try {
        // @ts-ignore - dataQualityEvent model not yet in Prisma schema
        await prisma.dataQualityEvent.create({
          data: {
            source: 'FHIR_R4_IMPORT',
            errorType: 'FHIR_MAPPING_ERROR',
            errorMessage: 'Missing dateOfBirth after FHIR conversion',
            metadata: {
              fhirResourceType: fhirPatient.resourceType,
              fhirId: fhirPatient.id,
              missingFields: ['dateOfBirth'],
              timestamp: new Date().toISOString(),
            },
          },
        });
      } catch (trackingError) {
        logger.error({
          event: 'data_quality_tracking_failed',
          error: trackingError instanceof Error ? trackingError.message : 'Unknown error',
        });
      }

      const outcome = createOperationOutcome(
        'error',
        'required',
        'Patient must have dateOfBirth (from FHIR birthDate)'
      );
      return NextResponse.json(outcome, {
        status: 400,
        headers: { 'Content-Type': 'application/fhir+json; charset=utf-8' },
      });
    }

    // Generate data hash for blockchain integrity
    const dataHash = generatePatientDataHash({
      id: patientData.id || 'pending',
      firstName: patientData.firstName,
      lastName: patientData.lastName,
      dateOfBirth: patientData.dateOfBirth.toISOString(),
      mrn: patientData.mrn,
    });

    // Create patient in database
    const newPatient = await prisma.patient.create({
      data: {
        ...patientData,
        dataHash,
        lastHashUpdate: new Date(),
        isActive: true,
      } as any,
    });

    // Create audit log (HIPAA compliance)
    await auditCreate('Patient', newPatient.id, request, {
      patientName: `${newPatient.firstName} ${newPatient.lastName}`,
      mrn: newPatient.mrn,
      creationMethod: 'FHIR_R4_POST',
      fhirVersion: 'R4',
      source: fhirPatient.meta?.source || 'unknown',
    });

    // Convert back to FHIR format for response
    const { toFHIRPatient } = await import('@/lib/fhir/patient-mapper');
    const createdFHIRPatient = toFHIRPatient(newPatient);

    // Return created resource with 201 status and Location header
    return NextResponse.json(createdFHIRPatient, {
      status: 201,
      headers: {
        'Content-Type': 'application/fhir+json; charset=utf-8',
        'Location': `/api/fhir/r4/Patient/${newPatient.id}`,
        'X-FHIR-Version': 'R4',
      },
    });
  } catch (error: any) {
    logger.error({
      event: 'fhir_patient_create_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error?.stack,
    });

    // Return FHIR OperationOutcome for server errors
    const errorMessage = process.env.NODE_ENV === 'development'
      ? error.message || 'Unknown error occurred'
      : 'Internal server error occurred';
    const outcome = createOperationOutcome(
      'fatal',
      'exception',
      errorMessage
    );

    return NextResponse.json(outcome, {
      status: 500,
      headers: {
        'Content-Type': 'application/fhir+json; charset=utf-8',
      },
    });
  }
}
