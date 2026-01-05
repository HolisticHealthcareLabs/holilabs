/**
 * Patient Medical Records API
 *
 * GET /api/portal/records
 * Fetch all medical records (SOAP notes) for authenticated patient
 * with filtering, pagination, and search
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

// Query parameters schema
const RecordsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  startDate: z.string().optional(), // ISO date
  endDate: z.string().optional(), // ISO date
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'SIGNED', 'AMENDED', 'ADDENDUM']).optional(),
  sortBy: z.enum(['createdAt', 'signedAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export async function GET(request: NextRequest) {
  try {
    // Authenticate patient
    const session = await requirePatientSession();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryValidation = RecordsQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      status: searchParams.get('status'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: queryValidation.error.errors,
        },
        { status: 400 }
      );
    }

    const {
      page,
      limit,
      search,
      startDate,
      endDate,
      status,
      sortBy,
      sortOrder,
    } = queryValidation.data;

    // Build filter conditions
    const where: any = {
      patientId: session.patientId,
    };

    // Search filter (searches in subjective, objective, assessment, plan)
    if (search) {
      where.OR = [
        { subjective: { contains: search, mode: 'insensitive' } },
        { objective: { contains: search, mode: 'insensitive' } },
        { assessment: { contains: search, mode: 'insensitive' } },
        { plan: { contains: search, mode: 'insensitive' } },
        { chiefComplaint: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch records with pagination
    const [records, totalCount] = await Promise.all([
      prisma.sOAPNote.findMany({
        where,
        include: {
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              specialty: true,
            },
          },
          session: {
            select: {
              id: true,
              audioDuration: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.sOAPNote.count({ where }),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // HIPAA Audit Log: Patient accessed their medical records list
    await createAuditLog({
      userId: session.patientId,
      userEmail: session.email || 'patient@portal.access',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      action: 'READ',
      resource: 'SOAPNote',
      resourceId: session.patientId,
      details: {
        patientId: session.patientId,
        recordCount: records.length,
        filters: { search, startDate, endDate, status },
        pagination: { page, limit },
        accessType: 'PATIENT_RECORDS_LIST',
      },
      success: true,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          records,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages,
            hasNextPage,
            hasPrevPage,
          },
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
      event: 'patient_records_fetch_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al cargar registros médicos.',
      },
      { status: 500 }
    );
  }
}
