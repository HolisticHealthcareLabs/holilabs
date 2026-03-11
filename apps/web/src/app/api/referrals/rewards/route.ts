/**
 * Referral Rewards API
 *
 * GET /api/referrals/rewards - Get user's referral rewards
 * POST /api/referrals/rewards - Claim a referral reward
 *
 * @compliance GDPR Art. 6 (Lawful processing)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { claimReferralReward, checkAndGrantReward } from '@/lib/referral';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const userId = context.user!.id;

    const eligibilityCheck = await checkAndGrantReward(userId);

    const rewards = await prisma.referralReward.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    await createAuditLog(
      {
        action: 'READ',
        resource: 'ReferralReward',
        resourceId: userId,
        details: {
          rewardCount: rewards.length,
        },
        success: true,
      },
      request
    );

    return NextResponse.json({
      success: true,
      eligibilityCheck,
      rewards: rewards.map((r) => ({
        id: r.id,
        rewardType: r.rewardType,
        rewardValue: r.rewardValue,
        rewardDescription: r.rewardDescription,
        status: r.status,
        earnedAt: r.earnedAt,
        claimedAt: r.claimedAt,
        expiresAt: r.expiresAt,
      })),
    });
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
    skipCsrf: true,
  }
);

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const userId = context.user!.id;

    const body = await request.json();

    if (!body.rewardId) {
      return NextResponse.json(
        { error: 'Missing required field: rewardId' },
        { status: 400 }
      );
    }

    const claimedReward = await claimReferralReward(body.rewardId, userId);

    await createAuditLog(
      {
        action: 'UPDATE',
        resource: 'ReferralReward',
        resourceId: claimedReward.id,
        details: {
          rewardType: claimedReward.rewardType,
          rewardValue: claimedReward.rewardValue,
        },
        success: true,
      },
      request
    );

    return NextResponse.json({
      success: true,
      message: 'Reward claimed successfully',
      reward: {
        id: claimedReward.id,
        rewardType: claimedReward.rewardType,
        rewardValue: claimedReward.rewardValue,
        rewardDescription: claimedReward.rewardDescription,
        claimedAt: claimedReward.claimedAt,
      },
    });
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
  }
);
