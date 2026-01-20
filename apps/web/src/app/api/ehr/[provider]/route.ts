/**
 * EHR Provider API
 *
 * GET /api/ehr/[provider] - Get connection status for a provider
 * DELETE /api/ehr/[provider] - Disconnect from a provider
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import {
  getConnectionStatus,
  disconnectProvider,
  getProviderConfig,
  EhrProviderId,
} from '@/lib/ehr';
import { createAuditLog } from '@/lib/audit';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const VALID_PROVIDERS: EhrProviderId[] = ['epic', 'cerner', 'athena', 'medplum'];

/**
 * GET - Get connection status for a provider
 */
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

    // Require authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get provider config
    const config = getProviderConfig(providerId);

    // Get connection status
    const status = await getConnectionStatus(session.user.id, providerId);

    // Audit log
    await createAuditLog({
      action: 'READ',
      resource: 'EhrSession',
      resourceId: providerId,
      details: {
        providerId,
        accessType: 'EHR_CONNECTION_STATUS',
        isConnected: status.isConnected,
      },
      success: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        provider: {
          id: providerId,
          name: config?.displayName || provider,
          logoUrl: config?.logoUrl,
          environment: config?.environment,
        },
        status,
      },
    });
  } catch (error) {
    logger.error({
      event: 'ehr_status_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { success: false, error: 'Failed to get connection status' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Disconnect from a provider
 */
export async function DELETE(
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

    // Require authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Disconnect provider
    await disconnectProvider(session.user.id, providerId);

    // Audit log
    await createAuditLog({
      action: 'DELETE',
      resource: 'EhrSession',
      resourceId: providerId,
      details: {
        providerId,
        accessType: 'EHR_DISCONNECT',
      },
      success: true,
    });

    logger.info({
      event: 'ehr_disconnected',
      providerId,
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      message: `Disconnected from ${providerId}`,
    });
  } catch (error) {
    logger.error({
      event: 'ehr_disconnect_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { success: false, error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
