/**
 * Pain Assessments API
 *
 * GET  /api/pain-assessments - List pain assessments for a patient
 * POST /api/pain-assessments - Create new pain assessment
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pain-assessments?patientId=xxx
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const { searchParams } = new URL(request.url);
      const patientId = searchParams.get('patientId');
      const limit = parseInt(searchParams.get('limit') || '50');

      if (!patientId) {
        return NextResponse.json(
          { error: 'patientId is required' },
          { status: 400 }
        );
      }

      // Get pain assessments for patient
      const assessments = await prisma.painAssessment.findMany({
        where: { patientId },
        orderBy: { assessedAt: 'desc' },
        take: limit,
      });

      // Calculate pain trend
      const avgPainScore = assessments.length > 0
        ? assessments.reduce((sum, a) => sum + a.painScore, 0) / assessments.length
        : 0;

      return NextResponse.json({
        success: true,
        data: assessments,
        stats: {
          count: assessments.length,
          avgPainScore: Math.round(avgPainScore * 10) / 10,
          latestScore: assessments[0]?.painScore || 0,
        },
      });
    } catch (error: any) {
      console.error('Error fetching pain assessments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pain assessments', message: error.message },
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
 * POST /api/pain-assessments
 */
const CreatePainAssessmentSchema = z.object({
  patientId: z.string().cuid(),
  painScore: z.number().int().min(0).max(10),
  painType: z.enum(['ACUTE', 'CHRONIC', 'BREAKTHROUGH', 'NEUROPATHIC', 'VISCERAL', 'SOMATIC']).optional(),
  location: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  quality: z.array(z.string()).max(10),
  timing: z.string().max(100).optional(),
  aggravatingFactors: z.array(z.string()).max(10),
  relievingFactors: z.array(z.string()).max(10),
  functionalImpact: z.string().max(1000).optional(),
  sleepImpact: z.string().max(500).optional(),
  moodImpact: z.string().max(500).optional(),
  interventionsGiven: z.array(z.string()).max(20),
  responseToTreatment: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
});

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();
      const validatedData = CreatePainAssessmentSchema.parse(body);

      const assessment = await prisma.painAssessment.create({
        data: {
          patientId: validatedData.patientId,
          painScore: validatedData.painScore,
          painType: validatedData.painType,
          location: validatedData.location,
          description: validatedData.description,
          quality: validatedData.quality,
          timing: validatedData.timing,
          aggravatingFactors: validatedData.aggravatingFactors,
          relievingFactors: validatedData.relievingFactors,
          functionalImpact: validatedData.functionalImpact,
          sleepImpact: validatedData.sleepImpact,
          moodImpact: validatedData.moodImpact,
          interventionsGiven: validatedData.interventionsGiven,
          responseToTreatment: validatedData.responseToTreatment,
          assessedAt: new Date(),
          assessedBy: context.user.id,
          notes: validatedData.notes,
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: context.user.id,
          userEmail: context.user.email || 'unknown',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          action: 'CREATE',
          resource: 'PainAssessment',
          resourceId: assessment.id,
          details: {
            patientId: validatedData.patientId,
            painScore: validatedData.painScore,
          },
          success: true,
        },
      });

      return NextResponse.json({
        success: true,
        data: assessment,
        message: 'Pain assessment recorded successfully',
      }, { status: 201 });
    } catch (error: any) {
      console.error('Error creating pain assessment:', error);

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
        { error: 'Failed to create pain assessment', message: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
  }
);
