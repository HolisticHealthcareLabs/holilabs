/**
 * Microsoft Outlook OAuth - Authorization Initiation
 *
 * GET /api/calendar/microsoft/authorize
 * Redirects user to Microsoft OAuth consent screen
 *
 * CVI-001: Uses HMAC-signed state token to prevent CSRF attacks.
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';

function signOAuthState(userId: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET required for OAuth state signing');
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = `${userId}:${timestamp}:${nonce}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}:${sig}`;
}

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const microsoftOAuthUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');

    microsoftOAuthUrl.searchParams.set('client_id', process.env.MICROSOFT_CLIENT_ID || '');
    microsoftOAuthUrl.searchParams.set('redirect_uri', `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/microsoft/callback`);
    microsoftOAuthUrl.searchParams.set('response_type', 'code');
    microsoftOAuthUrl.searchParams.set('scope', [
      'https://graph.microsoft.com/Calendars.ReadWrite',
      'https://graph.microsoft.com/User.Read',
      'offline_access',
    ].join(' '));
    microsoftOAuthUrl.searchParams.set('response_mode', 'query');
    microsoftOAuthUrl.searchParams.set('state', signOAuthState(context.user.id));

    return NextResponse.redirect(microsoftOAuthUrl.toString());
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    skipCsrf: true,
  }
);
