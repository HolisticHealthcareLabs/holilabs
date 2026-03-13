import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { createProtectedRoute } from '@/lib/api/middleware';
import { isResendConfigured, sendApprovalInvite } from '@/lib/email/resend';

export const POST = createProtectedRoute(
  async (_request: NextRequest, context: any) => {
    const id = context.params?.id;

    if (!id) {
      return NextResponse.json({ error: 'Missing entry ID' }, { status: 400 });
    }

    const entry = await prisma.waitlistEntry.findUnique({ where: { id } });

    if (!entry) {
      return NextResponse.json({ error: 'Waitlist entry not found' }, { status: 404 });
    }

    if (entry.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Entry already ${entry.status.toLowerCase()}` },
        { status: 409 }
      );
    }

    const updated = await prisma.waitlistEntry.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
      },
    });

    const onboardingLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/onboarding/welcome?leadId=${id}`;

    // Send approval invite email
    let emailSent = false;
    if (isResendConfigured()) {
      try {
        const result = await sendApprovalInvite(updated.email, updated.firstName, onboardingLink);
        emailSent = result.success;
      } catch (err) {
        logger.error({
          event: 'approval_invite_email_failed',
          entryId: id,
          email: updated.email,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (!emailSent) {
      logger.info({
        event: 'approval_invite_link_generated',
        entryId: id,
        email: updated.email,
        note: 'Email not sent — link returned in response for manual delivery',
      });
    }

    return NextResponse.json({
      success: true,
      entry: updated,
      onboardingLink,
      emailSent,
    });
  },
  { roles: ['ADMIN' as any], audit: { action: 'UPDATE', resource: 'WaitlistApproval' } }
);
