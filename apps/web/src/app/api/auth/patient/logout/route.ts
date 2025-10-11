/**
 * Patient Logout API
 *
 * POST /api/auth/patient/logout
 * Clear patient session and logout
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';

export async function POST() {
  try {
    // Clear session cookie
    const cookieStore = cookies();
    cookieStore.delete('patient-session');

    logger.info({
      event: 'patient_logout',
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Sesión cerrada exitosamente',
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: 'patient_logout_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al cerrar sesión',
      },
      { status: 500 }
    );
  }
}
