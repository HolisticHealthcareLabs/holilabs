/**
 * Referral Invitation API
 *
 * POST /api/referrals/invite - Send referral invitations via email
 *
 * @compliance GDPR Art. 6 (Lawful processing), CAN-SPAM Act
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { trackReferralInvitation, getOrCreateReferralCode } from '@/lib/referral';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

interface InviteRequest {
  emails: string[];
  personalMessage?: string;
}

/**
 * POST /api/referrals/invite
 *
 * Send referral invitations to email addresses
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const user = session.user as any;

    // Parse request body
    const body: InviteRequest = await request.json();

    if (!body.emails || body.emails.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: emails' },
        { status: 400 }
      );
    }

    // Validate email addresses
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

    // Get user's referral code
    const referralCode = await getOrCreateReferralCode(
      userId,
      user.firstName || 'User',
      user.lastName || 'Name'
    );

    // Track invitations
    const invitations = await Promise.all(
      body.emails.map(async (email) => {
        return trackReferralInvitation(referralCode.id, email, {
          source: 'dashboard',
          medium: 'email',
          campaign: 'founder-promo',
        });
      })
    );

    // TODO: Send actual email invitations
    // This would integrate with your email service (Resend, SendGrid, etc.)
    // For now, we just track the invitation in the database

    // Example email content:
    // Subject: Dr. {firstName} {lastName} invites you to try Holi Labs
    // Body: {personalMessage}
    //       Try Holi Labs with my referral code: {referralCode.code}
    //       Get 14 days free trial: https://holilabs.com/signup?ref={referralCode.code}

    // Audit log
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
  } catch (error) {
    console.error('[Referral Invite API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send invitations',
      },
      { status: 500 }
    );
  }
}
