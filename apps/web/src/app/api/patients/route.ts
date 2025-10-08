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

    // Generate token ID for de-identification
    const tokenId = `PT-${Math.random().toString(36).substr(2, 4)}-${Math.random().toString(36).substr(2, 4)}-${Math.random().toString(36).substr(2, 4)}`;

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
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        dateOfBirth: new Date(validatedData.dateOfBirth),
        gender: validatedData.gender,
        email: validatedData.email,
        phone: validatedData.phone,
        address: validatedData.address,
        city: validatedData.city,
        state: validatedData.state,
        postalCode: validatedData.postalCode,
        country: validatedData.country || 'MX',
        mrn: validatedData.mrn,
        externalMrn: validatedData.externalMrn,
        tokenId,
        ageBand,
        region: validatedData.state || validatedData.region,
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
