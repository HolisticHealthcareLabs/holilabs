/**
 * Patient Access Log API
 * Shows who accessed patient's data (HIPAA requirement)
 *
 * GET /api/portal/access-log?patientId={id}
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPatientSession } from '@/lib/auth/patient-session';
import logger from '@/lib/logger';
import { createPublicRoute } from '@/lib/api/middleware';

export const GET = createPublicRoute(
  async (request: NextRequest) => {
  try {
    const session = await getPatientSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (patientId && patientId !== session.patientId) {
      return NextResponse.json({ error: 'Forbidden: can only view your own access log' }, { status: 403 });
    }
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    if (!patientId) {
      return NextResponse.json({ error: 'patientId required' }, { status: 400 });
    }

    // Fetch audit logs where patient was accessed
    const accessLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { resource: 'Patient', resourceId: patientId },
          { details: { path: ['patientId'], equals: patientId } },
        ],
        action: { in: ['READ', 'ACCESS', 'VIEW', 'UPDATE'] },
      },
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit,
    });

    // Enrich with user details
    const enrichedLogs = await Promise.all(
      accessLogs.map(async (log) => {
        let accessedBy = 'Unknown';
        let role = 'Unknown';
        let specialty = null;

        if (log.userId) {
          const user = await prisma.user.findUnique({
            where: { id: log.userId },
            select: { firstName: true, lastName: true, role: true, specialty: true },
          });
          if (user) {
            accessedBy = `${user.firstName} ${user.lastName}`;
            role = user.role;
            specialty = user.specialty;
          }
        }

        return {
          id: log.id,
          timestamp: log.timestamp,
          accessedBy,
          role,
          specialty,
          action: log.action,
          resource: log.resource,
          ipAddress: log.ipAddress,
          details: log.details,
        };
      })
    );

    const total = await prisma.auditLog.count({
      where: {
        OR: [
          { resource: 'Patient', resourceId: patientId },
          { details: { path: ['patientId'], equals: patientId } },
        ],
        action: { in: ['READ', 'ACCESS', 'VIEW', 'UPDATE'] },
      },
    });

    return NextResponse.json({
      success: true,
      data: enrichedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching access log');
    return NextResponse.json({ error: 'Failed to fetch access log' }, { status: 500 });
  }
  },
  { rateLimit: { windowMs: 60 * 1000, maxRequests: 30 } }
);
