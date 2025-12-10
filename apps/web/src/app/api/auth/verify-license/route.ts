/**
 * Medical License Verification API
 *
 * POST /api/auth/verify-license - Verify medical license with official boards
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import logger from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  verifyMedicalLicense,
  createCredentialVerificationRecord,
  type SupportedCountry,
} from '@/lib/medical-license-verification';

export const dynamic = 'force-dynamic';

// Validation schema
const verifyLicenseSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  licenseNumber: z.string().min(1, 'License number is required'),
  country: z.enum(['BR', 'AR', 'US'], { errorMap: () => ({ message: 'Invalid country' }) }),
  state: z.string().optional(),
  userId: z.string().optional(), // Optional: for logged-in users
});

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await checkRateLimit(request, 'auth');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = verifyLicenseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.errors[0].message,
        },
        { status: 400 }
      );
    }

    const { firstName, lastName, licenseNumber, country, state, userId } = validation.data;

    // Verify the medical license
    logger.info({
      event: 'medical_license_verification_requested',
      country,
      state,
      // License number partially redacted for privacy
      licenseNumberPrefix: licenseNumber.substring(0, 4),
    });

    const result = await verifyMedicalLicense({
      firstName,
      lastName,
      licenseNumber,
      country: country as SupportedCountry,
      state,
    });

    // If user is logged in, create a credential verification record
    if (userId) {
      try {
        await createCredentialVerificationRecord(userId, {
          firstName,
          lastName,
          licenseNumber,
          country: country as SupportedCountry,
          state,
        }, result);
      } catch (error) {
        logger.error({
          event: 'credential_record_creation_error',
          error: error instanceof Error ? error.message : 'Unknown error',
          userId,
        });
        // Don't fail the request if credential record creation fails
      }
    }

    // Log verification result
    logger.info({
      event: 'medical_license_verification_completed',
      status: result.status,
      verified: result.verified,
      matchScore: result.matchScore,
      source: result.source,
    });

    return NextResponse.json({
      success: true,
      result: {
        verified: result.verified,
        status: result.status,
        matchScore: result.matchScore,
        source: result.source,
        verificationNotes: result.verificationNotes,
        // Don't expose sensitive matched data to client unless verified
        matchedData: result.verified ? result.matchedData : undefined,
      },
    });
  } catch (error) {
    logger.error({
      event: 'license_verification_api_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        error: 'Failed to verify license',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
