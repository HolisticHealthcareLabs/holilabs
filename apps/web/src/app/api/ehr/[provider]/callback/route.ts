/**
 * EHR OAuth Callback API
 *
 * GET /api/ehr/[provider]/callback - Handle OAuth callback from EHR
 *
 * Query Parameters (from OAuth):
 * - code: Authorization code
 * - state: State parameter for CSRF protection
 * - error: Error code if authorization failed
 * - error_description: Error description
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeCodeForToken,
  EhrProviderId,
  EhrAuthError,
} from '@/lib/ehr';
import { createAuditLog } from '@/lib/audit';
import logger from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const VALID_PROVIDERS: EhrProviderId[] = ['epic', 'cerner', 'athena', 'medplum'];

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET(
  request: NextRequest,
  context: any
) {
  const { provider } = await context.params;

  // Validate provider
  if (!VALID_PROVIDERS.includes(provider as EhrProviderId)) {
    return redirectWithError('Invalid provider', '/dashboard/settings/integrations');
  }

  const providerId = provider as EhrProviderId;
  const searchParams = request.nextUrl.searchParams;

  // Check for OAuth error
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    logger.warn({
      event: 'ehr_oauth_error',
      providerId,
      error,
      errorDescription,
    });

    return redirectWithError(
      errorDescription || error,
      '/dashboard/settings/integrations'
    );
  }

  // Get authorization code and state
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code || !state) {
    return redirectWithError(
      'Missing code or state parameter',
      '/dashboard/settings/integrations'
    );
  }

  try {
    // Exchange code for token
    const session = await exchangeCodeForToken({
      providerId,
      code,
      state,
    });

    // Get the redirect path from OAuth state
    const oauthState = await prisma.oAuthState.findUnique({
      where: { state },
      select: { redirectPath: true },
    });

    const redirectPath = oauthState?.redirectPath || '/dashboard/settings/integrations';

    // Audit log
    await createAuditLog({
      action: 'CREATE',
      resource: 'EhrSession',
      resourceId: session.id,
      details: {
        providerId,
        accessType: 'EHR_AUTH_COMPLETE',
        hasPatientContext: !!session.patientFhirId,
        hasRefreshToken: !!session.refreshToken,
      },
      success: true,
    });

    logger.info({
      event: 'ehr_auth_completed',
      providerId,
      userId: session.userId,
      sessionId: session.id,
      hasPatientContext: !!session.patientFhirId,
    });

    // Redirect to success page with provider info
    const successUrl = new URL(redirectPath, APP_URL);
    successUrl.searchParams.set('ehr_connected', providerId);
    if (session.patientFhirId) {
      successUrl.searchParams.set('patient_context', session.patientFhirId);
    }

    return NextResponse.redirect(successUrl.toString());
  } catch (error) {
    logger.error({
      event: 'ehr_callback_error',
      providerId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Audit log for failure
    await createAuditLog({
      action: 'CREATE',
      resource: 'EhrSession',
      resourceId: state,
      details: {
        providerId,
        accessType: 'EHR_AUTH_FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      success: false,
    });

    if (error instanceof EhrAuthError) {
      return redirectWithError(
        error.errorDescription || error.message,
        '/dashboard/settings/integrations'
      );
    }

    return redirectWithError(
      'Failed to complete authorization',
      '/dashboard/settings/integrations'
    );
  }
}

/**
 * Helper to redirect with error message
 */
function redirectWithError(error: string, path: string): NextResponse {
  const url = new URL(path, APP_URL);
  url.searchParams.set('ehr_error', error);
  return NextResponse.redirect(url.toString());
}
