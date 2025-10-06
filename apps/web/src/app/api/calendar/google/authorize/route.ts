/**
 * Google Calendar OAuth - Authorization Initiation
 *
 * GET /api/calendar/google/authorize
 * Redirects user to Google OAuth consent screen
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const googleOAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');

    googleOAuthUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID || '');
    googleOAuthUrl.searchParams.set('redirect_uri', `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/google/callback`);
    googleOAuthUrl.searchParams.set('response_type', 'code');
    googleOAuthUrl.searchParams.set('scope', [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ].join(' '));
    googleOAuthUrl.searchParams.set('access_type', 'offline');
    googleOAuthUrl.searchParams.set('prompt', 'consent');
    googleOAuthUrl.searchParams.set('state', context.user.id); // Pass user ID to callback

    return NextResponse.redirect(googleOAuthUrl.toString());
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    skipCsrf: true,
  }
);
