/**
 * Outcome Tracker Service — Blue Ocean Phase 5 (Track 5)
 *
 * Correlates doctor overrides with patient outcomes (readmissions, adverse events).
 * This is the "actuarial gold" — linking override decisions to real outcomes.
 *
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

export type PatientOutcomeType = 'READMISSION' | 'ADVERSE_EVENT' | 'COMPLICATION' | 'RESOLVED';

export interface OutcomeRecord {
  id: string;
  anonymizedPatientId: string;
  outcomeType: PatientOutcomeType;
  linkedOverrideIds: string[];
  metadata: Record<string, unknown>;
  recordedAt: string;
  recordedBy: string;
}

export interface OverrideOutcomeCorrelation {
  totalOverrides: number;
  totalOutcomes: number;
  overridesWithAdverseOutcome: number;
  adverseEventRate: number;
  readmissionRate: number;
  complicationRate: number;
  resolvedRate: number;
  byOutcomeType: Record<string, number>;
  correlationConfidence: number;
}

// =============================================================================
// SINGLETON
// =============================================================================

class OutcomeTrackerService {
  private store: OutcomeRecord[] = [];
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
      const rows = await db.prisma.enterpriseOutcome.findMany({
        orderBy: { recordedAt: 'asc' },
      });
      for (const row of rows) {
        this.store.push({
          id: row.id,
          anonymizedPatientId: row.anonymizedPatientId,
          outcomeType: row.outcomeType as PatientOutcomeType,
          linkedOverrideIds: row.linkedOverrideIds as string[],
          metadata: row.metadata as Record<string, unknown>,
          recordedAt: row.recordedAt.toISOString(),
          recordedBy: row.recordedBy,
        });
      }
      this.counter = rows.length;
    } catch {
      // DB unavailable — continue in-memory only
    } finally {
      this.hydrated = true;
    }
  }

  private persistOutcome(record: OutcomeRecord): void {
    const db = getDb();
    if (!db?._prisma) return;
    db.prisma.enterpriseOutcome.create({
      data: {
        id: record.id,
        anonymizedPatientId: record.anonymizedPatientId,
        outcomeType: record.outcomeType,
        linkedOverrideIds: record.linkedOverrideIds as any,
        metadata: record.metadata as any,
        recordedBy: record.recordedBy,
        recordedAt: new Date(record.recordedAt),
      },
    }).catch(() => {});
  }

  recordOutcome(params: {
    anonymizedPatientId: string;
    outcomeType: PatientOutcomeType;
    linkedOverrideIds?: string[];
    metadata?: Record<string, unknown>;
    recordedBy: string;
  }): OutcomeRecord {
    const record: OutcomeRecord = {
      id: `outcome-${++this.counter}-${Date.now().toString(36)}`,
      anonymizedPatientId: params.anonymizedPatientId,
      outcomeType: params.outcomeType,
      linkedOverrideIds: params.linkedOverrideIds ?? [],
      metadata: params.metadata ?? {},
      recordedAt: new Date().toISOString(),
      recordedBy: params.recordedBy,
    };
    this.store.push(record);
    this.persistOutcome(record);
    return record;
  }

  getPatientOutcomes(anonymizedPatientId: string): OutcomeRecord[] {
    return this.store
      .filter((r) => r.anonymizedPatientId === anonymizedPatientId)
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  }

  getOverrideOutcomeCorrelation(): OverrideOutcomeCorrelation {
    const total = this.store.length;
    if (total === 0) {
      return {
        totalOverrides: 0,
        totalOutcomes: 0,
        overridesWithAdverseOutcome: 0,
        adverseEventRate: 0,
        readmissionRate: 0,
        complicationRate: 0,
        resolvedRate: 0,
        byOutcomeType: {},
        correlationConfidence: 0,
      };
    }

    const byType: Record<string, number> = {};
    let withOverrides = 0;
    let adverseWithOverrides = 0;

    for (const record of this.store) {
      byType[record.outcomeType] = (byType[record.outcomeType] ?? 0) + 1;
      if (record.linkedOverrideIds.length > 0) {
        withOverrides++;
        if (record.outcomeType === 'ADVERSE_EVENT' || record.outcomeType === 'COMPLICATION') {
          adverseWithOverrides++;
        }
      }
    }

    const adverseEvents = byType['ADVERSE_EVENT'] ?? 0;
    const readmissions = byType['READMISSION'] ?? 0;
    const complications = byType['COMPLICATION'] ?? 0;
    const resolved = byType['RESOLVED'] ?? 0;

    // Confidence scales with sample size: 30+ outcomes → high confidence
    const correlationConfidence = Math.min(total / 30, 1);

    return {
      totalOverrides: withOverrides,
      totalOutcomes: total,
      overridesWithAdverseOutcome: adverseWithOverrides,
      adverseEventRate: Math.round((adverseEvents / total) * 10000) / 10000,
      readmissionRate: Math.round((readmissions / total) * 10000) / 10000,
      complicationRate: Math.round((complications / total) * 10000) / 10000,
      resolvedRate: Math.round((resolved / total) * 10000) / 10000,
      byOutcomeType: byType,
      correlationConfidence: Math.round(correlationConfidence * 100) / 100,
    };
  }

  getAllOutcomes(): OutcomeRecord[] {
    return [...this.store];
  }

  clearStore(): void {
    this.store = [];
    this.counter = 0;
  }
}

export const outcomeTrackerService = new OutcomeTrackerService();
