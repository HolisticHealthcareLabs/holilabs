/**
 * Clinician Registration API
 *
 * POST /api/auth/register - Request access to the platform
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withValidation, registrationSchema } from '@/lib/validation';
import logger from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Apply rate limiting - 5 requests per minute for auth endpoints
  const rateLimitResponse = await checkRateLimit(request, 'auth');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // Validate input
    const validation = await withValidation(registrationSchema)(request);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const { firstName, lastName, email, role, organization, reason } = validation.data;

    // Check if email already exists (either as clinician user or pending registration)
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Don't reveal if email exists (security)
      logger.info({
        event: 'registration_attempt_existing_email',
        // email removed for PHI compliance
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Registration request received. Our team will contact you within 24-48 hours.',
        },
        { status: 200 }
      );
    }

    // For now, log the registration request
    // In production, you would:
    // 1. Store in a "pending registrations" table
    // 2. Send email to admin for approval
    // 3. Send confirmation email to user

    logger.info({
      event: 'clinician_registration_request',
      // Personal data removed for PHI compliance
      role,
      organization,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });

    // TODO: Send email to admin team
    // TODO: Store in pending registrations table

    return NextResponse.json(
      {
        success: true,
        message: 'Registration request received. Our team will contact you within 24-48 hours.',
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: 'registration_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        error: 'Failed to process registration request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
