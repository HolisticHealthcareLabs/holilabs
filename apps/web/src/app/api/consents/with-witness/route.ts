/**
 * Consent with Witness Signature API
 * Creates consent with witness signature (for surgical/procedure consents)
 *
 * POST /api/consents/with-witness
 * Body: {
 *   patientId,
 *   consentType,
 *   patientSignature,
 *   witnessName,
 *   witnessSignature,
 *   witnessRelationship (optional)
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      patientId,
      consentType,
      title,
      content,
      patientSignature,
      witnessName,
      witnessSignature,
      witnessRelationship,
    } = body;

    // Validate required fields
    if (
      !patientId ||
      !consentType ||
      !patientSignature ||
      !witnessName ||
      !witnessSignature
    ) {
      return NextResponse.json(
        {
          error:
            'patientId, consentType, patientSignature, witnessName, and witnessSignature are required',
        },
        { status: 400 }
      );
    }

    // Get patient details
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Generate consent content
    const consentContent = content || `
Consent for: ${title || consentType}

This consent was signed by the patient and witnessed by an authorized individual.

Patient: ${patient.firstName} ${patient.lastName}
Witness: ${witnessName}
${witnessRelationship ? `Relationship: ${witnessRelationship}` : ''}

Date: ${new Date().toLocaleDateString()}
Time: ${new Date().toLocaleTimeString()}

By signing this consent, the patient acknowledges understanding of the procedure and associated risks.
The witness confirms the patient's identity and voluntary consent.
    `.trim();

    // Create hash including both signatures
    const consentHash = crypto
      .createHash('sha256')
      .update(
        consentContent +
          patientId +
          patientSignature +
          witnessName +
          witnessSignature +
          new Date().toISOString()
      )
      .digest('hex');

    // Create consent record
    const consent = await prisma.consent.create({
      data: {
        patientId,
        type: consentType,
        title: title || `${consentType} (Witnessed)`,
        content: consentContent,
        version: '1.0',
        signatureData: patientSignature,
        witnessName,
        witnessSignature,
        signedAt: new Date(),
        isActive: true,
        consentHash,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: patientId,
        userEmail: 'patient',
        action: 'SIGN',
        resource: 'Consent',
        resourceId: consent.id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        details: {
          consentType,
          witnessName,
          witnessRelationship: witnessRelationship || 'Not specified',
          timestamp: new Date().toISOString(),
        },
        success: true,
      },
    });

    return NextResponse.json({
      success: true,
      consent: {
        id: consent.id,
        type: consent.type,
        witnessName: consent.witnessName,
        signedAt: consent.signedAt,
        consentHash: consent.consentHash,
      },
    });
  } catch (error) {
    console.error('Error creating witnessed consent:', error);
    return NextResponse.json(
      { error: 'Failed to create witnessed consent' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/consents/with-witness?consentId={id}
 * Retrieve witnessed consent details
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const consentId = searchParams.get('consentId');

    if (!consentId) {
      return NextResponse.json({ error: 'consentId required' }, { status: 400 });
    }

    const consent = await prisma.consent.findUnique({
      where: { id: consentId },
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        version: true,
        signatureData: true,
        witnessName: true,
        witnessSignature: true,
        signedAt: true,
        consentHash: true,
        patient: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!consent) {
      return NextResponse.json({ error: 'Consent not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      consent: {
        id: consent.id,
        type: consent.type,
        title: consent.title,
        content: consent.content,
        version: consent.version,
        patientName: `${consent.patient.firstName} ${consent.patient.lastName}`,
        patientSignature: consent.signatureData,
        witnessName: consent.witnessName,
        witnessSignature: consent.witnessSignature,
        signedAt: consent.signedAt,
        consentHash: consent.consentHash,
      },
    });
  } catch (error) {
    console.error('Error fetching witnessed consent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch witnessed consent' },
      { status: 500 }
    );
  }
}
