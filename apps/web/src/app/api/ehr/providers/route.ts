/**
 * EHR Providers API
 *
 * GET /api/ehr/providers - List available EHR providers and their status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import {
  getAvailableProviders,
  getAllConnectionStatuses,
  isProviderConfigured,
} from '@/lib/ehr';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get all configured providers
    const availableProviders = getAvailableProviders();

    // Get connection status for each provider
    const connectionStatuses = await getAllConnectionStatuses(session.user.id);

    // Build provider list with status
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

    // Audit log
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
  } catch (error) {
    console.error('Error fetching EHR providers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch providers' },
      { status: 500 }
    );
  }
}
