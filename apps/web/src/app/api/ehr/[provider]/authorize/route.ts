/**
 * EHR Authorization API
 *
 * GET /api/ehr/[provider]/authorize - Initiate SMART on FHIR OAuth flow
 *
 * Query Parameters:
 * - redirectPath: Where to redirect after auth (default: /dashboard)
 * - launch: EHR launch context (for EHR launch flow)
 * - aud: FHIR server URL (required by some providers)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import {
  generateAuthorizationUrl,
  isProviderConfigured,
  EhrProviderId,
} from '@/lib/ehr';
import { createAuditLog } from '@/lib/audit';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const VALID_PROVIDERS: EhrProviderId[] = ['epic', 'cerner', 'athena', 'medplum'];

export async function GET(
  request: NextRequest,
  context: any
) {
  try {
    const { provider } = await context.params;

    // Validate provider
    if (!VALID_PROVIDERS.includes(provider as EhrProviderId)) {
      return NextResponse.json(
        { success: false, error: `Invalid provider: ${provider}` },
        { status: 400 }
      );
    }

    const providerId = provider as EhrProviderId;

    // Check if provider is configured
    if (!isProviderConfigured(providerId)) {
      return NextResponse.json(
        { success: false, error: `Provider ${provider} is not configured` },
        { status: 400 }
      );
    }

    // Require authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const redirectPath = searchParams.get('redirectPath') || '/dashboard';
    const launch = searchParams.get('launch') || undefined;
    const aud = searchParams.get('aud') || undefined;

    // Generate authorization URL
    const { url, state } = await generateAuthorizationUrl({
      providerId,
      userId: session.user.id,
      redirectPath,
      launch,
      aud,
    });

    // Audit log
    await createAuditLog({
      action: 'CREATE',
      resource: 'EhrSession',
      resourceId: state,
      details: {
        providerId,
        accessType: 'EHR_AUTH_INITIATE',
        hasLaunchContext: !!launch,
      },
      success: true,
    });

    logger.info({
      event: 'ehr_auth_initiated',
      providerId,
      userId: session.user.id,
      hasLaunch: !!launch,
    });

    // Redirect to authorization URL
    return NextResponse.redirect(url);
  } catch (error) {
    logger.error({
      event: 'ehr_auth_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { success: false, error: 'Failed to initiate authorization' },
      { status: 500 }
    );
  }
}
