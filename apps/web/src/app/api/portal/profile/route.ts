/**
 * Patient Profile API
 *
 * GET /api/portal/profile
 * Fetch profile data for authenticated patient
 *
 * PATCH /api/portal/profile
 * Update profile data
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { z } from 'zod';

// Update profile schema
const UpdateProfileSchema = z.object({
  emergencyContactName: z.string().min(2).optional(),
  emergencyContactPhone: z.string().min(10).optional(),
  emergencyContactRelationship: z.string().optional(),
  preferredLanguage: z.enum(['en', 'es']).optional(),
  communicationPreferences: z.object({
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
    push: z.boolean().optional(),
  }).optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Authenticate patient
    const session = await requirePatientSession();

    // Fetch patient with full profile data
    const patient = await prisma.patient.findUnique({
      where: { id: session.patientId },
      include: {
        assignedClinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialty: true,
            licenseNumber: true,
            user: {
              select: {
                email: true,
                phone: true,
              },
            },
          },
        },
        medications: {
          where: { isActive: true },
          select: { id: true },
        },
        appointments: {
          where: {
            startTime: { gte: new Date() },
            status: { in: ['SCHEDULED', 'RESCHEDULED'] },
          },
          select: { id: true },
        },
        documents: {
          select: { id: true },
        },
      },
    });

    if (!patient) {
      return NextResponse.json(
        {
          success: false,
          error: 'Perfil no encontrado.',
        },
        { status: 404 }
      );
    }

    logger.info({
      event: 'patient_profile_fetched',
      patientId: session.patientId,
      patientUserId: session.userId,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: patient.id,
          patientId: patient.patientId,
          firstName: patient.firstName,
          lastName: patient.lastName,
          dateOfBirth: patient.dateOfBirth,
          gender: patient.gender,
          bloodType: patient.bloodType,
          allergies: patient.allergies,
          chronicConditions: patient.chronicConditions,
          emergencyContactName: patient.emergencyContactName,
          emergencyContactPhone: patient.emergencyContactPhone,
          emergencyContactRelationship: patient.emergencyContactRelationship,
          assignedClinician: patient.assignedClinician,
          stats: {
            activeMedications: patient.medications.length,
            upcomingAppointments: patient.appointments.length,
            totalDocuments: patient.documents.length,
          },
          createdAt: patient.createdAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    // Check if it's an auth error
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado. Por favor, inicia sesión.',
        },
        { status: 401 }
      );
    }

    logger.error({
      event: 'patient_profile_fetch_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al cargar perfil.',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Authenticate patient
    const session = await requirePatientSession();

    // Parse and validate request body
    const body = await request.json();
    const validation = UpdateProfileSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos inválidos',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const updateData = validation.data;

    // Update patient profile
    const updatedPatient = await prisma.patient.update({
      where: { id: session.patientId },
      data: updateData,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        userEmail: session.email,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'UPDATE',
        resource: 'Patient',
        resourceId: session.patientId,
        success: true,
        metadata: {
          updatedFields: Object.keys(updateData),
        },
      },
    });

    logger.info({
      event: 'patient_profile_updated',
      patientId: session.patientId,
      patientUserId: session.userId,
      updatedFields: Object.keys(updateData),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Perfil actualizado correctamente.',
        data: updatedPatient,
      },
      { status: 200 }
    );
  } catch (error) {
    // Check if it's an auth error
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado. Por favor, inicia sesión.',
        },
        { status: 401 }
      );
    }

    logger.error({
      event: 'patient_profile_update_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar perfil.',
      },
      { status: 500 }
    );
  }
}
