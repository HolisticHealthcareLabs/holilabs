/**
 * Screening Triggers API
 *
 * POST /api/prevention/screening-triggers - Generate screening reminders for a patient
 * POST /api/prevention/screening-triggers/batch - Generate for all active patients (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  generateDueScreenings,
  createScreeningReminders,
  autoGenerateScreeningReminders,
} from '@/lib/prevention/screening-triggers';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const TriggerSchema = z.object({
  patientId: z.string().uuid(),
});

/**
 * POST /api/prevention/screening-triggers
 * Generate screening reminders for a specific patient
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Check for batch generation request
    if (body.batch === true) {
      // Admin-only for batch generation
      const user = await prisma?.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });

      if (user?.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Admin access required for batch generation' },
          { status: 403 }
        );
      }

      const result = await autoGenerateScreeningReminders();

      return NextResponse.json({
        success: true,
        message: 'Batch screening reminders generated',
        data: result,
      });
    }

    // Single patient generation
    const validation = TriggerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { patientId } = validation.data;

    // Get due screenings
    const dueScreenings = await generateDueScreenings(patientId);

    // Create reminders
    const remindersCreated = await createScreeningReminders(
      patientId,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      message: `Generated ${remindersCreated} screening reminders`,
      data: {
        patientId,
        dueScreenings: dueScreenings.map((s) => ({
          name: s.rule.name,
          screeningType: s.rule.screeningType,
          uspstfGrade: s.rule.uspstfGrade,
          dueDate: s.dueDate,
          overdueDays: s.overdueDays,
          priority: s.rule.priority,
        })),
        remindersCreated,
      },
    });
  } catch (error) {
    console.error('Error generating screening reminders:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate screening reminders',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/prevention/screening-triggers?patientId=xxx
 * Get due screenings for a patient (without creating reminders)
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

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
      return NextResponse.json(
        { error: 'patientId query parameter required' },
        { status: 400 }
      );
    }

    const dueScreenings = await generateDueScreenings(patientId);

    return NextResponse.json({
      success: true,
      data: {
        patientId,
        dueScreenings: dueScreenings.map((s) => ({
          name: s.rule.name,
          screeningType: s.rule.screeningType,
          uspstfGrade: s.rule.uspstfGrade,
          dueDate: s.dueDate,
          overdueDays: s.overdueDays,
          priority: s.rule.priority,
          lastScreeningDate: s.lastScreeningDate,
          clinicalRecommendation: s.rule.clinicalRecommendation,
          guidelineSource: s.rule.guidelineSource,
        })),
        totalDue: dueScreenings.length,
      },
    });
  } catch (error) {
    console.error('Error fetching due screenings:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch due screenings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
