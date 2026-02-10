import { NextResponse } from 'next/server';
import { RulesManifest } from '@/lib/governance/rules-manifest';

type ConsoleFilters = {
  country: string;
  site: string;
  unit: string;
  date: string;
};

function readFilters(request: Request): ConsoleFilters {
  const { searchParams } = new URL(request.url);
  return {
    country: searchParams.get('country') ?? 'all',
    site: searchParams.get('site') ?? 'all',
    unit: searchParams.get('unit') ?? 'all',
    date: searchParams.get('date') ?? 'all',
  };
}

export async function GET(request: Request) {
  const version = RulesManifest.getActiveManifest();
  const filters = readFilters(request);

  return NextResponse.json({
    version,
    timestamp: new Date().toISOString(),
    status: 'OPTIMAL',
    filters,
    metricDefinitions: {
      trustScore: { id: 'METRIC-TRUST-SCORE-V1', href: '#metric-definitions' },
      interventions: { id: 'METRIC-INTERVENTIONS-V1', href: '#metric-definitions' },
      hardBrakes: { id: 'METRIC-HARD-BRAKES-V1', href: '#metric-definitions' },
      uptime: { id: 'METRIC-UPTIME-V1', href: '#metric-definitions' },
      protocolsActive: { id: 'METRIC-PROTOCOLS-ACTIVE-V1', href: '#metric-definitions' },
    },
  });
}
