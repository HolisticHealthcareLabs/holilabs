/**
 * Telemetry stream (demo-friendly).
 *
 * The dashboard control plane expects a stream of "validation events".
 * In local/demo mode we serve synthetic events so the UI is never empty.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { getSyntheticTelemetryEvents, isDemoClinician } from '@/lib/demo/synthetic';

export const dynamic = 'force-dynamic';

type TelemetryFilterState = {
  country: string;
  site: string;
  unit: string;
  date: string;
};

type StreamEvent = {
  id: string;
  time: string;
  level: 'INFO' | 'WARN' | 'CRITICAL';
  title: string;
  message: string;
  tags: string[];
  userId: string;
  isDeterminstic?: boolean;
  eventType?: 'OVERRIDE' | 'BLOCKED' | 'FLAGGED' | 'PASSED' | 'SHADOW_BLOCK';
  reason?: string;
  reasonCode?: string;
  protocolVersion?: string;
  country?: string;
  site?: string;
  siteId?: string;
  unit?: string;
  occurredAt?: string;
};

const DATE_RANGE_TO_MS: Record<string, number | null> = {
  all: null,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

function normalizeFilterValue(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function equalsFilter(eventValue: string | undefined, filterValue: string): boolean {
  return normalizeFilterValue(eventValue) === normalizeFilterValue(filterValue);
}

function toFilterState(request: Request): TelemetryFilterState {
  const { searchParams } = new URL(request.url);
  return {
    country: searchParams.get('country') ?? 'all',
    site: searchParams.get('site') ?? 'all',
    unit: searchParams.get('unit') ?? 'all',
    date: searchParams.get('date') ?? 'all',
  };
}

function toClock(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '--:--:--' : d.toTimeString().slice(0, 8);
}

function withDemoDimensions(events: StreamEvent[]): StreamEvent[] {
  const now = Date.now();
  const minute = 60 * 1000;
  const dimensions = [
    { country: 'AR', site: 'Site-A', siteId: 'Site-A', unit: 'ICU', occurredAt: new Date(now - minute * 5).toISOString(), protocolVersion: 'CORTEX-V1' },
    { country: 'AR', site: 'Site-B', siteId: 'Site-B', unit: 'ER', occurredAt: new Date(now - minute * 35).toISOString(), protocolVersion: 'CORTEX-V1' },
    { country: 'BO', site: 'Site-A', siteId: 'Site-A', unit: 'Cardiology', occurredAt: new Date(now - minute * 180).toISOString(), protocolVersion: 'CORTEX-V1' },
    { country: 'BR', site: 'Site-C', siteId: 'Site-C', unit: 'Ward-3', occurredAt: new Date(now - minute * 24 * 60).toISOString(), protocolVersion: 'CORTEX-V1' },
  ];

  return events.map((event, index) => ({
    ...event,
    ...dimensions[index % dimensions.length],
  }));
}

function withSyntheticOverrideEvents(events: StreamEvent[]): StreamEvent[] {
  const now = Date.now();
  const overrideEvents: StreamEvent[] = [
    {
      id: 'evt_override_01',
      time: toClock(new Date(now - 8 * 60 * 1000).toISOString()),
      level: 'WARN',
      title: 'Clinician Override Logged',
      message: 'Clinician Override: BENEFIT_OUTWEIGHS_RISK',
      tags: ['governance', 'override', 'override_reason:BENEFIT_OUTWEIGHS_RISK'],
      eventType: 'OVERRIDE',
      reason: 'BENEFIT_OUTWEIGHS_RISK',
      reasonCode: 'BENEFIT_OUTWEIGHS_RISK',
      protocolVersion: 'CORTEX-V1',
      country: 'AR',
      site: 'Site-A',
      siteId: 'Site-A',
      unit: 'ICU',
      occurredAt: new Date(now - 8 * 60 * 1000).toISOString(),
      userId: 'demo-clinician-id',
      isDeterminstic: true,
    },
    {
      id: 'evt_override_02',
      time: toClock(new Date(now - 26 * 60 * 1000).toISOString()),
      level: 'WARN',
      title: 'Clinician Override Logged',
      message: 'Clinician Override: GUIDELINE_MISMATCH',
      tags: ['governance', 'override', 'override_reason:GUIDELINE_MISMATCH'],
      eventType: 'OVERRIDE',
      reason: 'GUIDELINE_MISMATCH',
      reasonCode: 'GUIDELINE_MISMATCH',
      protocolVersion: 'CORTEX-V1',
      country: 'AR',
      site: 'Site-B',
      siteId: 'Site-B',
      unit: 'ER',
      occurredAt: new Date(now - 26 * 60 * 1000).toISOString(),
      userId: 'demo-clinician-id',
      isDeterminstic: true,
    },
    {
      id: 'evt_override_03',
      time: toClock(new Date(now - 58 * 60 * 1000).toISOString()),
      level: 'WARN',
      title: 'Clinician Override Logged',
      message: 'Clinician Override: BENEFIT_OUTWEIGHS_RISK',
      tags: ['governance', 'override', 'override_reason:BENEFIT_OUTWEIGHS_RISK'],
      eventType: 'OVERRIDE',
      reason: 'BENEFIT_OUTWEIGHS_RISK',
      reasonCode: 'BENEFIT_OUTWEIGHS_RISK',
      protocolVersion: 'CORTEX-V1',
      country: 'BO',
      site: 'Site-A',
      siteId: 'Site-A',
      unit: 'Oncology',
      occurredAt: new Date(now - 58 * 60 * 1000).toISOString(),
      userId: 'demo-clinician-id',
      isDeterminstic: true,
    },
  ];

  return [...events, ...overrideEvents];
}

function applyFilters(events: StreamEvent[], filters: TelemetryFilterState): StreamEvent[] {
  const now = Date.now();
  const maxAgeMs = DATE_RANGE_TO_MS[filters.date] ?? null;

  return events.filter((event) => {
    const countryMatch = filters.country === 'all' || equalsFilter(event.country, filters.country);
    const siteMatch = filters.site === 'all' || equalsFilter(event.site ?? event.siteId, filters.site);
    const unitMatch = filters.unit === 'all' || equalsFilter(event.unit, filters.unit);
    const dateMatch =
      maxAgeMs === null ||
      !event.occurredAt ||
      now - new Date(event.occurredAt).getTime() <= maxAgeMs;

    return countryMatch && siteMatch && unitMatch && dateMatch;
  });
}

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const email = session?.user?.email ?? null;
  const filters = toFilterState(request);
  const shouldServeSynthetic =
    isDemoClinician(userId, email) ||
    process.env.NODE_ENV !== 'production' ||
    process.env.HOLI_FORCE_SYNTHETIC_TELEMETRY === '1';

  // In demo/local environments, keep the console stream non-empty and filterable.
  if (shouldServeSynthetic) {
    const baseEvents = getSyntheticTelemetryEvents() as StreamEvent[];
    const syntheticEvents = withSyntheticOverrideEvents(withDemoDimensions(baseEvents));
    const filteredEvents = applyFilters(syntheticEvents, filters);
    return NextResponse.json(filteredEvents, { status: 200 });
  }

  // For now, return empty rather than hard-coding localhost ports.
  return NextResponse.json([], { status: 200 });
}

