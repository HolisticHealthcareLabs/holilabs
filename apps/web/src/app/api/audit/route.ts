/**
 * Audit Log API
 *
 * POST /api/audit - Create audit log entry
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/audit
 * Create audit log entry for compliance
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const auditLog = await prisma.auditLog.create({
      data: {
        userEmail: body.userEmail || 'system',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        action: body.action,
        resource: body.resource,
        resourceId: body.resourceId || 'N/A',
        details: body.details,
        success: body.success !== false,
      },
    });

    return NextResponse.json(
      { success: true, data: auditLog },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating audit log:', error);
    return NextResponse.json(
      { error: 'Failed to create audit log', details: error.message },
      { status: 500 }
    );
  }
}
