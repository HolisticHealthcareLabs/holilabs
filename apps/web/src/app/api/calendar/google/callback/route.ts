/**
 * Google Calendar OAuth - Callback Handler
 *
 * GET /api/calendar/google/callback?code=xxx&state=signed_token
 * Exchanges authorization code for access/refresh tokens
 *
 * CVI-001: Validates HMAC-signed state token before token exchange.
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createPublicRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { encryptToken } from '@/lib/calendar/token-encryption';
import { logger } from '@/lib/logger';

const STATE_MAX_AGE_SECONDS = 600; // 10 minutes

function verifyOAuthState(rawState: string): { valid: boolean; userId?: string } {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return { valid: false };

  const parts = rawState.split(':');
  if (parts.length !== 4) return { valid: false };

  const [userId, timestampStr, nonce, receivedSig] = parts;
  const timestamp = parseInt(timestampStr, 10);

  if (isNaN(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > STATE_MAX_AGE_SECONDS) {
    return { valid: false };
  }

  const payload = `${userId}:${timestampStr}:${nonce}`;
  const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(receivedSig), Buffer.from(expectedSig))) {
    return { valid: false };
  }

  return { valid: true, userId };
}

export const dynamic = 'force-dynamic';

export const GET = createPublicRoute(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const rawState = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/appointments?error=${error}`
      );
    }

    if (!code || !rawState) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/appointments?error=missing_params`
      );
    }

    // Validate CSRF state token (CVI-001)
    const stateResult = verifyOAuthState(rawState);
    if (!stateResult.valid || !stateResult.userId) {
      logger.warn({ event: 'calendar_google_csrf_rejected' });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/appointments?error=csrf_validation_failed`
      );
    }

    const state = stateResult.userId;

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      logger.error({
        event: 'calendar_google_token_exchange_failed',
        error: tokenData.error_description || tokenData.error || 'Token exchange failed',
      });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/appointments?error=token_exchange_failed`
      );
    }

    // Get user's calendar info
    const calendarResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList/primary',
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );

    const calendarData = await calendarResponse.json();

    // Get user email from tokeninfo
    const userinfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );

    const userinfo = await userinfoResponse.json();

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Save or update calendar integration
    await prisma.calendarIntegration.upsert({
      where: {
        userId_provider: {
          userId: state,
          provider: 'GOOGLE',
        },
      },
      create: {
        userId: state,
        provider: 'GOOGLE',
        providerAccountId: userinfo.id || userinfo.email,
        accessToken: encryptToken(tokenData.access_token),
        refreshToken: tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : null,
        tokenExpiresAt: expiresAt,
        scope: tokenData.scope.split(' '),
        calendarId: calendarData.id || 'primary',
        calendarName: calendarData.summary || 'Primary',
        calendarEmail: userinfo.email,
        lastSyncAt: new Date(),
      },
      update: {
        accessToken: encryptToken(tokenData.access_token),
        refreshToken: tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : undefined,
        tokenExpiresAt: expiresAt,
        scope: tokenData.scope.split(' '),
        calendarId: calendarData.id || 'primary',
        calendarName: calendarData.summary || 'Primary',
        calendarEmail: userinfo.email,
        lastSyncAt: new Date(),
        syncEnabled: true,
        syncErrors: 0,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: state,
        userEmail: userinfo.email,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'CREATE',
        resource: 'CalendarIntegration',
        resourceId: 'GOOGLE',
        success: true,
        details: {
          provider: 'GOOGLE',
          calendarEmail: userinfo.email,
        },
      },
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/appointments?success=google_connected`
    );
  } catch (error) {
    logger.error({
      event: 'calendar_google_callback_failed',
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/appointments?error=callback_failed`
    );
  }
});
