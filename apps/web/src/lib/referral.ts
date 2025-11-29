/**
 * Referral System Utilities
 *
 * Handles referral code generation, validation, and reward calculation
 *
 * @compliance GDPR Art. 6 (Lawful processing), LGPD Art. 7 (Consent)
 */

import { prisma } from '@/lib/prisma';
import type { ReferralRewardType, ReferralStatus } from '@prisma/client';

/**
 * Generate a unique referral code for a user
 *
 * Format: HOLI-{INITIALS}-{RANDOM}
 * Example: HOLI-JS-X3K2 (for Dr. John Smith)
 *
 * @param userId - User ID
 * @param firstName - User's first name
 * @param lastName - User's last name
 * @returns Unique referral code
 */
export async function generateReferralCode(
  userId: string,
  firstName: string,
  lastName: string
): Promise<string> {
  // Extract initials
  const initials = `${firstName[0]}${lastName[0]}`.toUpperCase();

  // Generate random alphanumeric string (4 chars)
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();

  // Format: HOLI-XX-XXXX
  let code = `HOLI-${initials}-${randomChars}`;

  // Check for collisions (rare, but possible)
  let attempts = 0;
  while (attempts < 5) {
    const existing = await prisma.referralCode.findUnique({
      where: { code },
    });

    if (!existing) {
      return code;
    }

    // Collision detected, regenerate
    const newRandom = Math.random().toString(36).substring(2, 6).toUpperCase();
    code = `HOLI-${initials}-${newRandom}`;
    attempts++;
  }

  // Fallback to UUID-based code if still colliding
  const uuid = crypto.randomUUID().substring(0, 8).toUpperCase();
  return `HOLI-${initials}-${uuid}`;
}

/**
 * Create or retrieve referral code for user
 *
 * @param userId - User ID
 * @param firstName - User's first name
 * @param lastName - User's last name
 * @returns ReferralCode object
 */
export async function getOrCreateReferralCode(
  userId: string,
  firstName: string,
  lastName: string
) {
  // Check if user already has a referral code
  const existing = await prisma.referralCode.findFirst({
    where: { userId },
    include: {
      referrals: {
        include: {
          refereeUser: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (existing) {
    return existing;
  }

  // Generate new referral code
  const code = await generateReferralCode(userId, firstName, lastName);

  const newReferralCode = await prisma.referralCode.create({
    data: {
      userId,
      code,
      rewardType: 'PREVENTION_UNLOCK',
      rewardValue: 6, // 6 months of prevention alerts
      requiredReferrals: 3, // Need 3 successful referrals
    },
    include: {
      referrals: true,
    },
  });

  return newReferralCode;
}

/**
 * Track referral invitation
 *
 * @param referralCodeId - Referral code ID
 * @param refereeEmail - Email of person being invited
 * @param utmParams - UTM tracking parameters
 * @returns Referral object
 */
export async function trackReferralInvitation(
  referralCodeId: string,
  refereeEmail: string,
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
  }
) {
  // Check if this email was already invited by this code
  const existing = await prisma.referral.findFirst({
    where: {
      referralCodeId,
      refereeEmail,
    },
  });

  if (existing) {
    return existing;
  }

  // Create new referral tracking
  const referral = await prisma.referral.create({
    data: {
      referralCodeId,
      refereeEmail,
      status: 'INVITED',
      utmSource: utmParams?.source || 'dashboard',
      utmMedium: utmParams?.medium || 'referral',
      utmCampaign: utmParams?.campaign || 'founder-promo',
    },
  });

  // Increment times used
  await prisma.referralCode.update({
    where: { id: referralCodeId },
    data: {
      timesUsed: {
        increment: 1,
      },
    },
  });

  return referral;
}

/**
 * Update referral status when referee signs up
 *
 * @param refereeEmail - Email of referee
 * @param refereeUserId - User ID of referee
 */
export async function updateReferralSignup(
  refereeEmail: string,
  refereeUserId: string
) {
  // Find pending referral
  const referral = await prisma.referral.findFirst({
    where: {
      refereeEmail,
      status: {
        in: ['INVITED', 'CLICKED'],
      },
    },
    include: {
      referralCode: true,
    },
  });

  if (!referral) {
    return null;
  }

  // Update referral status
  const updated = await prisma.referral.update({
    where: { id: referral.id },
    data: {
      refereeUserId,
      status: 'SIGNED_UP',
      signedUpAt: new Date(),
    },
  });

  // Increment successful signups
  await prisma.referralCode.update({
    where: { id: referral.referralCodeId },
    data: {
      successfulSignups: {
        increment: 1,
      },
    },
  });

  return updated;
}

/**
 * Check if referrer should receive reward
 *
 * @param userId - Referrer user ID
 */
export async function checkAndGrantReward(userId: string) {
  const referralCode = await prisma.referralCode.findFirst({
    where: { userId },
    include: {
      referrals: {
        where: {
          status: {
            in: ['TRIAL_COMPLETED', 'CONVERTED'],
          },
        },
      },
    },
  });

  if (!referralCode) {
    return null;
  }

  const eligibleReferrals = referralCode.referrals.length;

  // Check if threshold is met
  if (eligibleReferrals < referralCode.requiredReferrals) {
    return {
      eligible: false,
      progress: eligibleReferrals,
      required: referralCode.requiredReferrals,
    };
  }

  // Check if reward already granted
  const existingReward = await prisma.referralReward.findFirst({
    where: {
      userId,
      status: {
        in: ['PENDING', 'CLAIMED'],
      },
    },
  });

  if (existingReward) {
    return {
      eligible: true,
      alreadyGranted: true,
      reward: existingReward,
    };
  }

  // Grant reward
  const reward = await prisma.referralReward.create({
    data: {
      userId,
      rewardType: referralCode.rewardType,
      rewardValue: referralCode.rewardValue,
      rewardDescription: `Unlock Prevention Alerts for ${referralCode.rewardValue} months`,
      status: 'PENDING',
      triggeringReferralIds: referralCode.referrals.map((r) => r.id),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days to claim
    },
  });

  // Update referral code stats
  await prisma.referralCode.update({
    where: { id: referralCode.id },
    data: {
      activeReferrals: eligibleReferrals,
      rewardsClaimed: {
        increment: 1,
      },
    },
  });

  return {
    eligible: true,
    alreadyGranted: false,
    reward,
  };
}

/**
 * Claim a referral reward
 *
 * @param rewardId - Reward ID
 * @param userId - User ID claiming the reward
 */
export async function claimReferralReward(rewardId: string, userId: string) {
  const reward = await prisma.referralReward.findUnique({
    where: { id: rewardId },
  });

  if (!reward) {
    throw new Error('Reward not found');
  }

  if (reward.userId !== userId) {
    throw new Error('Unauthorized');
  }

  if (reward.status !== 'PENDING') {
    throw new Error('Reward already claimed or expired');
  }

  if (reward.expiresAt && reward.expiresAt < new Date()) {
    // Mark as expired
    await prisma.referralReward.update({
      where: { id: rewardId },
      data: { status: 'EXPIRED' },
    });
    throw new Error('Reward has expired');
  }

  // Claim reward
  const claimed = await prisma.referralReward.update({
    where: { id: rewardId },
    data: {
      status: 'CLAIMED',
      claimedAt: new Date(),
    },
  });

  // TODO: Apply reward to user's account (unlock prevention alerts)
  // This would update the user's subscription tier or feature flags

  return claimed;
}

/**
 * Get referral stats for a user
 *
 * @param userId - User ID
 */
export async function getReferralStats(userId: string) {
  const referralCode = await prisma.referralCode.findFirst({
    where: { userId },
    include: {
      referrals: {
        include: {
          refereeUser: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!referralCode) {
    return null;
  }

  // Calculate viral coefficient (K-factor)
  const converted = referralCode.referrals.filter((r) =>
    ['TRIAL_COMPLETED', 'CONVERTED'].includes(r.status)
  ).length;
  const invited = referralCode.timesUsed;
  const viralCoefficient = invited > 0 ? converted / invited : 0;

  // Group by status
  const byStatus = referralCode.referrals.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    {} as Record<ReferralStatus, number>
  );

  return {
    code: referralCode.code,
    totalInvited: referralCode.timesUsed,
    successfulSignups: referralCode.successfulSignups,
    activeReferrals: referralCode.activeReferrals,
    rewardsClaimed: referralCode.rewardsClaimed,
    viralCoefficient,
    byStatus,
    referrals: referralCode.referrals,
    progressToReward: {
      current: converted,
      required: referralCode.requiredReferrals,
      percentage: Math.min(
        100,
        Math.round((converted / referralCode.requiredReferrals) * 100)
      ),
    },
  };
}

/**
 * Validate referral code
 *
 * @param code - Referral code
 * @returns ReferralCode object if valid, null otherwise
 */
export async function validateReferralCode(code: string) {
  const referralCode = await prisma.referralCode.findUnique({
    where: { code },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          specialty: true,
        },
      },
    },
  });

  if (!referralCode) {
    return null;
  }

  if (!referralCode.isActive) {
    return null;
  }

  if (referralCode.expiresAt && referralCode.expiresAt < new Date()) {
    return null;
  }

  return referralCode;
}
