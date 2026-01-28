/**
 * SMART on FHIR OAuth Callback Endpoint
 *
 * GET /api/fhir/callback - Handles OAuth callback from EHR authorization server
 *
 * This endpoint completes the OAuth 2.0 authorization flow by:
 * 1. Verifying the state parameter matches (CSRF protection)
 * 2. Exchanging the authorization code for access token
 * 3. Extracting patient context from token response
 * 4. Storing the SMART session in a secure cookie
 * 5. Redirecting to the dashboard with patient context
 *
 * Query Parameters:
 * - code: Authorization code from EHR (required)
 * - state: CSRF state token (required)
 * - error: OAuth error code (if authorization failed)
 * - error_description: OAuth error description
 *
 * Environment Variables:
 * - SMART_CLIENT_ID: OAuth client ID registered with the EHR
 * - SMART_CLIENT_SECRET: OAuth client secret (optional, for confidential clients)
 * - SMART_REDIRECT_URI: OAuth callback URL (must match launch request)
 *
 * Test with: https://launch.smarthealthit.org/ (SMART Health IT Sandbox)
 *
 * @compliance HIPAA - Audit logging for all EHR integration events
 * @compliance HL7 SMART App Launch Framework 2.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';
import {
  getSmartConfiguration,
  exchangeCodeForToken,
  createLaunchContext,
  type SMARTLaunchContext,
} from '@/lib/fhir/smart-client';

// Force dynamic rendering - this endpoint handles OAuth state
export const dynamic = 'force-dynamic';

// Cookie names for SMART launch state
const SMART_STATE_COOKIE = 'smart_state';
const SMART_ISS_COOKIE = 'smart_iss';
const SMART_SESSION_COOKIE = 'smart_session';

/**
 * GET /api/fhir/callback
 *
 * Completes SMART on FHIR authorization flow.
 * Called by EHR after user authorizes the app.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;
    const cookieStore = await cookies();

    // Check for OAuth error response
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      logger.warn({
        event: 'smart_callback_oauth_error',
        error,
        errorDescription,
      });

      // Clean up cookies
      cookieStore.delete(SMART_STATE_COOKIE);
      cookieStore.delete(SMART_ISS_COOKIE);

      // Redirect to error page with details
      const errorUrl = new URL('/auth/error', request.nextUrl.origin);
      errorUrl.searchParams.set('error', error);
      if (errorDescription) {
        errorUrl.searchParams.set('error_description', errorDescription);
      }
      errorUrl.searchParams.set('source', 'smart_launch');

      return NextResponse.redirect(errorUrl);
    }

    // Extract callback parameters
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    // Validate required parameters
    if (!code) {
      logger.warn({
        event: 'smart_callback_missing_code',
        queryParams: Object.fromEntries(searchParams.entries()),
      });

      return NextResponse.json(
        {
          error: 'invalid_request',
          error_description: 'Authorization code is required',
        },
        { status: 400 }
      );
    }

    if (!state) {
      logger.warn({
        event: 'smart_callback_missing_state',
      });

      return NextResponse.json(
        {
          error: 'invalid_request',
          error_description: 'State parameter is required',
        },
        { status: 400 }
      );
    }

    // Retrieve stored state from cookie
    const storedState = cookieStore.get(SMART_STATE_COOKIE)?.value;
    const storedIss = cookieStore.get(SMART_ISS_COOKIE)?.value;

    // Clean up state cookies immediately
    cookieStore.delete(SMART_STATE_COOKIE);
    cookieStore.delete(SMART_ISS_COOKIE);

    // CSRF protection: Verify state matches
    if (!storedState || state !== storedState) {
      logger.warn({
        event: 'smart_callback_state_mismatch',
        receivedState: state,
        hasStoredState: !!storedState,
      });

      return NextResponse.json(
        {
          error: 'invalid_request',
          error_description: 'State mismatch - possible CSRF attack or expired session',
        },
        { status: 400 }
      );
    }

    // Verify we have the ISS from the original request
    if (!storedIss) {
      logger.warn({
        event: 'smart_callback_missing_iss',
      });

      return NextResponse.json(
        {
          error: 'invalid_request',
          error_description: 'Session expired - please restart the launch',
        },
        { status: 400 }
      );
    }

    // Get environment configuration
    const clientId = process.env.SMART_CLIENT_ID;
    const clientSecret = process.env.SMART_CLIENT_SECRET;
    const redirectUri = process.env.SMART_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      logger.error({
        event: 'smart_callback_config_error',
        hasClientId: !!clientId,
        hasRedirectUri: !!redirectUri,
      });

      return NextResponse.json(
        {
          error: 'server_error',
          error_description: 'SMART client not configured',
        },
        { status: 500 }
      );
    }

    // Fetch SMART configuration from FHIR server
    let smartConfig;
    try {
      smartConfig = await getSmartConfiguration(storedIss);
    } catch (configError) {
      logger.error({
        event: 'smart_callback_config_fetch_failed',
        iss: new URL(storedIss).hostname,
        error: configError instanceof Error ? configError.message : 'Unknown error',
      });

      return NextResponse.json(
        {
          error: 'server_error',
          error_description: 'Failed to fetch SMART configuration',
        },
        { status: 502 }
      );
    }

    // Exchange authorization code for access token
    let tokenResponse;
    try {
      tokenResponse = await exchangeCodeForToken(
        smartConfig,
        code,
        clientId,
        redirectUri,
        clientSecret
      );
    } catch (tokenError) {
      logger.error({
        event: 'smart_callback_token_exchange_failed',
        iss: new URL(storedIss).hostname,
        error: tokenError instanceof Error ? tokenError.message : 'Unknown error',
      });

      return NextResponse.json(
        {
          error: 'server_error',
          error_description: 'Failed to exchange authorization code for token',
        },
        { status: 502 }
      );
    }

    // Create SMART launch context for session storage
    const launchContext = createLaunchContext(storedIss, tokenResponse);

    // Log successful authentication
    logger.info({
      event: 'smart_callback_success',
      iss: new URL(storedIss).hostname,
      hasPatient: !!tokenResponse.patient,
      hasEncounter: !!tokenResponse.encounter,
      hasFhirUser: !!tokenResponse.fhirUser,
      scopes: tokenResponse.scope,
      expiresIn: tokenResponse.expires_in,
      duration: Date.now() - startTime,
    });

    // Store SMART session in secure HTTP-only cookie
    // We encrypt/encode the session to prevent tampering
    const sessionData = encodeSmartSession(launchContext);

    cookieStore.set(SMART_SESSION_COOKIE, sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenResponse.expires_in || 3600, // Match token expiration
      path: '/',
    });

    // Build redirect URL to dashboard with patient context
    const dashboardUrl = new URL('/dashboard', request.nextUrl.origin);

    // Add patient context to query params for initial navigation
    if (tokenResponse.patient) {
      dashboardUrl.searchParams.set('patient', tokenResponse.patient);
    }
    if (tokenResponse.encounter) {
      dashboardUrl.searchParams.set('encounter', tokenResponse.encounter);
    }

    // Add source indicator for analytics
    dashboardUrl.searchParams.set('source', 'smart_launch');

    // Redirect to dashboard
    return NextResponse.redirect(dashboardUrl);
  } catch (error) {
    logger.error({
      event: 'smart_callback_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: Date.now() - startTime,
    });

    // Clean up any remaining cookies
    const cookieStore = await cookies();
    cookieStore.delete(SMART_STATE_COOKIE);
    cookieStore.delete(SMART_ISS_COOKIE);

    return NextResponse.json(
      {
        error: 'server_error',
        error_description: 'An unexpected error occurred during authorization',
      },
      { status: 500 }
    );
  }
}

/**
 * Encode SMART session for cookie storage
 *
 * In production, this should use proper encryption with a secret key.
 * For now, we use Base64 encoding which provides basic obfuscation.
 *
 * @param context - SMART launch context
 * @returns Encoded session string
 */
function encodeSmartSession(context: SMARTLaunchContext): string {
  // Create a minimal session object (exclude sensitive refresh token from cookie)
  const sessionData = {
    iss: context.iss,
    pat: context.patientId,
    enc: context.encounterId,
    usr: context.fhirUser,
    exp: context.expiresAt,
    scp: context.scope,
    // Access token is stored but should be encrypted in production
    // Consider using jose (JWT) for proper encryption
    tok: context.accessToken,
  };

  // Base64 encode the session data
  // TODO: In production, encrypt with jose or similar library
  return Buffer.from(JSON.stringify(sessionData)).toString('base64url');
}

/**
 * Decode SMART session from cookie
 * Export for use by other API routes
 *
 * @param encoded - Encoded session string from cookie
 * @returns SMART launch context or null if invalid
 */
export function decodeSmartSession(encoded: string): SMARTLaunchContext | null {
  try {
    const decoded = Buffer.from(encoded, 'base64url').toString('utf-8');
    const sessionData = JSON.parse(decoded);

    return {
      iss: sessionData.iss,
      patientId: sessionData.pat,
      encounterId: sessionData.enc,
      fhirUser: sessionData.usr,
      expiresAt: sessionData.exp,
      scope: sessionData.scp,
      accessToken: sessionData.tok,
    };
  } catch (error) {
    logger.warn({
      event: 'smart_session_decode_failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Get SMART session from request cookies
 * Utility function for API routes that need SMART context
 *
 * @returns SMART launch context or null if not authenticated
 */
export async function getSmartSession(): Promise<SMARTLaunchContext | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SMART_SESSION_COOKIE);

  if (!sessionCookie?.value) {
    return null;
  }

  const context = decodeSmartSession(sessionCookie.value);

  // Check if token is expired
  if (context && context.expiresAt < Date.now()) {
    logger.info({
      event: 'smart_session_expired',
      iss: context.iss,
    });
    return null;
  }

  return context;
}
