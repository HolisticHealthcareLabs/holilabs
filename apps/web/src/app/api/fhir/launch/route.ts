/**
 * SMART on FHIR Launch Endpoint
 *
 * GET /api/fhir/launch - Handles EHR launch requests from Epic/Cerner
 *
 * This endpoint is called when a user launches the app from within an EHR system.
 * It initiates the OAuth 2.0 authorization flow by:
 * 1. Validating the launch parameters (iss, launch)
 * 2. Fetching SMART configuration from the FHIR server
 * 3. Generating CSRF state token
 * 4. Redirecting to the EHR's authorization endpoint
 *
 * Query Parameters:
 * - iss: FHIR server base URL (required)
 * - launch: Launch token from EHR (required for EHR launch)
 *
 * Environment Variables:
 * - SMART_CLIENT_ID: OAuth client ID registered with the EHR
 * - SMART_REDIRECT_URI: OAuth callback URL (e.g., https://app.holilabs.com/api/fhir/callback)
 * - SMART_SCOPES: Space-separated OAuth scopes (default: launch patient/*.read openid fhirUser)
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
  buildAuthorizationUrl,
  generateStateToken,
} from '@/lib/fhir/smart-client';

// Force dynamic rendering - this endpoint handles OAuth state
export const dynamic = 'force-dynamic';

// Cookie names for SMART launch state
const SMART_STATE_COOKIE = 'smart_state';
const SMART_ISS_COOKIE = 'smart_iss';

// Default scopes for SMART launch
const DEFAULT_SCOPES = 'launch patient/*.read openid fhirUser';

/**
 * GET /api/fhir/launch
 *
 * Initiates SMART on FHIR authorization flow.
 * Called by EHR when user launches the app.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;

    // Extract launch parameters
    const iss = searchParams.get('iss');
    const launch = searchParams.get('launch');

    // Log launch attempt
    logger.info({
      event: 'smart_launch_initiated',
      iss: iss ? new URL(iss).hostname : null,
      hasLaunch: !!launch,
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
    });

    // Validate required parameters
    if (!iss) {
      logger.warn({
        event: 'smart_launch_missing_iss',
        queryParams: Object.fromEntries(searchParams.entries()),
      });

      return NextResponse.json(
        {
          error: 'missing_parameter',
          error_description: 'The "iss" parameter is required for SMART launch',
        },
        { status: 400 }
      );
    }

    // Validate ISS is a valid URL
    let issUrl: URL;
    try {
      issUrl = new URL(iss);

      // Security: Only allow HTTPS in production
      if (process.env.NODE_ENV === 'production' && issUrl.protocol !== 'https:') {
        logger.warn({
          event: 'smart_launch_insecure_iss',
          iss,
          protocol: issUrl.protocol,
        });

        return NextResponse.json(
          {
            error: 'invalid_request',
            error_description: 'FHIR server must use HTTPS',
          },
          { status: 400 }
        );
      }
    } catch (error) {
      logger.warn({
        event: 'smart_launch_invalid_iss',
        iss,
        error: error instanceof Error ? error.message : 'Invalid URL',
      });

      return NextResponse.json(
        {
          error: 'invalid_request',
          error_description: 'The "iss" parameter must be a valid URL',
        },
        { status: 400 }
      );
    }

    // For EHR launch, the launch token is required
    // For standalone launch, it's optional
    if (!launch) {
      logger.info({
        event: 'smart_launch_standalone',
        iss: issUrl.hostname,
      });
    }

    // Get environment configuration
    const clientId = process.env.SMART_CLIENT_ID;
    const redirectUri = process.env.SMART_REDIRECT_URI;
    const scopes = process.env.SMART_SCOPES || DEFAULT_SCOPES;

    // Validate environment configuration
    if (!clientId) {
      logger.error({
        event: 'smart_launch_config_error',
        error: 'SMART_CLIENT_ID not configured',
      });

      return NextResponse.json(
        {
          error: 'server_error',
          error_description: 'SMART client not configured',
        },
        { status: 500 }
      );
    }

    if (!redirectUri) {
      logger.error({
        event: 'smart_launch_config_error',
        error: 'SMART_REDIRECT_URI not configured',
      });

      return NextResponse.json(
        {
          error: 'server_error',
          error_description: 'SMART redirect URI not configured',
        },
        { status: 500 }
      );
    }

    // Fetch SMART configuration from FHIR server
    let smartConfig;
    try {
      smartConfig = await getSmartConfiguration(iss);
    } catch (error) {
      logger.error({
        event: 'smart_launch_config_fetch_failed',
        iss: issUrl.hostname,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return NextResponse.json(
        {
          error: 'server_error',
          error_description: 'Failed to fetch SMART configuration from FHIR server',
        },
        { status: 502 }
      );
    }

    // Generate CSRF state token
    const state = generateStateToken();

    // Build authorization URL
    const authUrl = buildAuthorizationUrl(
      smartConfig,
      clientId,
      redirectUri,
      scopes,
      state,
      launch || undefined, // Pass launch token for EHR launch
      iss // Pass ISS as audience
    );

    // Store state and ISS in secure cookies for callback verification
    const cookieStore = await cookies();

    // State cookie - for CSRF protection
    cookieStore.set(SMART_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // 'lax' allows the cookie to be sent on redirect from EHR
      maxAge: 10 * 60, // 10 minutes - authorization should complete quickly
      path: '/',
    });

    // ISS cookie - to remember which FHIR server we're authenticating with
    cookieStore.set(SMART_ISS_COOKIE, iss, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60, // 10 minutes
      path: '/',
    });

    // Log successful launch initiation
    logger.info({
      event: 'smart_launch_redirect',
      iss: issUrl.hostname,
      authEndpoint: new URL(smartConfig.authorization_endpoint).hostname,
      hasLaunch: !!launch,
      scopes,
      duration: Date.now() - startTime,
    });

    // Redirect to EHR authorization endpoint
    return NextResponse.redirect(authUrl);
  } catch (error) {
    logger.error({
      event: 'smart_launch_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        error: 'server_error',
        error_description: 'An unexpected error occurred during SMART launch',
      },
      { status: 500 }
    );
  }
}
