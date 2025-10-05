/**
 * Patient API - List and Create
 *
 * GET  /api/patients - List patients with pagination
 * POST /api/patients - Create new patient
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePatientDataHash } from '@/lib/blockchain/hashing';

/**
 * GET /api/patients
 * List patients with pagination and filtering
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Filters
    const search = searchParams.get('search') || '';
    const isActive = searchParams.get('isActive');

    // Build where clause
    const where: any = {};

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
      { error: 'Failed to fetch patients', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/patients
 * Create new patient with blockchain hash
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'dateOfBirth', 'mrn'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Generate token ID for de-identification
    const tokenId = `PT-${Math.random().toString(36).substr(2, 4)}-${Math.random().toString(36).substr(2, 4)}-${Math.random().toString(36).substr(2, 4)}`;

    // Generate blockchain hash
    const dataHash = generatePatientDataHash({
      id: tokenId,
      firstName: body.firstName,
      lastName: body.lastName,
      dateOfBirth: body.dateOfBirth,
      mrn: body.mrn,
    });

    // Calculate age band for de-identification
    const birthYear = new Date(body.dateOfBirth).getFullYear();
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    const ageBand = `${Math.floor(age / 10) * 10}-${Math.floor(age / 10) * 10 + 9}`;

    // Create patient
    const patient = await prisma.patient.create({
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        dateOfBirth: new Date(body.dateOfBirth),
        gender: body.gender,
        email: body.email,
        phone: body.phone,
        address: body.address,
        city: body.city,
        state: body.state,
        postalCode: body.postalCode,
        country: body.country || 'MX',
        mrn: body.mrn,
        externalMrn: body.externalMrn,
        tokenId,
        ageBand,
        region: body.state || body.region,
        assignedClinicianId: body.assignedClinicianId,
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

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: body.createdBy || body.assignedClinicianId,
        userEmail: 'system',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'CREATE',
        resource: 'Patient',
        resourceId: patient.id,
        details: { tokenId, mrn: body.mrn },
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
