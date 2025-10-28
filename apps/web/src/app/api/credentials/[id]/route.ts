import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { VerificationStatus } from '@prisma/client';

/**
 * GET /api/credentials/[id]
 * Get a specific credential by ID
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const credential = await prisma.providerCredential.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            specialty: true,
          },
        },
        verificationHistory: {
          orderBy: { requestedAt: 'desc' },
        },
      },
    });

    if (!credential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      credential,
    });
  } catch (error: any) {
    console.error('Error fetching credential:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credential' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/credentials/[id]
 * Update a credential
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Check if credential exists
    const existingCredential = await prisma.providerCredential.findUnique({
      where: { id },
    });

    if (!existingCredential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    // Prepare update data (only update provided fields)
    const updateData: any = {};

    if (body.credentialNumber) updateData.credentialNumber = body.credentialNumber;
    if (body.issuingAuthority) updateData.issuingAuthority = body.issuingAuthority;
    if (body.issuingCountry) updateData.issuingCountry = body.issuingCountry;
    if (body.issuingState !== undefined) updateData.issuingState = body.issuingState;
    if (body.issuedDate) updateData.issuedDate = new Date(body.issuedDate);
    if (body.expirationDate) updateData.expirationDate = new Date(body.expirationDate);
    if (body.neverExpires !== undefined) updateData.neverExpires = body.neverExpires;
    if (body.documentUrl) updateData.documentUrl = body.documentUrl;
    if (body.ocrData) updateData.ocrData = body.ocrData;
    if (body.verificationNotes) updateData.verificationNotes = body.verificationNotes;

    // Update credential
    const credential = await prisma.providerCredential.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Credential updated successfully',
      credential,
    });
  } catch (error: any) {
    console.error('Error updating credential:', error);
    return NextResponse.json(
      { error: 'Failed to update credential' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/credentials/[id]
 * Delete a credential
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if credential exists
    const existingCredential = await prisma.providerCredential.findUnique({
      where: { id },
    });

    if (!existingCredential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    // Delete credential (cascade will delete verification history)
    await prisma.providerCredential.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Credential deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting credential:', error);
    return NextResponse.json(
      { error: 'Failed to delete credential' },
      { status: 500 }
    );
  }
}
