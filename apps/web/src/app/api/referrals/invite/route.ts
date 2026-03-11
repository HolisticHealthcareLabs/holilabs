/**
 * Referral Invitation API
 *
 * POST /api/referrals/invite - Send referral invitations via email
 *
 * @compliance GDPR Art. 6 (Lawful processing), CAN-SPAM Act
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { trackReferralInvitation, getOrCreateReferralCode } from '@/lib/referral';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

interface InviteRequest {
  emails: string[];
  personalMessage?: string;
}

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const userId = context.user!.id;
    const user = context.user!;

    const body: InviteRequest = await request.json();

    if (!body.emails || body.emails.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: emails' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = body.emails.filter((email) => !emailRegex.test(email));

    if (invalidEmails.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid email addresses',
          invalidEmails,
        },
        { status: 400 }
      );
    }

    const referralCode = await getOrCreateReferralCode(
      userId,
      (user as any).firstName || 'User',
      (user as any).lastName || 'Name'
    );

    const invitations = await Promise.all(
      body.emails.map(async (email) => {
        return trackReferralInvitation(referralCode.id, email, {
          source: 'dashboard',
          medium: 'email',
          campaign: 'founder-promo',
        });
      })
    );

    await createAuditLog(
      {
        action: 'CREATE',
        resource: 'ReferralInvitation',
        resourceId: referralCode.id,
        details: {
          emailCount: body.emails.length,
          referralCode: referralCode.code,
        },
        success: true,
      },
      request
    );

    return NextResponse.json({
      success: true,
      message: `Sent ${invitations.length} referral invitations`,
      invitations: invitations.map((inv) => ({
        id: inv.id,
        email: inv.refereeEmail,
        status: inv.status,
        invitedAt: inv.invitedAt,
      })),
      referralUrl: `${process.env.NEXT_PUBLIC_APP_URL}/signup?ref=${referralCode.code}`,
    });
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
  }
);
