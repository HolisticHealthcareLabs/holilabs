import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { VerificationStatus } from '@prisma/client';

/**
 * POST /api/credentials/[id]/approve
 * Admin endpoint to approve or reject a credential
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { action, adminId, adminNotes } = body;

    // Validate action
    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Validate admin
    if (!adminId) {
      return NextResponse.json(
        { error: 'adminId is required' },
        { status: 400 }
      );
    }

    // Check if admin exists and has ADMIN role
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin role required.' },
        { status: 403 }
      );
    }

    // Check if credential exists
    const credential = await prisma.providerCredential.findUnique({
      where: { id },
    });

    if (!credential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    // Determine new status
    const newStatus = action === 'approve'
      ? VerificationStatus.VERIFIED
      : VerificationStatus.REJECTED;

    // Update credential
    const updatedCredential = await prisma.providerCredential.update({
      where: { id },
      data: {
        verificationStatus: newStatus,
        verifiedAt: action === 'approve' ? new Date() : null,
        verifiedBy: adminId,
        manualVerified: action === 'approve',
        verificationNotes: adminNotes || credential.verificationNotes,
      },
    });

    // Get the latest verification record and update it
    const latestVerification = await prisma.credentialVerification.findFirst({
      where: { credentialId: id },
      orderBy: { requestedAt: 'desc' },
    });

    if (latestVerification) {
      await prisma.credentialVerification.update({
        where: { id: latestVerification.id },
        data: {
          reviewedBy: adminId,
          reviewedAt: new Date(),
          adminReviewNotes: adminNotes,
          completedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Credential ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      credential: updatedCredential,
    });
  } catch (error: any) {
    console.error('Error approving/rejecting credential:', error);
    return NextResponse.json(
      { error: 'Failed to process approval/rejection' },
      { status: 500 }
    );
  }
}
