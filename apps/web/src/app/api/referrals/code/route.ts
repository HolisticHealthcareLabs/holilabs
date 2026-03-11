/**
 * Referral Code API
 *
 * GET /api/referrals/code - Get or create user's referral code and stats
 *
 * @compliance GDPR Art. 6 (Lawful processing)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { getOrCreateReferralCode, getReferralStats } from '@/lib/referral';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const userId = context.user!.id;
    const user = context.user!;

    const referralCode = await getOrCreateReferralCode(
      userId,
      (user as any).firstName || 'User',
      (user as any).lastName || 'Name'
    );

    const stats = await getReferralStats(userId);

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
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
    skipCsrf: true,
  }
);
