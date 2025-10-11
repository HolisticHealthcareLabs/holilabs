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

// Validation schema
const SendOTPSchema = z.object({
  phone: z.string().min(10, 'Teléfono debe tener al menos 10 dígitos'),
  channel: z.enum(['SMS', 'WHATSAPP']).optional().default('SMS'),
});

export async function POST(request: NextRequest) {
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
