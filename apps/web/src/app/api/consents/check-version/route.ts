/**
 * Consent Version Check API
 * Checks if patient needs to update their consent due to version changes
 *
 * GET /api/consents/check-version?patientId={id}&consentType={type}
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkConsentVersion } from '@/lib/consent/version-manager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const consentType = searchParams.get('consentType');

    if (!patientId || !consentType) {
      return NextResponse.json(
        { error: 'patientId and consentType are required' },
        { status: 400 }
      );
    }

    const versionCheck = await checkConsentVersion(patientId, consentType);

    return NextResponse.json({
      success: true,
      ...versionCheck,
    });
  } catch (error) {
    console.error('Error checking consent version:', error);
    return NextResponse.json(
      { error: 'Failed to check consent version' },
      { status: 500 }
    );
  }
}
