import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { VerificationStatus } from '@prisma/client';

/**
 * GET /api/credentials/[id]
 * Get a specific credential by ID
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
  try {
    const id = context.params?.id;

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
    logger.error({ error }, 'Error fetching credential');
    return NextResponse.json(
      { error: 'Failed to fetch credential' },
      { status: 500 }
    );
  }
  },
  { roles: ['ADMIN'] }
);

/**
 * PATCH /api/credentials/[id]
 * Update a credential
 */
export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
  try {
    const id = context.params?.id;
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
    logger.error({ error }, 'Error updating credential');
    return NextResponse.json(
      { error: 'Failed to update credential' },
      { status: 500 }
    );
  }
  },
  { roles: ['ADMIN'] }
);

/**
 * DELETE /api/credentials/[id]
 * Delete a credential
 */
export const DELETE = createProtectedRoute(
  async (request: NextRequest, context: any) => {
  try {
    const id = context.params?.id;

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
    logger.error({ error }, 'Error deleting credential');
    return NextResponse.json(
      { error: 'Failed to delete credential' },
      { status: 500 }
    );
  }
  },
  { roles: ['ADMIN'] }
);
