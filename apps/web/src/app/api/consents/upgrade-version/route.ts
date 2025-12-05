/**
 * Consent Version Upgrade API
 * Upgrades a patient's consent to the latest version
 *
 * POST /api/consents/upgrade-version
 * Body: { patientId, consentType, signatureData }
 */

import { NextRequest, NextResponse } from 'next/server';
import { upgradeConsentVersion } from '@/lib/consent/version-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, consentType, signatureData } = body;

    if (!patientId || !consentType) {
      return NextResponse.json(
        { error: 'patientId and consentType are required' },
        { status: 400 }
      );
    }

    await upgradeConsentVersion(
      patientId,
      consentType,
      signatureData || 'PORTAL_VERSION_UPGRADE'
    );

    return NextResponse.json({
      success: true,
      message: 'Consent upgraded to latest version',
    });
  } catch (error) {
    console.error('Error upgrading consent version:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upgrade consent' },
      { status: 500 }
    );
  }
}
