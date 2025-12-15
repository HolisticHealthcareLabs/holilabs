/**
 * Referral Rewards API
 *
 * GET /api/referrals/rewards - Get user's referral rewards
 * POST /api/referrals/rewards - Claim a referral reward
 *
 * @compliance GDPR Art. 6 (Lawful processing)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { claimReferralReward, checkAndGrantReward } from '@/lib/referral';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/referrals/rewards
 *
 * Get user's pending and claimed rewards
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

    // Check if user is eligible for new rewards
    const eligibilityCheck = await checkAndGrantReward(userId);

    // Get all user's rewards
    const rewards = await prisma.referralReward.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Audit log
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
  } catch (error) {
    console.error('[Referral Rewards API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get rewards',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/referrals/rewards
 *
 * Claim a pending reward
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

    // Parse request body
    const body = await request.json();

    if (!body.rewardId) {
      return NextResponse.json(
        { error: 'Missing required field: rewardId' },
        { status: 400 }
      );
    }

    // Claim reward
    const claimedReward = await claimReferralReward(body.rewardId, userId);

    // Audit log
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
  } catch (error) {
    console.error('[Referral Rewards API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to claim reward',
      },
      { status: 500 }
    );
  }
}
