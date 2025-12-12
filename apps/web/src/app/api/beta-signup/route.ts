/**
 * Beta Signup API - Placeholder
 *
 * TODO: Requires BetaSignup, InvitationCode, and SignupCounter models in schema
 */

import { NextResponse } from 'next/server';
import logger from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const { email, name, inviteCode } = await request.json();

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Por favor proporciona un email válido' },
        { status: 400 }
      );
    }

    logger.info({
      event: 'beta_signup_attempt',
      email,
      name,
      inviteCode: inviteCode || null,
    });

    // TODO: Implement beta signup once BetaSignup, InvitationCode, and SignupCounter models are added to schema
    return NextResponse.json({
      success: false,
      message: 'Beta signup feature not yet implemented. Database models required.',
    });
  } catch (error: any) {
    logger.error({
      event: 'beta_signup_error',
      error: error.message,
    });

    console.error('Beta signup error:', error);
    return NextResponse.json(
      { error: 'Error al procesar tu registro. Por favor intenta de nuevo.' },
      { status: 500 }
    );
  }
}
