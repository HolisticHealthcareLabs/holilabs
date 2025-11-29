/**
 * Recording Consent API
 *
 * POST   /api/patients/[id]/recording-consent - Grant recording consent
 * GET    /api/patients/[id]/recording-consent - Get consent status
 * DELETE /api/patients/[id]/recording-consent - Withdraw consent
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  recordConsent,
  withdrawConsent,
  getConsentStatus,
} from '@/lib/consent/recording-consent';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const ConsentSchema = z.object({
  consentMethod: z.enum(['Portal', 'In-Person', 'Verbal', 'Written']),
  consentState: z.string().length(2), // Two-letter state code
  consentLanguage: z.string().optional(),
  consentVersion: z.string().optional(),
  consentSignature: z.string().optional(),
});

/**
 * POST /api/patients/[id]/recording-consent
 * Grant recording consent
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const patientId = params.id;
    const body = await request.json();

    // Validate input
    const validation = ConsentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid consent data',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const consentData = validation.data;

    // Record consent
    const result = await recordConsent(patientId, {
      ...consentData,
      clinicianId: session.user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Error recording consent:', error);

    return NextResponse.json(
      {
        error: 'Failed to record consent',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/patients/[id]/recording-consent
 * Get recording consent status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const patientId = params.id;

    // Get consent status
    const status = await getConsentStatus(patientId);

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Error getting consent status:', error);

    return NextResponse.json(
      {
        error: 'Failed to get consent status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/patients/[id]/recording-consent
 * Withdraw recording consent
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const patientId = params.id;

    // Withdraw consent
    const result = await withdrawConsent(patientId, session.user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Error withdrawing consent:', error);

    return NextResponse.json(
      {
        error: 'Failed to withdraw consent',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
