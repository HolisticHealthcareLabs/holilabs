/**
 * Sent Forms API
 *
 * GET /api/forms/sent - List all sent form instances
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where = status && status !== 'all' ? { status } : {};

    const forms = await prisma.formInstance.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        template: {
          select: {
            id: true,
            title: true,
            category: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, forms }, { status: 200 });
  } catch (error) {
    console.error('Error fetching sent forms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sent forms' },
      { status: 500 }
    );
  }
}
