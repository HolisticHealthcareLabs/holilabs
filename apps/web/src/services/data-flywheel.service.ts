/**
 * Data Flywheel Service — Blue Ocean Phase 5 (Track 1)
 *
 * Persists every enterprise risk assessment so the dataset compounds over time.
 * Singleton service with in-memory store (no Prisma migration needed).
 *
 * CONSTRAINT: engine.ts is NEVER modified. The flywheel is a post-evaluation consumer.
 */

import {
  calculateCompositeRisk,
  type PatientRiskInput,
  type OverrideHistoryInput,
} from '@/services/risk-calculator.service';
import {
  exportForEnterprise,
  type AnonymizedRiskPayload,
} from '@/services/enterprise-export.service';
import { webhookDispatcher } from '@/lib/enterprise/webhook-dispatcher';

// Persistence layer — imported lazily to avoid circular deps and test breakage.
// _prisma is null when DATABASE_URL is missing (build time, tests).
let _db: typeof import('@/lib/prisma') | null = null;
function getDb() {
  if (_db !== null) return _db;
  try {
    // Dynamic require so the import is skipped during unit tests
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _db = require('@/lib/prisma');
  } catch {
    _db = null;
  }
  return _db;
}

// =============================================================================
// TYPES
// =============================================================================

export interface FlywheelIngestParams {
  trafficLightResult: {
    color: 'RED' | 'YELLOW' | 'GREEN';
    signals: unknown[];
    metadata?: Record<string, unknown>;
  };
  patientRiskInput: PatientRiskInput;
  overrideHistory: OverrideHistoryInput;
  patientId: string;
  organizationId: string;
  tussCodes?: string[];
}

export interface EnterpriseAssessmentLogEntry {
  id: string;
  anonymizedPatientId: string;
  assessmentPayload: AnonymizedRiskPayload;
  trafficLightColor: 'RED' | 'YELLOW' | 'GREEN';
  signalCount: number;
  compositeRiskScore: number;
  riskTier: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  organizationId: string;
  createdAt: string;
}

export interface FlywheelStats {
  totalAssessments: number;
  byTier: Record<string, number>;
  latestAt: string | null;
}

// =============================================================================
// SINGLETON
// =============================================================================

class DataFlywheelService {
  private store: EnterpriseAssessmentLogEntry[] = [];
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
      const rows = await db.prisma.enterpriseAssessmentLog.findMany({
        orderBy: { createdAt: 'asc' },
      });
      for (const row of rows) {
        this.store.push({
          id: row.id,
          anonymizedPatientId: row.anonymizedPatientId,
          assessmentPayload: row.assessmentPayload as unknown as AnonymizedRiskPayload,
          trafficLightColor: row.trafficLightColor as 'RED' | 'YELLOW' | 'GREEN',
          signalCount: row.signalCount,
          compositeRiskScore: row.compositeRiskScore,
          riskTier: row.riskTier as 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL',
          organizationId: row.organizationId,
          createdAt: row.createdAt.toISOString(),
        });
      }
      this.counter = rows.length;
    } catch {
      // DB unavailable — continue in-memory only
    } finally {
      this.hydrated = true;
    }
  }

  private persistEntry(entry: EnterpriseAssessmentLogEntry): void {
    const db = getDb();
    if (!db?._prisma) return;
    db.prisma.enterpriseAssessmentLog.create({
      data: {
        id: entry.id,
        anonymizedPatientId: entry.anonymizedPatientId,
        assessmentPayload: entry.assessmentPayload as any,
        trafficLightColor: entry.trafficLightColor,
        signalCount: entry.signalCount,
        compositeRiskScore: entry.compositeRiskScore,
        riskTier: entry.riskTier,
        organizationId: entry.organizationId,
        createdAt: new Date(entry.createdAt),
      },
    }).catch(() => {});
  }

  async ingest(params: FlywheelIngestParams): Promise<EnterpriseAssessmentLogEntry> {
    // Step 1: Calculate composite risk
    const riskResult = calculateCompositeRisk(
      params.patientRiskInput,
      params.overrideHistory,
    );

    // Step 2: Export through PII-safe pipeline
    const anonymizedPayload = exportForEnterprise({
      patientId: params.patientId,
      riskResult,
      recentTussCodes: params.tussCodes ?? [],
      protocolCompliance: riskResult.confidence,
      organizationId: params.organizationId,
    });

    // Step 3: Persist the entry
    const entry: EnterpriseAssessmentLogEntry = {
      id: `fly-${++this.counter}-${Date.now().toString(36)}`,
      anonymizedPatientId: anonymizedPayload.anonymizedPatientId,
      assessmentPayload: anonymizedPayload,
      trafficLightColor: params.trafficLightResult.color,
      signalCount: params.trafficLightResult.signals.length,
      compositeRiskScore: riskResult.compositeScore,
      riskTier: riskResult.riskTier,
      organizationId: params.organizationId,
      createdAt: new Date().toISOString(),
    };
    this.store.push(entry);
    this.persistEntry(entry);

    // Step 4: Dispatch webhooks
    // Always dispatch ASSESSMENT_COMPLETED
    webhookDispatcher.dispatch('ASSESSMENT_COMPLETED', {
      anonymizedPatientId: anonymizedPayload.anonymizedPatientId,
      compositeRiskScore: riskResult.compositeScore,
      riskTier: riskResult.riskTier,
    }).catch(() => {});

    // If HIGH or CRITICAL → also dispatch RISK_THRESHOLD_CROSSED
    if (riskResult.riskTier === 'HIGH' || riskResult.riskTier === 'CRITICAL') {
      webhookDispatcher.dispatch('RISK_THRESHOLD_CROSSED', {
        anonymizedPatientId: anonymizedPayload.anonymizedPatientId,
        compositeRiskScore: riskResult.compositeScore,
        riskTier: riskResult.riskTier,
        trafficLightColor: params.trafficLightResult.color,
      }).catch(() => {});
    }

    return entry;
  }

  getAssessmentHistory(anonymizedPatientId: string): EnterpriseAssessmentLogEntry[] {
    return this.store
      .filter((e) => e.anonymizedPatientId === anonymizedPatientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getAllAssessments(): EnterpriseAssessmentLogEntry[] {
    return [...this.store];
  }

  getStats(): FlywheelStats {
    const byTier: Record<string, number> = { LOW: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0 };
    for (const e of this.store) {
      byTier[e.riskTier] = (byTier[e.riskTier] ?? 0) + 1;
    }
    return {
      totalAssessments: this.store.length,
      byTier,
      latestAt: this.store.length > 0 ? this.store[this.store.length - 1].createdAt : null,
    };
  }

  clearStore(): void {
    this.store = [];
    this.counter = 0;
  }
}

export const dataFlywheelService = new DataFlywheelService();
