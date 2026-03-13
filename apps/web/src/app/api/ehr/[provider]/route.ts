/**
 * EHR Provider API
 *
 * GET /api/ehr/[provider] - Get connection status for a provider
 * DELETE /api/ehr/[provider] - Disconnect from a provider
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
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
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const params = await Promise.resolve(context.params ?? ({} as any));
    const provider = params.provider;

    if (!VALID_PROVIDERS.includes(provider as EhrProviderId)) {
      return NextResponse.json(
        { success: false, error: `Invalid provider: ${provider}` },
        { status: 400 }
      );
    }

    const providerId = provider as EhrProviderId;
    const userId = context.user!.id;

    const config = getProviderConfig(providerId);
    const status = await getConnectionStatus(userId, providerId);

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
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
    skipCsrf: true,
  }
);

/**
 * DELETE - Disconnect from a provider
 */
export const DELETE = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const params = await Promise.resolve(context.params ?? ({} as any));
    const provider = params.provider;

    if (!VALID_PROVIDERS.includes(provider as EhrProviderId)) {
      return NextResponse.json(
        { success: false, error: `Invalid provider: ${provider}` },
        { status: 400 }
      );
    }

    const providerId = provider as EhrProviderId;
    const userId = context.user!.id;

    await disconnectProvider(userId, providerId);

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
      userId,
    });

    return NextResponse.json({
      success: true,
      message: `Disconnected from ${providerId}`,
    });
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
  }
);
