/**
 * Enterprise API Usage Metering — Blue Ocean Phase 5
 *
 * Tracks every /api/enterprise/* call for partner billing.
 * Write-through persistence: in-memory store + Prisma DB backing.
 */

// Persistence layer — lazy import to avoid test breakage
let _db: typeof import('@/lib/prisma') | null = null;
function getDb() {
  if (_db !== null) return _db;
  try {
    _db = require('@/lib/prisma');
  } catch {
    _db = null;
  }
  return _db;
}

// =============================================================================
// TYPES
// =============================================================================

export interface UsageLogEntry {
  id: string;
  endpoint: string;
  apiKeyHash: string;
  timestamp: string;
  responseTimeMs: number;
  patientCount: number;
  statusCode: number;
  method: string;
}

export interface UsageSummary {
  totalRequests: number;
  totalPatientAssessments: number;
  avgResponseTimeMs: number;
  byEndpoint: Record<string, number>;
  byStatusCode: Record<number, number>;
}

export interface UsageTrendPoint {
  period: string;
  requests: number;
  patientAssessments: number;
  avgResponseTimeMs: number;
}

// =============================================================================
// SINGLETON
// =============================================================================

class EnterpriseUsageMeter {
  private store: UsageLogEntry[] = [];
  private counter = 0;
  private hydrated = false;

  constructor() {
    this.hydrateFromDb().catch(() => {});
  }

  private async hydrateFromDb(): Promise<void> {
    if (this.hydrated) return;
    try {
      const db = getDb();
      if (!db?._prisma) return;
      const rows = await db.prisma.enterpriseUsageLog.findMany({
        orderBy: { timestamp: 'asc' },
      });
      for (const row of rows) {
        this.store.push({
          id: row.id,
          endpoint: row.endpoint,
          apiKeyHash: row.apiKeyHash,
          timestamp: row.timestamp.toISOString(),
          responseTimeMs: row.responseTimeMs,
          patientCount: row.patientCount,
          statusCode: row.statusCode,
          method: row.method,
        });
      }
      this.counter = rows.length;
    } catch {
      // DB unavailable — continue in-memory only
    } finally {
      this.hydrated = true;
    }
  }

  private persistEntry(entry: UsageLogEntry): void {
    const db = getDb();
    if (!db?._prisma) return;
    db.prisma.enterpriseUsageLog.create({
      data: {
        id: entry.id,
        endpoint: entry.endpoint,
        apiKeyHash: entry.apiKeyHash,
        responseTimeMs: entry.responseTimeMs,
        patientCount: entry.patientCount,
        statusCode: entry.statusCode,
        method: entry.method,
        timestamp: new Date(entry.timestamp),
      },
    }).catch(() => {});
  }

  logUsage(entry: Omit<UsageLogEntry, 'id'>): UsageLogEntry {
    const logEntry: UsageLogEntry = {
      ...entry,
      id: `usage-${++this.counter}-${Date.now().toString(36)}`,
    };
    this.store.push(logEntry);
    this.persistEntry(logEntry);
    return logEntry;
  }

  getUsageSummary(
    apiKeyHash: string,
    range?: { from?: string; to?: string },
  ): UsageSummary {
    let entries = this.store.filter((e) => e.apiKeyHash === apiKeyHash);

    if (range?.from) {
      entries = entries.filter((e) => e.timestamp >= range.from!);
    }
    if (range?.to) {
      entries = entries.filter((e) => e.timestamp <= range.to!);
    }

    const byEndpoint: Record<string, number> = {};
    const byStatusCode: Record<number, number> = {};
    let totalResponseTime = 0;
    let totalPatients = 0;

    for (const e of entries) {
      byEndpoint[e.endpoint] = (byEndpoint[e.endpoint] ?? 0) + 1;
      byStatusCode[e.statusCode] = (byStatusCode[e.statusCode] ?? 0) + 1;
      totalResponseTime += e.responseTimeMs;
      totalPatients += e.patientCount;
    }

    return {
      totalRequests: entries.length,
      totalPatientAssessments: totalPatients,
      avgResponseTimeMs: entries.length > 0
        ? Math.round(totalResponseTime / entries.length)
        : 0,
      byEndpoint,
      byStatusCode,
    };
  }

  getUsageTrend(
    apiKeyHash: string,
    period: 'day' | 'week' | 'month',
  ): UsageTrendPoint[] {
    const entries = this.store.filter((e) => e.apiKeyHash === apiKeyHash);
    const buckets = new Map<string, UsageLogEntry[]>();

    for (const e of entries) {
      const date = new Date(e.timestamp);
      let key: string;
      if (period === 'day') {
        key = date.toISOString().slice(0, 10);
      } else if (period === 'week') {
        const d = new Date(date);
        d.setDate(d.getDate() - d.getDay());
        key = `W-${d.toISOString().slice(0, 10)}`;
      } else {
        key = date.toISOString().slice(0, 7);
      }
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(e);
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([periodKey, items]) => ({
        period: periodKey,
        requests: items.length,
        patientAssessments: items.reduce((s, e) => s + e.patientCount, 0),
        avgResponseTimeMs: items.length > 0
          ? Math.round(items.reduce((s, e) => s + e.responseTimeMs, 0) / items.length)
          : 0,
      }));
  }

  getAllUsage(): UsageLogEntry[] {
    return [...this.store];
  }

  clearStore(): void {
    this.store = [];
    this.counter = 0;
  }
}

export const enterpriseUsageMeter = new EnterpriseUsageMeter();
