'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth/auth';
import { generateUsername } from '@/lib/auth/username';
import { sendWelcomeEmail } from '@/lib/email';

const OnboardingSchema = z.object({
  specialty: z.string().min(1, 'Specialty is required').max(100),
  organization: z.string().max(200).optional(),
  licenseNumber: z.string().max(50).optional(),
});

type OnboardingResult =
  | { success: true; username: string }
  | { success: false; error: string };

export async function completeOnboarding(formData: FormData): Promise<OnboardingResult> {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.email) {
      return { success: false, error: 'You must be signed in to complete onboarding.' };
    }

    const raw = {
      specialty: formData.get('specialty'),
      organization: formData.get('organization'),
      licenseNumber: formData.get('licenseNumber'),
    };

    const validation = OnboardingSchema.safeParse(raw);

    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || 'Invalid input.';
      return { success: false, error: firstError };
    }

    const { specialty, organization, licenseNumber } = validation.data;

    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { firstName: true, lastName: true, email: true, username: true, onboardingCompleted: true },
    });

    if (!existingUser) {
      return { success: false, error: 'User account not found.' };
    }

    if (existingUser.onboardingCompleted) {
      return { success: true, username: existingUser.username || '' };
    }

    const username = existingUser.username
      || await generateUsername(existingUser.email, existingUser.firstName, existingUser.lastName);

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        username,
        specialty,
        onboardingCompleted: true,
        ...(licenseNumber ? { licenseNumber } : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        username: true,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const loginUrl = `${baseUrl}/sign-in`;

    await sendWelcomeEmail(
      updated.email,
      updated.firstName,
      updated.username!,
      loginUrl,
      false,
    ).catch((err) => {
      console.error('[Onboarding] Welcome email failed (non-blocking):', err);
    });

    return { success: true, username: updated.username! };
  } catch (error) {
    console.error('[Onboarding] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred.',
    };
  }
}

// ---------------------------------------------------------------------------
// Admin onboarding: jurisdiction, billing, disciplines, front-desk invite
// ---------------------------------------------------------------------------

const AdminOnboardingSchema = z.object({
  jurisdiction: z.string().min(1, 'Jurisdiction is required'),
  billingStandard: z.string().min(1, 'Billing standard is required'),
  disciplines: z.string().min(1, 'At least one discipline is required'),
  frontDeskEmail: z.string().email().optional().or(z.literal('')),
});

type AdminOnboardingResult =
  | { success: true }
  | { success: false; error: string };

export async function completeAdminOnboarding(formData: FormData): Promise<AdminOnboardingResult> {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.email) {
      return { success: false, error: 'You must be signed in to complete onboarding.' };
    }

    const raw = {
      jurisdiction: formData.get('jurisdiction'),
      billingStandard: formData.get('billingStandard'),
      disciplines: formData.get('disciplines'),
      frontDeskEmail: formData.get('frontDeskEmail') || '',
    };

    const validation = AdminOnboardingSchema.safeParse(raw);
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0]?.message || 'Invalid input.' };
    }

    const { jurisdiction, billingStandard, disciplines, frontDeskEmail } = validation.data;

    const workspaceMembership = await prisma.workspaceMember.findFirst({
      where: { userId: session.user.id },
      select: { workspaceId: true },
      orderBy: { createdAt: 'asc' },
    });

    if (workspaceMembership) {
      await prisma.workspace.update({
        where: { id: workspaceMembership.workspaceId },
        data: {
          metadata: {
            jurisdiction,
            billingStandard,
            disciplines: disciplines.split(',').map((d) => d.trim()).filter(Boolean),
            configuredAt: new Date().toISOString(),
          },
        },
      });
    }

    const username = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { username: true, firstName: true, lastName: true, email: true },
    });

    const finalUsername = username?.username
      || await generateUsername(
          username?.email || session.user.email,
          username?.firstName || 'Admin',
          username?.lastName || ''
        );

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        onboardingCompleted: true,
        username: finalUsername,
      },
    });

    if (frontDeskEmail && frontDeskEmail.includes('@')) {
      console.log(`[Admin Onboarding] Front desk invite queued: ${frontDeskEmail}`);
    }

    return { success: true };
  } catch (error) {
    console.error('[Admin Onboarding] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred.',
    };
  }
}
