/**
 * Care Plans API
 *
 * GET  /api/care-plans - List care plans for a patient
 * POST /api/care-plans - Create new care plan
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

/**
 * GET /api/care-plans?patientId=xxx
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const { searchParams } = new URL(request.url);
      const patientId = searchParams.get('patientId');

      if (!patientId) {
        return NextResponse.json(
          { error: 'patientId is required' },
          { status: 400 }
        );
      }

      // Get all care plans for patient
      const carePlans = await prisma.carePlan.findMany({
        where: { patientId },
        orderBy: [
          { status: 'asc' }, // ACTIVE first
          { createdAt: 'desc' },
        ],
      });

      return NextResponse.json({
        success: true,
        data: carePlans,
      });
    } catch (error: any) {
      console.error('Error fetching care plans:', error);
      return NextResponse.json(
        { error: 'Failed to fetch care plans', message: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 100 },
  }
);

/**
 * POST /api/care-plans
 */
const CreateCarePlanSchema = z.object({
  patientId: z.string().cuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.enum([
    'PAIN_MANAGEMENT',
    'SYMPTOM_CONTROL',
    'PSYCHOSOCIAL_SUPPORT',
    'SPIRITUAL_CARE',
    'FAMILY_SUPPORT',
    'QUALITY_OF_LIFE',
    'END_OF_LIFE_PLANNING',
    'MOBILITY',
    'NUTRITION',
    'WOUND_CARE',
  ]),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  goals: z.array(z.string()).min(1).max(10),
  targetDate: z.string().datetime().or(z.date()).optional(),
  assignedTeam: z.array(z.string().cuid()).max(20),
});

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();
      const validatedData = CreateCarePlanSchema.parse(body);

      const carePlan = await prisma.carePlan.create({
        data: {
          patientId: validatedData.patientId,
          title: validatedData.title,
          description: validatedData.description,
          category: validatedData.category,
          priority: validatedData.priority,
          goals: validatedData.goals,
          targetDate: validatedData.targetDate ? new Date(validatedData.targetDate) : null,
          status: 'ACTIVE',
          assignedTeam: validatedData.assignedTeam,
          progressNotes: [],
          createdBy: context.user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: context.user.id,
          userEmail: context.user.email || 'unknown',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          action: 'CREATE',
          resource: 'CarePlan',
          resourceId: carePlan.id,
          details: {
            patientId: validatedData.patientId,
            category: validatedData.category,
            title: validatedData.title,
          },
          success: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: carePlan,
        message: 'Care plan created successfully',
      }, { status: 201 });
    } catch (error: any) {
      console.error('Error creating care plan:', error);

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create care plan', message: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
  }
);
