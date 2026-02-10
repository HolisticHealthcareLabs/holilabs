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
  country?: string;
  site?: string;
  unit?: string;
  occurredAt?: string;
};

const DATE_RANGE_TO_MS: Record<string, number | null> = {
  all: null,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

function toFilterState(request: Request): TelemetryFilterState {
  const { searchParams } = new URL(request.url);
  return {
    country: searchParams.get('country') ?? 'all',
    site: searchParams.get('site') ?? 'all',
    unit: searchParams.get('unit') ?? 'all',
    date: searchParams.get('date') ?? 'all',
  };
}

function withDemoDimensions(events: StreamEvent[]): StreamEvent[] {
  const now = Date.now();
  const minute = 60 * 1000;
  const dimensions = [
    { country: 'AR', site: 'Site-A', unit: 'ICU', occurredAt: new Date(now - minute * 5).toISOString() },
    { country: 'AR', site: 'Site-B', unit: 'ER', occurredAt: new Date(now - minute * 35).toISOString() },
    { country: 'BO', site: 'Site-A', unit: 'Oncology', occurredAt: new Date(now - minute * 180).toISOString() },
    { country: 'BR', site: 'Site-C', unit: 'Ward-3', occurredAt: new Date(now - minute * 24 * 60).toISOString() },
  ];

  return events.map((event, index) => ({
    ...event,
    ...dimensions[index % dimensions.length],
  }));
}

function applyFilters(events: StreamEvent[], filters: TelemetryFilterState): StreamEvent[] {
  const now = Date.now();
  const maxAgeMs = DATE_RANGE_TO_MS[filters.date] ?? null;

  return events.filter((event) => {
    const countryMatch = filters.country === 'all' || event.country === filters.country;
    const siteMatch = filters.site === 'all' || event.site === filters.site;
    const unitMatch = filters.unit === 'all' || event.unit === filters.unit;
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

  // Demo clinician: always return synthetic events
  if (isDemoClinician(userId, email)) {
    const baseEvents = getSyntheticTelemetryEvents() as StreamEvent[];
    const filteredEvents = applyFilters(withDemoDimensions(baseEvents), filters);
    return NextResponse.json(filteredEvents, { status: 200 });
  }

  // For now, return empty rather than hard-coding localhost ports.
  return NextResponse.json([], { status: 200 });
}

