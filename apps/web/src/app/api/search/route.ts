/**
 * Advanced Search API
 * Full-text search across patients, prescriptions, clinical notes, and appointments
 *
 * GET /api/search?query=diabetes&type=all&limit=20
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute, validateQuery } from '@/lib/api/middleware';
import { SearchQuerySchema } from '@/lib/api/schemas';

// Force dynamic rendering - prevents build-time evaluation
export const dynamic = 'force-dynamic';


export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const { query, type, limit, offset } = context.validatedQuery;

    const results: any = {
      query,
      results: {},
      totalResults: 0,
    };

    // Search query pattern for PostgreSQL full-text search
    const searchPattern = `%${query}%`;

    // =========================================================================
    // SEARCH PATIENTS
    // =========================================================================
    if (type === 'patients' || type === 'all') {
      const patients = await prisma.patient.findMany({
        where: {
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { tokenId: { contains: query, mode: 'insensitive' } },
            { mrn: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
          isActive: true,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          tokenId: true,
          ageBand: true,
          region: true,
          assignedClinician: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        take: type === 'all' ? 5 : limit,
        skip: offset,
      });

      results.results.patients = patients.map((p) => ({
        ...p,
        type: 'patient',
        displayName: `${p.firstName} ${p.lastName}`,
        url: `/dashboard/patients/${p.id}`,
      }));
      results.totalResults += patients.length;
    }

    // =========================================================================
    // SEARCH PRESCRIPTIONS
    // =========================================================================
    if (type === 'prescriptions' || type === 'all') {
      const prescriptions = await prisma.prescription.findMany({
        where: {
          OR: [
            { instructions: { contains: query, mode: 'insensitive' } },
            { diagnosis: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
              tokenId: true,
            },
          },
          clinician: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        take: type === 'all' ? 5 : limit,
        skip: offset,
      });

      results.results.prescriptions = prescriptions.map((p) => ({
        id: p.id,
        type: 'prescription',
        patient: `${p.patient.firstName} ${p.patient.lastName}`,
        clinician: `Dr. ${p.clinician.firstName} ${p.clinician.lastName}`,
        medications: p.medications,
        signedAt: p.signedAt,
        status: p.status,
        url: `/dashboard/patients/${p.patientId}`,
      }));
      results.totalResults += prescriptions.length;
    }

    // =========================================================================
    // SEARCH CLINICAL NOTES
    // =========================================================================
    if (type === 'clinical_notes' || type === 'all') {
      const clinicalNotes = await prisma.clinicalNote.findMany({
        where: {
          OR: [
            { chiefComplaint: { contains: query, mode: 'insensitive' } },
            { subjective: { contains: query, mode: 'insensitive' } },
            { objective: { contains: query, mode: 'insensitive' } },
            { assessment: { contains: query, mode: 'insensitive' } },
            { plan: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
              tokenId: true,
            },
          },
        },
        take: type === 'all' ? 5 : limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      });

      results.results.clinicalNotes = clinicalNotes.map((n) => ({
        id: n.id,
        type: 'clinical_note',
        noteType: n.type,
        chiefComplaint: n.chiefComplaint,
        patient: `${n.patient.firstName} ${n.patient.lastName}`,
        authorId: n.authorId,
        createdAt: n.createdAt,
        url: `/dashboard/patients/${n.patientId}`,
      }));
      results.totalResults += clinicalNotes.length;
    }

    // =========================================================================
    // SEARCH APPOINTMENTS
    // =========================================================================
    if (type === 'appointments' || type === 'all') {
      const appointments = await prisma.appointment.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
              tokenId: true,
            },
          },
          clinician: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        take: type === 'all' ? 5 : limit,
        skip: offset,
        orderBy: { startTime: 'desc' },
      });

      results.results.appointments = appointments.map((a) => ({
        id: a.id,
        type: 'appointment',
        title: a.title,
        patient: `${a.patient.firstName} ${a.patient.lastName}`,
        clinician: `Dr. ${a.clinician.firstName} ${a.clinician.lastName}`,
        startTime: a.startTime,
        status: a.status,
        url: `/dashboard/patients/${a.patientId}`,
      }));
      results.totalResults += appointments.length;
    }

    // =========================================================================
    // CALCULATE SEARCH STATISTICS
    // =========================================================================
    results.stats = {
      patients: results.results.patients?.length || 0,
      prescriptions: results.results.prescriptions?.length || 0,
      clinicalNotes: results.results.clinicalNotes?.length || 0,
      appointments: results.results.appointments?.length || 0,
    };

    // Log search for analytics
    await prisma.auditLog.create({
      data: {
        userId: context.user?.id,
        userEmail: context.user?.email || 'system',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'READ',
        resource: 'Search',
        resourceId: 'N/A',
        success: true,
        details: {
          query,
          type,
          resultsCount: results.totalResults,
        },
      },
    }).catch((err) => console.error('Search audit log failed:', err));

    return NextResponse.json({
      success: true,
      data: results,
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
    skipCsrf: true, // GET requests don't need CSRF protection
  }
);

// Note: Validation already applied via createProtectedRoute
// No need for additional wrapper
