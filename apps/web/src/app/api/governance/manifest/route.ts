import { NextResponse } from 'next/server';
import { RulesManifest } from '@/lib/governance/rules-manifest';
import {
  getActiveContentBundle,
  getActiveSignoffRecord,
  getRuntimeContentStatus,
} from '@/lib/clinical/governance-policy';

type ConsoleFilters = {
  country: string;
  site: string;
  unit: string;
  date: string;
};

const METRIC_KEYS = ['trustScore', 'interventions', 'hardBrakes', 'uptime', 'protocolsActive'] as const;
type MetricKey = (typeof METRIC_KEYS)[number];

type MetricDefinition = {
  id: string;
  numerator: string;
  denominator: string;
  queryRef: string;
};

const METRIC_DEFINITION_SCHEMA_VERSION = 'kpi-definitions-v1';

const metricDefinitions: Record<MetricKey, MetricDefinition> = {
  trustScore: {
    id: 'METRIC-TRUST-SCORE-V1',
    numerator: 'Weighted policy-aligned decisions across evaluated events',
    denominator: 'Total weighted evaluated events',
    queryRef: 'qry.governance.trust_score.v1',
  },
  interventions: {
    id: 'METRIC-INTERVENTIONS-V1',
    numerator: 'Validation interventions executed in selected interval',
    denominator: 'Total evaluated clinical workflow events',
    queryRef: 'qry.governance.interventions.count.v1',
  },
  hardBrakes: {
    id: 'METRIC-HARD-BRAKES-V1',
    numerator: 'Critical stop interventions issued in selected interval',
    denominator: 'Total interventions executed in selected interval',
    queryRef: 'qry.governance.interventions.hard_brakes_ratio.v1',
  },
  uptime: {
    id: 'METRIC-UPTIME-V1',
    numerator: 'Minutes with policy engine healthy and enforcing',
    denominator: 'Total scheduled service minutes in selected interval',
    queryRef: 'qry.governance.runtime.uptime.v1',
  },
  protocolsActive: {
    id: 'METRIC-PROTOCOLS-ACTIVE-V1',
    numerator: 'Protocols loaded and successfully enforcing',
    denominator: 'Total protocols deployed to selected fleet scope',
    queryRef: 'qry.governance.protocols.active_ratio.v1',
  },
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

  // Active content bundle + signoff metadata (FR-B governance)
  const activeBundle = getActiveContentBundle();
  const signoffRecord = getActiveSignoffRecord();
  const runtimeContentStatus = getRuntimeContentStatus(activeBundle);

  return NextResponse.json({
    version,
    timestamp: new Date().toISOString(),
    status: 'OPTIMAL',
    filters,
    metricDefinitionSchemaVersion: METRIC_DEFINITION_SCHEMA_VERSION,
    metricDefinitionKeys: METRIC_KEYS,
    metricDefinitions,
    contentBundle: {
      contentBundleVersion: activeBundle.contentBundleVersion,
      contentChecksum: activeBundle.contentChecksum,
      protocolVersion: activeBundle.protocolVersion,
      lifecycleState: activeBundle.lifecycleState,
      signoffStatus: activeBundle.signoffStatus,
      runtimeContentStatus,
      updatedAt: activeBundle.updatedAt,
    },
    signoff: {
      signedOffBy: signoffRecord.signedOffBy,
      role: signoffRecord.role,
      signedOffAt: signoffRecord.signedOffAt,
      status: signoffRecord.status,
      notes: signoffRecord.notes ?? null,
    },
  });
}
