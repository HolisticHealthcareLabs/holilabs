/**
 * Referral Code API
 *
 * GET /api/referrals/code - Get or create user's referral code and stats
 *
 * @compliance GDPR Art. 6 (Lawful processing)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getOrCreateReferralCode, getReferralStats } from '@/lib/referral';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/referrals/code
 *
 * Returns user's referral code and statistics
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
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

    // Get or create referral code
    const referralCode = await getOrCreateReferralCode(
      userId,
      user.firstName || 'User',
      user.lastName || 'Name'
    );

    // Get detailed stats
    const stats = await getReferralStats(userId);

    // Audit log
    await createAuditLog(
      {
        action: 'READ',
        resource: 'ReferralCode',
        resourceId: referralCode.id,
        details: {
          code: referralCode.code,
        },
        success: true,
      },
      request
    );

    return NextResponse.json({
      success: true,
      referralCode: {
        id: referralCode.id,
        code: referralCode.code,
        rewardType: referralCode.rewardType,
        rewardValue: referralCode.rewardValue,
        requiredReferrals: referralCode.requiredReferrals,
        createdAt: referralCode.createdAt,
      },
      stats,
    });
  } catch (error) {
    console.error('[Referral Code API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get referral code',
      },
      { status: 500 }
    );
  }
}
