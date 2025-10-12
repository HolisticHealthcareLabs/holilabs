/**
 * Patient Logout API
 *
 * POST /api/portal/auth/logout - Logout patient and clear session
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Clear session cookies
    cookies().delete('patient_session');
    cookies().delete('patient_session_data');

    return NextResponse.json(
      {
        success: true,
        message: 'Logged out successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error logging out:', error);
    return NextResponse.json(
      {
        error: 'Failed to logout',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
