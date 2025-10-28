import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/credentials/[id]/status
 * Get verification status for a credential
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const credential = await prisma.providerCredential.findUnique({
      where: { id },
      select: {
        id: true,
        credentialType: true,
        credentialNumber: true,
        verificationStatus: true,
        verifiedAt: true,
        verifiedBy: true,
        autoVerified: true,
        manualVerified: true,
        verificationSource: true,
        createdAt: true,
        updatedAt: true,
        verificationHistory: {
          orderBy: { requestedAt: 'desc' },
          take: 5, // Get last 5 verification attempts
          select: {
            id: true,
            verificationMethod: true,
            verificationSource: true,
            requestedAt: true,
            completedAt: true,
            status: true,
            matchScore: true,
            verificationNotes: true,
            adminReviewNotes: true,
            reviewedBy: true,
            reviewedAt: true,
          },
        },
      },
    });

    if (!credential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    // Calculate overall verification progress
    const hasAttempt = credential.verificationHistory.length > 0;
    const latestAttempt = credential.verificationHistory[0];
    const isComplete = credential.verificationStatus === 'VERIFIED' ||
                      credential.verificationStatus === 'REJECTED';

    return NextResponse.json({
      success: true,
      credential: {
        id: credential.id,
        type: credential.credentialType,
        number: credential.credentialNumber,
        status: credential.verificationStatus,
        verifiedAt: credential.verifiedAt,
        verificationMethod: credential.autoVerified ? 'Automated' : 'Manual Review',
        verificationSource: credential.verificationSource,
      },
      progress: {
        hasAttempt,
        isComplete,
        attemptsCount: credential.verificationHistory.length,
        latestAttempt: latestAttempt ? {
          method: latestAttempt.verificationMethod,
          source: latestAttempt.verificationSource,
          requestedAt: latestAttempt.requestedAt,
          completedAt: latestAttempt.completedAt,
          status: latestAttempt.status,
          matchScore: latestAttempt.matchScore,
          needsReview: latestAttempt.status === 'PARTIAL_MATCH' ||
                      latestAttempt.status === 'NO_MATCH' ||
                      latestAttempt.status === 'NOT_FOUND',
        } : null,
      },
      history: credential.verificationHistory,
    });
  } catch (error: any) {
    console.error('Error fetching credential status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credential status' },
      { status: 500 }
    );
  }
}
