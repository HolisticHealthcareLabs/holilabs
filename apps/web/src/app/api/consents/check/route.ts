/**
 * Check User Consent Status API Route
 *
 * Checks if user has accepted all required consents
 * @route GET /api/consents/check
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const REQUIRED_CONSENTS = [
  'TERMS_OF_SERVICE',
  'PRIVACY_POLICY',
  'HIPAA_NOTICE',
  'EHR_CONSENT',
];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's patient record
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        patients: {
          include: {
            consents: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!user || user.patients.length === 0) {
      return NextResponse.json({
        allAccepted: false,
        missingConsents: REQUIRED_CONSENTS,
        consents: [],
      });
    }

    const patient = user.patients[0];
    const activeConsents = patient.consents;

    // Check which required consents are missing
    const acceptedTypes = new Set(activeConsents.map((c) => c.type));
    const missingConsents = REQUIRED_CONSENTS.filter(
      (type) => !acceptedTypes.has(type)
    );

    return NextResponse.json({
      allAccepted: missingConsents.length === 0,
      missingConsents,
      consents: activeConsents.map((c) => ({
        type: c.type,
        title: c.title,
        version: c.version,
        signedAt: c.signedAt,
      })),
    });
  } catch (error) {
    console.error('Error checking consents:', error);
    return NextResponse.json(
      { error: 'Failed to check consents' },
      { status: 500 }
    );
  }
}
