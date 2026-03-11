/**
 * Feedback API Endpoint
 *
 * Handles user feedback submissions during A/B testing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { z } from 'zod';
import prisma from '@/lib/prisma';

const feedbackSchema = z.object({
  type: z.enum(['bug', 'feature', 'improvement', 'general']),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
  email: z.string().email().optional().nullable(),
  url: z.string().url().optional(),
  userAgent: z.string().optional(),
});

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const body = await request.json();

    let validatedData;
    try {
      validatedData = feedbackSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            message: 'Please check your input and try again',
            details: error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        );
      }
      throw error;
    }

    const userId = context.user!.id;

    // Store feedback (audit log for now - TODO: create Feedback model)
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        resource: 'feedback',
        resourceId: 'n/a',
        ipAddress: request.headers.get('x-forwarded-for') || '0.0.0.0',
        details: {
          type: validatedData.type,
          messageLength: validatedData.message.length,
          hasEmail: !!validatedData.email,
          url: validatedData.url,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Feedback received successfully',
    });
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
  }
);
