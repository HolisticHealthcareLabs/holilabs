/**
 * User API - Create and List Users
 *
 * POST /api/users - Create new user in Prisma database
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import logger from '@/lib/logger';

// Force dynamic rendering - prevents build-time evaluation
export const dynamic = 'force-dynamic';

/**
 * POST /api/users
 * Create new user profile (called after Supabase signup)
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['email', 'firstName', 'lastName', 'role'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Create user in database
    const user = await prisma.user.create({
      data: {
        email: body.email,
        supabaseId: body.supabaseId, // Link to Supabase auth
        firstName: body.firstName,
        lastName: body.lastName,
        role: body.role,
        specialty: body.specialty,
        licenseNumber: body.licenseNumber,
        mfaEnabled: false,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'CREATE',
        resource: 'User',
        resourceId: user.id,
        success: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: user,
        message: 'User created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error({ error }, 'Error creating user');

    // Handle unique constraint violations
    if ((error as any).code === 'P2002') {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    return safeErrorResponse(error, { userMessage: 'Failed to create user' });
  }
  },
  { roles: ['ADMIN'] }
);
