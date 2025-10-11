/**
 * Patient Magic Link Send API
 *
 * POST /api/auth/patient/magic-link/send
 * Request a magic link for passwordless authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateMagicLink, sendMagicLinkEmail } from '@/lib/auth/magic-link';
import logger from '@/lib/logger';
import { prisma } from '@/lib/prisma';

// Validation schema
const SendMagicLinkSchema = z.object({
  email: z.string().email('Por favor ingresa un email válido'),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = SendMagicLinkSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.errors[0]?.message || 'Datos inválidos',
        },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // Get IP address and user agent for security tracking
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    // Find patient user to get their name
    const patientUser = await prisma.patientUser.findUnique({
      where: { email },
      include: {
        patient: true,
      },
    });

    // Generate magic link
    const result = await generateMagicLink({
      email,
      ipAddress,
      userAgent,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'No se pudo generar el enlace.',
        },
        { status: 429 } // Too Many Requests if rate limited
      );
    }

    // Send email (only if we actually generated a link and have patient data)
    if (result.magicLinkUrl && patientUser) {
      const patientName = `${patientUser.patient.firstName} ${patientUser.patient.lastName}`;

      const emailSent = await sendMagicLinkEmail(
        email,
        result.magicLinkUrl,
        patientName
      );

      if (!emailSent) {
        // In development, log the magic link to console for testing
        if (process.env.NODE_ENV === 'development') {
          console.log('\n🔗 MAGIC LINK (for testing):', result.magicLinkUrl);
          console.log('⚠️  Email delivery failed - Use the link above to login\n');
        }

        logger.error({
          event: 'magic_link_email_send_failed',
          email,
        });

        // In development, still return success with the link
        if (process.env.NODE_ENV === 'development') {
          return NextResponse.json(
            {
              success: true,
              message: 'Magic link generated (email failed - check console)',
              expiresInMinutes: 15,
              devMode: true,
              magicLinkUrl: result.magicLinkUrl, // Only in dev mode!
            },
            { status: 200 }
          );
        }

        return NextResponse.json(
          {
            success: false,
            error: 'No se pudo enviar el correo. Por favor, intenta de nuevo.',
          },
          { status: 500 }
        );
      }

      // In development, also log successful email sends
      if (process.env.NODE_ENV === 'development') {
        console.log('\n✉️  Magic link sent to:', email);
        console.log('🔗 Link (for testing):', result.magicLinkUrl);
        console.log('⏱️  Expires in: 15 minutes\n');
      }
    }

    // Always return success to prevent email enumeration
    return NextResponse.json(
      {
        success: true,
        message: 'Si tu email está registrado, recibirás un enlace de inicio de sesión en breve.',
        expiresInMinutes: 15,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: 'magic_link_send_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error del servidor. Por favor, intenta de nuevo.',
      },
      { status: 500 }
    );
  }
}
