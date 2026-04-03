/**
 * Global Patient Search API
 *
 * Searches patients by: name, MRN, token ID, CPF, phone, email
 * Supports fuzzy search with typo tolerance
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import logger from '@/lib/logger';
import { safeErrorResponse } from '@/lib/api/safe-error-response';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      // Get search query
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q')?.trim();
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.length < 2) {
      return NextResponse.json({ patients: [] });
    }

    // Scope search by workspace: ADMIN sees all patients in their workspace,
    // non-ADMIN sees only their assigned patients (CYRUS CVI-002 tenant isolation)
    const isAdmin = context.user?.role === 'ADMIN';
    let clinicianFilter: Record<string, unknown>;

    if (isAdmin && context.user?.organizationId) {
      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId: context.user.organizationId },
        select: { userId: true },
      });
      const memberIds = members.map((m: { userId: string }) => m.userId);
      clinicianFilter = memberIds.length > 0
        ? { assignedClinicianId: { in: memberIds } }
        : { assignedClinicianId: context.user!.id };
    } else {
      clinicianFilter = { assignedClinicianId: context.user!.id };
    }

    // Search patients with fuzzy matching
    const patients = await prisma.patient.findMany({
      where: {
        ...clinicianFilter,
        OR: [
          {
            firstName: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            lastName: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            mrn: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            tokenId: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            phone: {
              contains: query.replace(/\D/g, ''),
            },
          },
        ],
      },
      select: {
        id: true,
        tokenId: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        mrn: true,
        phone: true,
        gender: true,
        isActive: true,
        isPalliativeCare: true,
        updatedAt: true,
      },
      orderBy: [
        { isActive: 'desc' },
        { updatedAt: 'desc' },
      ],
      take: limit,
    });

    // Calculate age for each patient
    const patientsWithAge = patients.map(patient => {
      let age: number | null = null;
      if (patient.dateOfBirth) {
        const today = new Date();
        const birthDate = new Date(patient.dateOfBirth);
        age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }

      return {
        ...patient,
        age,
      };
    });

    // HIPAA Audit Log: Track patient searches (sensitive PHI access)
    await createAuditLog({
      action: 'SEARCH' as any,
      resource: 'Patient',
      resourceId: 'SEARCH_QUERY',
      details: {
        searchQuery: query,
        resultCount: patientsWithAge.length,
        searchType: 'GLOBAL_PATIENT_SEARCH',
        patientIds: patientsWithAge.map(p => p.id),
      },
      success: true,
    });

    return NextResponse.json({
      patients: patientsWithAge,
      query,
      count: patientsWithAge.length,
    });
  } catch (error) {
    logger.error({
      event: 'patient_search_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return safeErrorResponse(error, { userMessage: 'Failed to search patients' });
  }
},
  { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'], skipCsrf: true }
);
