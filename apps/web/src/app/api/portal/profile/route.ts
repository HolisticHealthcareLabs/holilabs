export const dynamic = "force-dynamic";
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
import { createPatientPortalRoute, type PatientPortalContext } from '@/lib/api/patient-portal-middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

// Update profile schema — fields that exist on the Patient model
const UpdateProfileSchema = z.object({
  phone: z.string().min(7).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
});

export const GET = createPatientPortalRoute(
  async (request: NextRequest, context: PatientPortalContext) => {
    const patientId = context.session.patientId;

    // Fetch patient with full profile data
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        assignedClinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialty: true,
            licenseNumber: true,
            email: true,
          },
        },
        medications: {
          where: { isActive: true },
          select: { id: true },
        },
        appointments: {
          where: {
            startTime: { gte: new Date() },
            status: { in: ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'] },
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
        { success: false, error: 'Perfil no encontrado.' },
        { status: 404 }
      );
    }

    // HIPAA Audit Log: Patient accessed their profile
    await createAuditLog({
      action: 'READ',
      resource: 'Patient',
      resourceId: patientId,
      details: {
        patientId,
        includedStats: {
          activeMedications: patient.medications.length,
          upcomingAppointments: patient.appointments.length,
          totalDocuments: patient.documents.length,
        },
        accessType: 'PATIENT_PROFILE_VIEW',
      },
      success: true,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: patient.id,
          patientId: patient.mrn,
          tokenId: patient.tokenId,
          firstName: patient.firstName,
          lastName: patient.lastName,
          dateOfBirth: patient.dateOfBirth,
          gender: patient.gender,
          email: patient.email,
          phone: patient.phone,
          address: patient.address,
          city: patient.city,
          state: patient.state,
          postalCode: patient.postalCode,
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
  },
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 30 },
    audit: { action: 'READ', resource: 'Profile' },
  }
);

export const PATCH = createPatientPortalRoute(
  async (request: NextRequest, context: PatientPortalContext) => {
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

    const updatedPatient = await prisma.patient.update({
      where: { id: context.session.patientId },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        userId: context.session.userId,
        userEmail: context.session.email,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'UPDATE',
        resource: 'Patient',
        resourceId: context.session.patientId,
        success: true,
        details: {
          updatedFields: Object.keys(updateData),
        },
      },
    });

    logger.info({
      event: 'patient_profile_updated',
      patientId: context.session.patientId,
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
  },
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 30 },
    audit: { action: 'UPDATE', resource: 'Profile' },
  }
);
