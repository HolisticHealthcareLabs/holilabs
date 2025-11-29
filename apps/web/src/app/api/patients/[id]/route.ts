/**
 * Patient API - Individual Operations
 *
 * GET    /api/patients/[id] - Get patient details
 * PUT    /api/patients/[id] - Update patient
 * DELETE /api/patients/[id] - Soft delete patient
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePatientDataHash } from '@/lib/blockchain/hashing';
import { auditView, auditUpdate, auditDelete } from '@/lib/audit';
import { UpdatePatientSchema } from '@/lib/validation/schemas';
import { z } from 'zod';
import { onPatientUpdated } from '@/lib/cache/patient-context-cache';

// Force dynamic rendering - prevents build-time evaluation
export const dynamic = 'force-dynamic';


/**
 * GET /api/patients/[id]
 * Get detailed patient information
 * HIPAA §164.502(b) - Requires access reason for PHI access
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // HIPAA §164.502(b) - Access Reason Required
    const { searchParams } = new URL(request.url);
    const accessReason = searchParams.get('accessReason');
    const accessPurpose = searchParams.get('accessPurpose');

    const validAccessReasons = [
      'DIRECT_PATIENT_CARE',
      'CARE_COORDINATION',
      'EMERGENCY_ACCESS',
      'ADMINISTRATIVE',
      'QUALITY_IMPROVEMENT',
      'BILLING',
      'LEGAL_COMPLIANCE',
      'RESEARCH_IRB_APPROVED',
      'PUBLIC_HEALTH',
    ];

    if (!accessReason || !validAccessReasons.includes(accessReason)) {
      return NextResponse.json(
        {
          error: 'Access reason is required for HIPAA compliance',
          validReasons: validAccessReasons,
          hipaaReference: 'HIPAA §164.502(b) - Minimum Necessary Standard',
        },
        { status: 400 }
      );
    }

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

    // Create audit log for PHI access with full context and access reason (HIPAA §164.502(b))
    await auditView(
      'Patient',
      patient.id,
      request,
      {
        patientName: `${patient.firstName} ${patient.lastName}`,
        mrn: patient.mrn,
        includesAppointments: patient.appointments.length,
        includesMedications: patient.medications.length,
        includesClinicalNotes: patient.clinicalNotes.length,
      },
      accessReason,
      accessPurpose || undefined
    );

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
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Validate input with medical-grade Zod schema
    let validatedData;
    try {
      validatedData = UpdatePatientSchema.parse(body);
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

    // Prepare update data (using validated data)
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
      'cpf',
      'cns',
      'isPalliativeCare',
    ];

    for (const field of allowedFields) {
      if (validatedData[field as keyof typeof validatedData] !== undefined) {
        updateData[field as keyof typeof updateData] = validatedData[field as keyof typeof validatedData];
      }
    }

    // If critical data changed, regenerate hash
    const criticalFieldsChanged =
      validatedData.firstName ||
      validatedData.lastName ||
      validatedData.dateOfBirth ||
      validatedData.mrn;

    if (criticalFieldsChanged) {
      const dobValue = validatedData.dateOfBirth
        ? (typeof validatedData.dateOfBirth === 'string'
            ? validatedData.dateOfBirth
            : validatedData.dateOfBirth.toISOString())
        : existingPatient.dateOfBirth.toISOString();

      updateData.dataHash = generatePatientDataHash({
        id: existingPatient.id,
        firstName: validatedData.firstName || existingPatient.firstName,
        lastName: validatedData.lastName || existingPatient.lastName,
        dateOfBirth: dobValue,
        mrn: validatedData.mrn || existingPatient.mrn,
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

    // Create audit log with full user context
    await auditUpdate('Patient', patient.id, request, {
      updatedFields: Object.keys(updateData),
      patientName: `${patient.firstName} ${patient.lastName}`,
      mrn: patient.mrn,
    });

    // Invalidate patient context cache (demographics and full context)
    try {
      await onPatientUpdated(patient.id);
      console.log('[Cache] Invalidated patient context cache for patient update:', patient.id);
    } catch (cacheError) {
      // Don't fail the request if cache invalidation fails
      console.error('[Cache] Cache invalidation error:', cacheError);
    }

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
  request: NextRequest,
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

    // Create audit log with full user context
    await auditDelete('Patient', patient.id, request, {
      patientName: `${existingPatient.firstName} ${existingPatient.lastName}`,
      mrn: existingPatient.mrn,
      reason: 'Soft delete (set isActive=false)',
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
