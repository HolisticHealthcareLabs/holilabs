import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email/resend';
import { InviteEmail } from '@/components/email/InviteEmail';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const inviteRequestSchema = z.object({
    email: z.string().email(),
    fullName: z.string().min(2),
    organization: z.string().optional(),
    role: z.string().optional(),
});

/**
 * POST /api/auth/invite/request
 * Handles beta access requests from the landing page.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validated = inviteRequestSchema.safeParse(body);

        if (!validated.success) {
            return NextResponse.json(
                { error: 'Invalid request data', details: validated.error.format() },
                { status: 400 }
            );
        }

        const { email, fullName, organization, role } = validated.data;

        // 1. Create entry in BetaSignup table
        const signup = await prisma.betaSignup.upsert({
            where: { email },
            update: {
                fullName,
                organization,
                role,
                status: 'pending',
                updatedAt: new Date(),
            },
            create: {
                email,
                fullName,
                organization,
                role,
                status: 'pending',
            },
        });

        // 2. Send confirmation email to the user (optional, but good UX)
        // We reuse the InviteEmail component but we could create a RequestConfirmation template later
        await sendEmail({
            to: email,
            subject: 'Holi Labs - Access Request Received',
            react: InviteEmail({
                recipientName: fullName,
                inviteLink: 'https://holilabs.xyz' // Placeholder until approved
            }),
            text: `Hello ${fullName}, we have received your request for Holi Labs access. We'll be in touch soon!`,
        });

        logger.info({ email, signupId: signup.id }, 'Beta access request received');

        return NextResponse.json(
            { message: 'Access request received successfully', signupId: signup.id },
            { status: 201 }
        );
    } catch (error) {
        logger.error({ error }, 'Error processing invite request');
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
