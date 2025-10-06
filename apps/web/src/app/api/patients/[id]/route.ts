/**
 * Patient API - Individual Operations
 *
 * GET    /api/patients/[id] - Get patient details
 * PUT    /api/patients/[id] - Update patient
 * DELETE /api/patients/[id] - Soft delete patient
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePatientDataHash } from '@/lib/blockchain/hashing';

// Force dynamic rendering - prevents build-time evaluation
export const dynamic = 'force-dynamic';


/**
 * GET /api/patients/[id]
 * Get detailed patient information
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: params.id },
      include: {
        assignedClinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            specialty: true,
            licenseNumber: true,
          },
        },
        medications: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
        appointments: {
          orderBy: { startTime: 'desc' },
          take: 10,
          include: {
            clinician: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        consents: {
          where: { isActive: true },
          orderBy: { signedAt: 'desc' },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        clinicalNotes: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        prescriptions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            clinician: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Create audit log for PHI access
    await prisma.auditLog.create({
      data: {
        userEmail: 'system', // TODO: Get from auth session
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'READ',
        resource: 'Patient',
        resourceId: patient.id,
        success: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: patient,
    });
  } catch (error: any) {
    console.error('Error fetching patient:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patient', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/patients/[id]
 * Update patient information
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Check if patient exists
    const existingPatient = await prisma.patient.findUnique({
      where: { id: params.id },
    });

    if (!existingPatient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};

    // Only update provided fields
    const allowedFields = [
      'firstName',
      'lastName',
      'dateOfBirth',
      'gender',
      'email',
      'phone',
      'address',
      'city',
      'state',
      'postalCode',
      'country',
      'externalMrn',
      'assignedClinicianId',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // If critical data changed, regenerate hash
    const criticalFieldsChanged =
      body.firstName ||
      body.lastName ||
      body.dateOfBirth ||
      body.mrn;

    if (criticalFieldsChanged) {
      updateData.dataHash = generatePatientDataHash({
        id: existingPatient.id,
        firstName: body.firstName || existingPatient.firstName,
        lastName: body.lastName || existingPatient.lastName,
        dateOfBirth:
          body.dateOfBirth || existingPatient.dateOfBirth.toISOString(),
        mrn: body.mrn || existingPatient.mrn,
      });
      updateData.lastHashUpdate = new Date();
    }

    // Update patient
    const patient = await prisma.patient.update({
      where: { id: params.id },
      data: updateData,
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
        userEmail: 'system', // TODO: Get from auth session
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'UPDATE',
        resource: 'Patient',
        resourceId: patient.id,
        details: { updatedFields: Object.keys(updateData) },
        success: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: patient,
      message: 'Patient updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating patient:', error);
    return NextResponse.json(
      { error: 'Failed to update patient', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/patients/[id]
 * Soft delete patient (set isActive = false)
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if patient exists
    const existingPatient = await prisma.patient.findUnique({
      where: { id: params.id },
    });

    if (!existingPatient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Soft delete (set isActive = false)
    const patient = await prisma.patient.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userEmail: 'system', // TODO: Get from auth session
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'DELETE',
        resource: 'Patient',
        resourceId: patient.id,
        success: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Patient deactivated successfully',
    });
  } catch (error: any) {
    console.error('Error deleting patient:', error);
    return NextResponse.json(
      { error: 'Failed to delete patient', details: error.message },
      { status: 500 }
    );
  }
}
