/**
 * Patient API - List and Create
 *
 * GET  /api/patients - List patients with pagination
 * POST /api/patients - Create new patient
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { generatePatientDataHash } from '@/lib/blockchain/hashing';
import { CreatePatientSchema } from '@/lib/validation/schemas';
import { z } from 'zod';
import { trackEvent, ServerAnalyticsEvents } from '@/lib/analytics/server-analytics';
import { generateUniquePatientTokenId } from '@/lib/security/token-generation';
import { logDeIDOperation } from '@/lib/audit/deid-audit';

// Force dynamic rendering - prevents build-time evaluation
export const dynamic = 'force-dynamic';


/**
 * GET /api/patients
 * List patients with pagination and filtering
 * SECURITY: Enforces tenant isolation - users can only access their own patients
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const { searchParams } = new URL(request.url);

      // Pagination
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const skip = (page - 1) * limit;

      // Filters
      const search = searchParams.get('search') || '';
      const isActive = searchParams.get('isActive');
      const requestedClinicianId = searchParams.get('clinicianId');

      // ===================================================================
      // SECURITY: TENANT ISOLATION - CRITICAL FOR HIPAA COMPLIANCE
      // ===================================================================
      // Prevent clinicians from accessing other clinicians' patients
      let clinicianId = context.user.id;

      if (requestedClinicianId && requestedClinicianId !== context.user.id) {
        // Only ADMIN can query other clinicians' patients
        if (context.user.role !== 'ADMIN') {
          return NextResponse.json(
            {
              error: 'Forbidden',
              message: 'You cannot access other clinicians\' patients',
            },
            { status: 403 }
          );
        }
        // ADMIN approved - use requested clinician ID
        clinicianId = requestedClinicianId;
      }

      // Build where clause with tenant isolation
      const where: any = {
        assignedClinicianId: clinicianId, // CRITICAL: Always filter by clinician
      };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { mrn: { contains: search, mode: 'insensitive' } },
        { tokenId: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    // Execute query with pagination
    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take: limit,
        include: {
          assignedClinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              specialty: true,
            },
          },
          medications: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              dose: true,
              frequency: true,
            },
          },
          appointments: {
            where: {
              startTime: { gte: new Date() },
              status: { in: ['SCHEDULED', 'CONFIRMED'] },
            },
            orderBy: { startTime: 'asc' },
            take: 1,
            select: {
              id: true,
              startTime: true,
              type: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.patient.count({ where }),
    ]);

      return NextResponse.json({
        success: true,
        data: patients,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      console.error('Error fetching patients:', error);
      return NextResponse.json(
        { error: 'Failed to fetch patients' },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
    skipCsrf: true, // GET requests don't need CSRF protection
  }
);

/**
 * POST /api/patients
 * Create new patient with blockchain hash
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate with medical-grade Zod schema
    let validatedData;
    try {
      validatedData = CreatePatientSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            message: 'Please check your input and try again',
            details: error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        );
      }
      throw error; // Re-throw non-validation errors
    }

    // Generate cryptographically secure token ID for de-identification
    // SECURITY: Uses crypto.randomBytes (128-bit entropy) instead of Math.random()
    // Includes automatic collision detection
    const tokenId = await generateUniquePatientTokenId();

    // Generate blockchain hash (using validated data)
    const dataHash = generatePatientDataHash({
      id: tokenId,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      dateOfBirth: validatedData.dateOfBirth.toString(),
      mrn: validatedData.mrn,
    });

    // Calculate age band for de-identification
    const birthYear = new Date(validatedData.dateOfBirth).getFullYear();
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    const ageBand = `${Math.floor(age / 10) * 10}-${Math.floor(age / 10) * 10 + 9}`;

    // Create patient (using validated data - type-safe)
    const patient = await prisma.patient.create({
      data: {
        // Basic demographics
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        dateOfBirth: new Date(validatedData.dateOfBirth),
        gender: validatedData.gender,

        // Contact information
        email: validatedData.email,
        phone: validatedData.phone,
        address: validatedData.address,
        city: validatedData.city,
        state: validatedData.state,
        postalCode: validatedData.postalCode,
        country: validatedData.country || 'BR',

        // Medical Record Numbers
        mrn: validatedData.mrn,
        externalMrn: validatedData.externalMrn,

        // De-identification
        tokenId,
        ageBand,
        region: validatedData.state || validatedData.region,

        // Brazilian National Identifiers
        cns: validatedData.cns,
        cpf: validatedData.cpf,
        rg: validatedData.rg,
        municipalityCode: validatedData.municipalityCode,
        healthUnitCNES: validatedData.healthUnitCNES,
        susPacientId: validatedData.susPacientId,

        // Palliative Care
        isPalliativeCare: validatedData.isPalliativeCare || false,
        comfortCareOnly: validatedData.comfortCareOnly || false,
        advanceDirectivesStatus: validatedData.advanceDirectivesStatus,
        advanceDirectivesDate: validatedData.advanceDirectivesDate ? new Date(validatedData.advanceDirectivesDate) : undefined,
        advanceDirectivesNotes: validatedData.advanceDirectivesNotes,

        // DNR/DNI
        dnrStatus: validatedData.dnrStatus || false,
        dnrDate: validatedData.dnrDate ? new Date(validatedData.dnrDate) : undefined,
        dniStatus: validatedData.dniStatus || false,
        dniDate: validatedData.dniDate ? new Date(validatedData.dniDate) : undefined,
        codeStatus: validatedData.codeStatus,

        // Caregiver and Quality of Life
        primaryCaregiverId: validatedData.primaryCaregiverId,
        qualityOfLifeScore: validatedData.qualityOfLifeScore,
        lastQoLAssessment: validatedData.lastQoLAssessment ? new Date(validatedData.lastQoLAssessment) : undefined,

        // Spiritual Care
        religiousAffiliation: validatedData.religiousAffiliation,
        spiritualCareNeeds: validatedData.spiritualCareNeeds,
        chaplainAssigned: validatedData.chaplainAssigned || false,

        // Family Contacts
        primaryContactName: validatedData.primaryContactName,
        primaryContactRelation: validatedData.primaryContactRelation,
        primaryContactPhone: validatedData.primaryContactPhone,
        primaryContactEmail: validatedData.primaryContactEmail,
        primaryContactAddress: validatedData.primaryContactAddress,

        secondaryContactName: validatedData.secondaryContactName,
        secondaryContactRelation: validatedData.secondaryContactRelation,
        secondaryContactPhone: validatedData.secondaryContactPhone,
        secondaryContactEmail: validatedData.secondaryContactEmail,

        emergencyContactName: validatedData.emergencyContactName,
        emergencyContactPhone: validatedData.emergencyContactPhone,
        emergencyContactRelation: validatedData.emergencyContactRelation,

        // Family Portal
        familyPortalEnabled: validatedData.familyPortalEnabled || false,

        // Humanization & Dignity
        photoUrl: validatedData.photoUrl,
        photoConsentDate: validatedData.photoConsentDate ? new Date(validatedData.photoConsentDate) : undefined,
        photoConsentBy: validatedData.photoConsentBy,
        preferredName: validatedData.preferredName,
        pronouns: validatedData.pronouns,
        culturalPreferences: validatedData.culturalPreferences,

        // Special Needs
        hasSpecialNeeds: validatedData.hasSpecialNeeds || false,
        specialNeedsType: validatedData.specialNeedsType || [],
        communicationNeeds: validatedData.communicationNeeds,
        mobilityNeeds: validatedData.mobilityNeeds,
        dietaryNeeds: validatedData.dietaryNeeds,
        sensoryNeeds: validatedData.sensoryNeeds,

        // Care Team
        careTeamNotes: validatedData.careTeamNotes,
        flaggedConcerns: validatedData.flaggedConcerns || [],

        // Assignment & Blockchain
        assignedClinicianId: validatedData.assignedClinicianId,
        dataHash,
        lastHashUpdate: new Date(),
      },
      include: {
        assignedClinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Create audit log (using validated data)
    await prisma.auditLog.create({
      data: {
        userId: validatedData.createdBy || validatedData.assignedClinicianId || 'system',
        userEmail: 'system',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'CREATE',
        resource: 'Patient',
        resourceId: patient.id,
        details: { tokenId, mrn: validatedData.mrn },
        success: true,
      },
    });

    // SECURITY: Log de-identification operation for HIPAA compliance
    await logDeIDOperation(
      'TOKEN_GENERATE',
      validatedData.createdBy || validatedData.assignedClinicianId || 'system',
      [patient.id],
      {
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        tokenId,
        ageBand: patient.ageBand,
        region: patient.region,
        policyVersion: 'MVP-1.2',
      }
    );

    // Track analytics event (NO PHI!)
    await trackEvent(
      ServerAnalyticsEvents.PATIENT_CREATED,
      validatedData.assignedClinicianId || 'system',
      {
        isPalliativeCare: patient.isPalliativeCare,
        hasSpecialNeeds: patient.hasSpecialNeeds,
        dnrStatus: patient.dnrStatus,
        gender: patient.gender,
        ageBand: patient.ageBand,
        success: true
      }
    );

    return NextResponse.json({
      success: true,
      data: patient,
      message: 'Patient created successfully',
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating patient:', error);

    // Handle unique constraint violations
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Patient with this MRN already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create patient', details: error.message },
      { status: 500 }
    );
  }
}
