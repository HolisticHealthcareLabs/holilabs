/**
 * EHR Providers API
 *
 * GET /api/ehr/providers - List available EHR providers and their status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import {
  getAvailableProviders,
  getAllConnectionStatuses,
  isProviderConfigured,
} from '@/lib/ehr';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const userId = context.user!.id;

    const availableProviders = getAvailableProviders();
    const connectionStatuses = await getAllConnectionStatuses(userId);

    const providers = availableProviders.map((provider) => {
      const status = connectionStatuses.find((s) => s.providerId === provider.id);

      return {
        id: provider.id,
        name: provider.displayName,
        logoUrl: provider.logoUrl,
        environment: provider.environment,
        isConfigured: isProviderConfigured(provider.id),
        isConnected: status?.isConnected || false,
        connectedAt: status?.connectedAt,
        expiresAt: status?.expiresAt,
        patientContext: status?.patientContext,
        launchTypes: provider.launchTypes,
        capabilities: {
          supportsRefreshToken: provider.supportsRefreshToken,
          supportsBackendServices: provider.supportsBackendServices,
          requiresPKCE: provider.requiresPKCE,
        },
      };
    });

    await createAuditLog({
      action: 'READ',
      resource: 'EhrProvider',
      resourceId: 'list',
      details: {
        providersCount: providers.length,
        connectedCount: providers.filter((p) => p.isConnected).length,
        accessType: 'EHR_PROVIDERS_LIST',
      },
      success: true,
    });

    return NextResponse.json({
      success: true,
      data: { providers },
    });
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
    skipCsrf: true,
  }
);
