/**
 * Prevention Reminders Aggregate API
 *
 * GET /api/prevention/reminders - List all reminders with filters and stats
 * PATCH /api/prevention/reminders - Bulk update reminder status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/prevention/reminders
 * Get all preventive care reminders with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const screeningType = searchParams.get('screeningType');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    // Build filter conditions
    const whereConditions: any = {};

    if (status) {
      whereConditions.status = status;
    }

    if (priority) {
      whereConditions.priority = priority;
    }

    if (screeningType) {
      whereConditions.screeningType = screeningType;
    }

    if (fromDate || toDate) {
      whereConditions.dueDate = {};
      if (fromDate) whereConditions.dueDate.gte = new Date(fromDate);
      if (toDate) whereConditions.dueDate.lte = new Date(toDate);
    }

    // Get stats
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, overdue, upcoming, completedThisMonth] = await Promise.all([
      prisma.preventiveCareReminder.count(),
      prisma.preventiveCareReminder.count({
        where: { status: 'OVERDUE' },
      }),
      prisma.preventiveCareReminder.count({
        where: {
          status: 'DUE',
          dueDate: { lte: sevenDaysFromNow },
        },
      }),
      prisma.preventiveCareReminder.count({
        where: {
          status: 'COMPLETED',
          completedAt: { gte: startOfMonth },
        },
      }),
    ]);

    // Fetch reminders
    const reminders = await prisma.preventiveCareReminder.findMany({
      where: whereConditions,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        preventionPlan: {
          select: {
            id: true,
            planType: true,
            status: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'asc' },
        { dueDate: 'asc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalFiltered = await prisma.preventiveCareReminder.count({
      where: whereConditions,
    });

    return NextResponse.json({
      success: true,
      data: {
        reminders,
        stats: {
          total,
          overdue,
          upcoming,
          completedThisMonth,
        },
        pagination: {
          page,
          limit,
          totalFiltered,
          totalPages: Math.ceil(totalFiltered / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching reminders:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch reminders',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/prevention/reminders
 * Update a specific reminder's status
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { reminderId, action, reason } = body;

    if (!reminderId || !action) {
      return NextResponse.json(
        { error: 'reminderId and action are required' },
        { status: 400 }
      );
    }

    const reminder = await prisma.preventiveCareReminder.findUnique({
      where: { id: reminderId },
    });

    if (!reminder) {
      return NextResponse.json(
        { error: 'Reminder not found' },
        { status: 404 }
      );
    }

    let updateData: any = { updatedAt: new Date() };

    switch (action) {
      case 'complete':
        updateData.status = 'COMPLETED';
        updateData.completedAt = new Date();
        updateData.completedBy = session.user.id;
        break;
      case 'dismiss':
        updateData.status = 'DISMISSED';
        updateData.dismissedAt = new Date();
        updateData.dismissedBy = session.user.id;
        updateData.dismissalReason = reason || null;
        break;
      case 'schedule':
        updateData.status = 'SCHEDULED';
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: complete, dismiss, or schedule' },
          { status: 400 }
        );
    }

    const updated = await prisma.preventiveCareReminder.update({
      where: { id: reminderId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: `Reminder ${action}d successfully`,
      data: { reminder: updated },
    });
  } catch (error) {
    console.error('Error updating reminder:', error);

    return NextResponse.json(
      {
        error: 'Failed to update reminder',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
