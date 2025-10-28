import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CredentialType, VerificationStatus } from '@prisma/client';
import crypto from 'crypto';

/**
 * GET /api/credentials
 * List all credentials for a user
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const credentials = await prisma.providerCredential.findMany({
      where: { userId },
      include: {
        verificationHistory: {
          orderBy: { requestedAt: 'desc' },
          take: 1, // Get latest verification attempt
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      credentials,
    });
  } catch (error: any) {
    console.error('Error fetching credentials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credentials' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/credentials
 * Create a new credential (with or without document upload)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      credentialType,
      credentialNumber,
      issuingAuthority,
      issuingCountry,
      issuingState,
      issuedDate,
      expirationDate,
      neverExpires,
      documentUrl,
      ocrData,
    } = body;

    // Validation
    if (!userId || !credentialType || !credentialNumber || !issuingAuthority || !issuingCountry || !issuedDate) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, credentialType, credentialNumber, issuingAuthority, issuingCountry, issuedDate' },
        { status: 400 }
      );
    }

    // Validate credential type
    if (!Object.values(CredentialType).includes(credentialType)) {
      return NextResponse.json(
        { error: `Invalid credential type. Must be one of: ${Object.values(CredentialType).join(', ')}` },
        { status: 400 }
      );
    }

    // Check if credential already exists
    const existingCredential = await prisma.providerCredential.findFirst({
      where: {
        userId,
        credentialType,
        credentialNumber,
      },
    });

    if (existingCredential) {
      return NextResponse.json(
        { error: 'Credential with this number already exists' },
        { status: 409 }
      );
    }

    // Generate document hash if documentUrl provided
    let documentHash;
    if (documentUrl) {
      documentHash = crypto
        .createHash('sha256')
        .update(documentUrl + Date.now())
        .digest('hex');
    }

    // Create credential
    const credential = await prisma.providerCredential.create({
      data: {
        userId,
        credentialType,
        credentialNumber,
        issuingAuthority,
        issuingCountry,
        issuingState,
        issuedDate: new Date(issuedDate),
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        neverExpires: neverExpires || false,
        documentUrl,
        documentHash,
        ocrData,
        ocrConfidence: ocrData?.confidence,
        verificationStatus: VerificationStatus.PENDING,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Credential created successfully',
      credential,
    });
  } catch (error: any) {
    console.error('Error creating credential:', error);
    return NextResponse.json(
      { error: 'Failed to create credential' },
      { status: 500 }
    );
  }
}
