import { NextRequest, NextResponse } from 'next/server';
import { createPublicRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const OnboardingSchema = z.object({
  leadId: z.string().min(1, 'Lead ID is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

export const POST = createPublicRoute(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const parsed = OnboardingSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return NextResponse.json(
        { error: firstError?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { leadId, password } = parsed.data;

    // Hash password before entering the transaction
    const passwordHash = await bcrypt.hash(password, 12);

    // Atomic transaction: User + Workspace + WaitlistEntry update
    // If any step fails, everything rolls back — no orphaned records.
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify the entry is APPROVED (prevents link reuse + race conditions)
      const entry = await tx.waitlistEntry.findUnique({
        where: { id: leadId },
      });

      if (!entry) {
        throw new Error('NOT_FOUND');
      }

      if (entry.status !== 'APPROVED') {
        throw new Error('LINK_USED');
      }

      // 2. Check if user with this email already exists
      const existingUser = await tx.user.findUnique({
        where: { email: entry.email },
      });

      if (existingUser) {
        // Mark the entry as completed to prevent further attempts
        await tx.waitlistEntry.update({
          where: { id: leadId },
          data: { status: 'COMPLETED' },
        });
        throw new Error('EMAIL_EXISTS');
      }

      // 3. Create User
      const user = await tx.user.create({
        data: {
          email: entry.email,
          firstName: entry.firstName || 'User',
          lastName: entry.lastName || '',
          passwordHash,
          role: 'CLINICIAN',
          onboardingCompleted: false,
        },
      });

      // 4. Create Workspace linked to User
      const workspaceName = entry.companyName || `${user.firstName}'s Workspace`;
      const baseSlug = slugify(workspaceName);
      const uniqueSlug = `${baseSlug}-${user.id.slice(-6)}`;

      const workspace = await tx.workspace.create({
        data: {
          name: workspaceName,
          slug: uniqueSlug,
          createdByUserId: user.id,
          members: {
            create: {
              userId: user.id,
              role: 'OWNER',
            },
          },
        },
      });

      // 5. Mark WaitlistEntry as COMPLETED — link can never be reused
      await tx.waitlistEntry.update({
        where: { id: leadId },
        data: { status: 'COMPLETED' },
      });

      return { user, workspace };
    });

    logger.info({
      event: 'onboarding_completed',
      userId: result.user.id,
      workspaceId: result.workspace.id,
      email: result.user.email,
    });

    return NextResponse.json({
      success: true,
      userId: result.user.id,
      workspaceSlug: result.workspace.slug,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'NOT_FOUND') {
        return NextResponse.json(
          { error: 'This onboarding link is not valid.' },
          { status: 404 }
        );
      }
      if (error.message === 'LINK_USED') {
        return NextResponse.json(
          { error: 'This link has already been used. Please sign in.' },
          { status: 409 }
        );
      }
      if (error.message === 'EMAIL_EXISTS') {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in.' },
          { status: 409 }
        );
      }
    }

    logger.error({
      event: 'onboarding_failed',
      error: error instanceof Error ? error.message : String(error),
    });
    return safeErrorResponse(error, { userMessage: 'Account creation failed. Please try again.' });
  }
});
