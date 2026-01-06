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
function getAdminKey(): string {
  const key = process.env.ADMIN_API_KEY;
  if (!key) {
    throw new Error('ADMIN_API_KEY environment variable is required for admin authentication');
  }
  return key;
}

function isAdmin(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${getAdminKey()}`;
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

    // Fetch all invitation codes
    const codes = await prisma.invitationCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    // Get today's signup counter
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const signupCounter = await prisma.signupCounter.findUnique({
      where: { date: today },
    });

    const totalSignups = signupCounter?.signups || 0;
    const first100Remaining = Math.max(0, 100 - totalSignups);

    return NextResponse.json({
      codes: codes.map(code => ({
        id: code.id,
        code: code.code,
        email: code.email,
        role: code.role,
        expiresAt: code.expiresAt,
        maxUses: code.maxUses,
        uses: code.uses,
        isActive: code.isActive,
        createdBy: {
          id: code.createdByUser.id,
          email: code.createdByUser.email,
          name: `${code.createdByUser.firstName} ${code.createdByUser.lastName}`,
        },
        usersCount: code._count.users,
        createdAt: code.createdAt,
      })),
      first100Count: totalSignups,
      first100Remaining,
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

    const body = await request.json();
    const { email, role, maxUses = 1, expiresInDays = 30, createdBy } = body;

    // Validate required fields
    if (!createdBy) {
      return NextResponse.json(
        { error: 'createdBy (admin user ID) is required' },
        { status: 400 }
      );
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Generate unique code
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const generatedCode = `HOLI-${timestamp}-${random}`;

    // Create invitation code
    const code = await prisma.invitationCode.create({
      data: {
        code: generatedCode,
        email: email || null,
        role: role || null,
        expiresAt,
        maxUses,
        createdBy,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Update signup counter
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.signupCounter.upsert({
      where: { date: today },
      update: {
        invitations: { increment: 1 },
      },
      create: {
        date: today,
        invitations: 1,
      },
    });

    logger.info({
      event: 'invitation_code_created',
      code: generatedCode,
      createdBy,
      email,
      role,
    });

    return NextResponse.json({
      success: true,
      code: {
        id: code.id,
        code: code.code,
        email: code.email,
        role: code.role,
        expiresAt: code.expiresAt,
        maxUses: code.maxUses,
        uses: code.uses,
        isActive: code.isActive,
        createdBy: {
          id: code.createdByUser.id,
          email: code.createdByUser.email,
          name: `${code.createdByUser.firstName} ${code.createdByUser.lastName}`,
        },
        createdAt: code.createdAt,
      },
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

    if (!code) {
      return NextResponse.json(
        { error: 'Code is required' },
        { status: 400 }
      );
    }

    // Deactivate the invitation code
    const updatedCode = await prisma.invitationCode.update({
      where: { code },
      data: { isActive: false },
    });

    logger.info({
      event: 'invitation_code_deactivated',
      code,
    });

    return NextResponse.json({
      success: true,
      message: 'Código desactivado exitosamente',
      code: {
        id: updatedCode.id,
        code: updatedCode.code,
        isActive: updatedCode.isActive,
      },
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

