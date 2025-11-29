/**
 * Referral Code Validation API
 *
 * POST /api/referrals/validate - Validate a referral code and get referrer info
 *
 * @compliance GDPR Art. 6 (Lawful processing)
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateReferralCode } from '@/lib/referral';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

interface ValidateRequest {
  code: string;
}

/**
 * POST /api/referrals/validate
 *
 * Validate a referral code (public endpoint, no auth required)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    const body: ValidateRequest = await request.json();

    if (!body.code) {
      return NextResponse.json(
        { error: 'Missing required field: code' },
        { status: 400 }
      );
    }

    // Validate referral code
    const referralCode = await validateReferralCode(body.code);

    if (!referralCode) {
      // Audit log (failed validation)
      await createAuditLog(
        {
          action: 'READ',
          resource: 'ReferralCode',
          resourceId: 'invalid',
          details: {
            code: body.code,
            reason: 'Invalid or expired code',
          },
          success: false,
        },
        request
      );

      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: 'Invalid or expired referral code',
        },
        { status: 404 }
      );
    }

    // Audit log (successful validation)
    await createAuditLog(
      {
        action: 'READ',
        resource: 'ReferralCode',
        resourceId: referralCode.id,
        details: {
          code: body.code,
        },
        success: true,
      },
      request
    );

    return NextResponse.json({
      success: true,
      valid: true,
      referralCode: {
        code: referralCode.code,
        referrer: {
          firstName: referralCode.user.firstName,
          lastName: referralCode.user.lastName,
          specialty: referralCode.user.specialty,
        },
        reward: {
          type: referralCode.rewardType,
          value: referralCode.rewardValue,
          description: getReferralRewardDescription(
            referralCode.rewardType,
            referralCode.rewardValue
          ),
        },
      },
    });
  } catch (error) {
    console.error('[Referral Validate API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate referral code',
      },
      { status: 500 }
    );
  }
}

function getReferralRewardDescription(rewardType: string, rewardValue: number): string {
  switch (rewardType) {
    case 'PREVENTION_UNLOCK':
      return `Unlock Prevention Alerts for ${rewardValue} months`;
    case 'SUBSCRIPTION_CREDIT':
      return `$${rewardValue} credit towards your subscription`;
    case 'FREE_MONTHS':
      return `${rewardValue} months of Professional tier free`;
    case 'FEATURE_UNLOCK':
      return `Unlock premium features`;
    default:
      return 'Special reward';
  }
}
