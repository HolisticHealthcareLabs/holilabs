/**
 * GET /api/encounters?patientId=<id>
 *
 * Returns the list of ClinicalEncounters for a patient, ordered by
 * scheduledAt descending (most recent first).
 *
 * Used by: Patient detail page encounters timeline.
 *
 * @compliance HIPAA Minimum Necessary, LGPD Art. 11
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { consentGuard } from '@/lib/consent/consent-guard';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const patientId = request.nextUrl.searchParams.get('patientId');

    if (!patientId) {
      return NextResponse.json(
        { error: 'Missing required query param: patientId' },
        { status: 400 }
      );
    }

    // RBAC: verify caller is assigned clinician or admin
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { assignedClinicianId: true },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    if (
      patient.assignedClinicianId !== context.user.id &&
      context.user.role !== 'ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const encounters = await prisma.clinicalEncounter.findMany({
      where: { patientId },
      orderBy: { scheduledAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        chiefComplaint: true,
        scheduledAt: true,
        startedAt: true,
        endedAt: true,
      },
    });

    return NextResponse.json({ data: encounters });
  },
  { roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN'], skipCsrf: true, audit: { action: 'READ', resource: 'Encounter' } }
);

// ============================================================================
// POST /api/encounters — Create a new clinical encounter
// ============================================================================

const CreateEncounterSchema = z.object({
  patientId: z.string().cuid(),
  providerId: z.string().cuid(),
  appointmentId: z.string().cuid().optional(),
  scheduledAt: z.string().datetime(),
  chiefComplaint: z.string().max(500).optional(),
});

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const body = await request.json();
    const parsed = CreateEncounterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { patientId, providerId, appointmentId, scheduledAt, chiefComplaint } = parsed.data;

    // RBAC: caller must be the provider or an admin
    if (context.user.id !== providerId && context.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Consent gate
    const consent = await consentGuard.canRecordClinicalSession(patientId);
    if (!consent.allowed) {
      return NextResponse.json(
        { error: 'Patient has not consented to clinical session recording', reason: consent.message },
        { status: 403 }
      );
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true },
    });
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Verify appointment if provided
    if (appointmentId) {
      const appointment = await prisma.appointment.findFirst({
        where: { id: appointmentId, patientId },
        select: { id: true },
      });
      if (!appointment) {
        return NextResponse.json({ error: 'Appointment not found for this patient' }, { status: 404 });
      }
    }

    const encounter = await prisma.clinicalEncounter.create({
      data: {
        patientId,
        providerId,
        appointmentId: appointmentId ?? null,
        scheduledAt: new Date(scheduledAt),
        chiefComplaint: chiefComplaint ?? null,
        status: 'SCHEDULED',
      },
      select: {
        id: true,
        status: true,
        chiefComplaint: true,
        scheduledAt: true,
        patientId: true,
        providerId: true,
        appointmentId: true,
      },
    });

    logger.info({ encounterId: encounter.id, patientId, providerId }, 'Encounter created');

    return NextResponse.json({ success: true, data: encounter }, { status: 201 });
  },
  { roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN'], audit: { action: 'CREATE', resource: 'Encounter' } }
);
