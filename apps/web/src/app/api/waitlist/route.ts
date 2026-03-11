import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { isResendConfigured, sendWaitlistConfirmation } from '@/lib/email/resend';
import { createPublicRoute } from '@/lib/api/middleware';

export const POST = createPublicRoute(async (request: Request) => {
  try {
    const body = await request.json();
    const { email, name, organization, plan } = body;

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    // Split name into first/last if provided
    const nameParts = name ? String(name).trim().split(/\s+/) : [];
    const firstName = nameParts[0] || null;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

    // Upsert: if they re-submit, update their info instead of erroring
    const entry = await prisma.waitlistEntry.upsert({
      where: { email },
      create: {
        email,
        firstName,
        lastName,
        companyName: organization || null,
        plan: plan || null,
      },
      update: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        companyName: organization || undefined,
        plan: plan || undefined,
      },
    });

    logger.info({
      event: 'waitlist_signup',
      entryId: entry.id,
      email,
      plan: plan || 'none',
    });

    // Fire-and-forget: email failure must not block the 200 response
    if (isResendConfigured()) {
      sendWaitlistConfirmation(email, firstName).catch((err) => {
        logger.error({
          event: 'waitlist_confirmation_email_failed',
          email,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully joined the waitlist!',
    });
  } catch (error) {
    logger.error({
      event: 'waitlist_signup_failed',
      error: error instanceof Error ? error.message : String(error),
    });
    return safeErrorResponse(error, { userMessage: 'Failed to join waitlist. Please try again.' });
  }
});
