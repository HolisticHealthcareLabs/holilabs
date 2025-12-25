/**
 * Accept Consents API Route
 *
 * Records user acceptance of legal consents
 * @route POST /api/consents/accept
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

interface ConsentSubmission {
  type: string;
  title: string;
  version: string;
  signatureData: string;
  signedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { consents } = body as { consents: ConsentSubmission[] };

    if (!consents || !Array.isArray(consents) || consents.length === 0) {
      return NextResponse.json(
        { error: 'Invalid consent data' },
        { status: 400 }
      );
    }

    // Get patient record via PatientUser
    const patientUser = await prisma.patientUser.findUnique({
      where: {
        email: session.user.email!,
      },
      include: {
        patient: true,
      },
    });

    if (!patientUser || !patientUser.patient) {
      return NextResponse.json(
        { error: 'Patient record not found' },
        { status: 404 }
      );
    }

    const patient = patientUser.patient;

    // Create consent records
    const consentRecords = await Promise.all(
      consents.map(async (consent) => {
        // Generate consent hash for immutability
        const consentContent = JSON.stringify({
          type: consent.type,
          title: consent.title,
          version: consent.version,
          signedAt: consent.signedAt,
          signature: consent.signatureData,
        });

        const consentHash = crypto
          .createHash('sha256')
          .update(consentContent)
          .digest('hex');

        // Check if this exact consent already exists
        const existing = await prisma.consent.findUnique({
          where: { consentHash },
        });

        if (existing) {
          return existing;
        }

        // Create new consent record
        return await prisma.consent.create({
          data: {
            patientId: patient.id,
            type: consent.type as any, // Type will be validated by Prisma
            title: consent.title,
            content: `User accepted ${consent.title} version ${consent.version}`,
            version: consent.version,
            signatureData: consent.signatureData,
            signedAt: new Date(consent.signedAt),
            consentHash,
            isActive: true,
          },
        });
      })
    );

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'SIGN',
        resource: 'CONSENT',
        resourceId: consentRecords[0]?.id || 'multiple',
        details: {
          consentTypes: consents.map((c) => c.type),
          count: consents.length,
          timestamp: new Date().toISOString(),
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Consents accepted successfully',
      consents: consentRecords.map((c) => ({
        id: c.id,
        type: c.type,
        title: c.title,
        version: c.version,
        signedAt: c.signedAt,
      })),
    });
  } catch (error) {
    console.error('Error accepting consents:', error);
    return NextResponse.json(
      { error: 'Failed to accept consents' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
