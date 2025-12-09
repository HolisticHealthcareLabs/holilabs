/**
 * Admin API - Invitation Code Management
 * 
 * Generate invitation codes for friends/family
 * Requires admin authentication
 */

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import logger from '@/lib/logger';

const prisma = new PrismaClient();

// Simple admin auth - you can enhance this with proper auth later
const ADMIN_KEY = process.env.ADMIN_API_KEY || 'your-secret-admin-key-change-me';

function isAdmin(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${ADMIN_KEY}`;
}

// GET - List all invitation codes
export async function GET(request: Request) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const codes = await prisma.invitationCode.findMany({
      include: {
        usedBy: {
          select: {
            email: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const signupCounter = await prisma.signupCounter.findUnique({
      where: { id: 'singleton' },
    });

    return NextResponse.json({
      codes,
      first100Count: signupCounter?.currentCount || 0,
      first100Remaining: Math.max(0, 100 - (signupCounter?.currentCount || 0)),
    });
  } catch (error: any) {
    logger.error({
      event: 'admin_invitations_list_error',
      error: error.message,
    });

    return NextResponse.json(
      { error: 'Error al obtener códigos' },
      { status: 500 }
    );
  }
}

// POST - Generate new invitation code
export async function POST(request: Request) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { codeType, maxUses, notes, expiresInDays } = await request.json();

    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    const code = await prisma.invitationCode.create({
      data: {
        codeType: codeType || 'FRIEND_FAMILY',
        maxUses: maxUses || 1,
        notes: notes || null,
        expiresAt,
        createdByAdmin: true,
      },
    });

    logger.info({
      event: 'invitation_code_created',
      code: code.code,
      codeType: code.codeType,
      maxUses: code.maxUses,
    });

    return NextResponse.json({
      success: true,
      code: code.code,
      data: code,
    });
  } catch (error: any) {
    logger.error({
      event: 'invitation_code_creation_error',
      error: error.message,
    });

    return NextResponse.json(
      { error: 'Error al crear código' },
      { status: 500 }
    );
  }
}

// DELETE - Deactivate invitation code
export async function DELETE(request: Request) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { code } = await request.json();

    const updatedCode = await prisma.invitationCode.update({
      where: { code },
      data: { isActive: false },
    });

    logger.info({
      event: 'invitation_code_deactivated',
      code: updatedCode.code,
    });

    return NextResponse.json({
      success: true,
      message: 'Código desactivado',
    });
  } catch (error: any) {
    logger.error({
      event: 'invitation_code_deactivation_error',
      error: error.message,
    });

    return NextResponse.json(
      { error: 'Error al desactivar código' },
      { status: 500 }
    );
  }
}

