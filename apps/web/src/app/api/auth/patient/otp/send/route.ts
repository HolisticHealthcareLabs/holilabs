/**
 * Patient OTP Send API
 *
 * POST /api/auth/patient/otp/send
 * Request an OTP code for SMS authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateOTP } from '@/lib/auth/otp';
import logger from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { createAuditLog } from '@/lib/audit';

// Validation schema
const SendOTPSchema = z.object({
  phone: z.string().min(10, 'Teléfono debe tener al menos 10 dígitos'),
  channel: z.enum(['SMS', 'WHATSAPP']).optional().default('SMS'),
});

export async function POST(request: NextRequest) {
  // Apply rate limiting - 5 requests per 15 minutes for auth endpoints
  const rateLimitResponse = await checkRateLimit(request, 'auth');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = SendOTPSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.errors[0]?.message || 'Datos inválidos',
        },
        { status: 400 }
      );
    }

    const { phone, channel } = validation.data;

    // Generate and send OTP
    const result = await generateOTP({ phone, channel });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'No se pudo enviar el código.',
        },
        { status: 429 } // Too Many Requests if rate limited
      );
    }

    // HIPAA Audit Log: Patient authentication attempt via OTP
    await createAuditLog({
      userId: 'unknown', // Pre-authentication
      userEmail: 'unknown',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      action: 'LOGIN_ATTEMPT',
      resource: 'PatientAuth',
      resourceId: phone, // Use phone as identifier
      details: {
        method: 'otp',
        channel,
        expiresAt: result.expiresAt,
      },
      success: true,
      request,
    });

    // Return success (with code only in development)
    return NextResponse.json(
      {
        success: true,
        message: `Código enviado a tu teléfono. Válido por 10 minutos.`,
        expiresAt: result.expiresAt,
        // Only include code in development for testing
        ...(process.env.NODE_ENV === 'development' && result.code
          ? { devCode: result.code }
          : {}),
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: 'otp_send_error',
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
