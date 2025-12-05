/**
 * Patient Access Log API
 * Shows who accessed patient's data (HIPAA requirement)
 *
 * GET /api/portal/access-log?patientId={id}
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // TODO: Add patient session authentication
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
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
    console.error('Error fetching access log:', error);
    return NextResponse.json({ error: 'Failed to fetch access log' }, { status: 500 });
  }
}
