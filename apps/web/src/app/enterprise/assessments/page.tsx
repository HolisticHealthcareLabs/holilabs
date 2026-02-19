'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  calculateCompositeRisk,
  type PatientRiskInput,
  type OverrideHistoryInput,
  type CompositeRiskResult,
  type RiskTier,
} from '@/services/risk-calculator.service';
import { exportForEnterprise } from '@/services/enterprise-export.service';
import { estimateClaimCost, getTUSSByCode } from '@/lib/finance/tuss-lookup';
import { RevenueImpactBadge } from '@/components/ui/finance/RevenueImpactBadge';

// =============================================================================
// MOCK PATIENT DATABASE (simulates Prisma lookup)
// =============================================================================

interface MockPatientRecord {
  id: string;
  patient: PatientRiskInput;
  overrides: OverrideHistoryInput;
  tussCodes: string[];
  orgId: string;
}

const MOCK_DATABASE: MockPatientRecord[] = [
  {
    id: 'anon-7a3f-b2c1',
    patient: {
      cvdRiskScore: 45, diabetesRiskScore: 18,
      lastBloodPressureCheck: new Date(Date.now() - 30 * 86400000),
      lastCholesterolTest: null,
      lastHbA1c: new Date(Date.now() - 400 * 86400000),
      lastPhysicalExam: new Date(Date.now() - 100 * 86400000),
      tobaccoUse: true, tobaccoPackYears: 15,
      alcoholUse: false, alcoholDrinksPerWeek: null,
      physicalActivityMinutesWeek: 40, bmi: 31, ageYears: 67,
    },
    overrides: { totalOverrides: 4, hardBlockOverrides: 2, totalRulesEvaluated: 27 },
    tussCodes: ['4.01.01.01', '2.01.01.12-8', '2.01.02.01-9'],
    orgId: 'org-latam-001',
  },
  {
    id: 'anon-e5d2-9f4a',
    patient: {
      cvdRiskScore: 12, diabetesRiskScore: 6,
      lastBloodPressureCheck: new Date(Date.now() - 60 * 86400000),
      lastCholesterolTest: new Date(Date.now() - 90 * 86400000),
      lastHbA1c: new Date(Date.now() - 180 * 86400000),
      lastPhysicalExam: new Date(Date.now() - 200 * 86400000),
      tobaccoUse: false, tobaccoPackYears: null,
      alcoholUse: true, alcoholDrinksPerWeek: 5,
      physicalActivityMinutesWeek: 200, bmi: 23, ageYears: 34,
    },
    overrides: { totalOverrides: 0, hardBlockOverrides: 0, totalRulesEvaluated: 15 },
    tussCodes: ['1.01.01.01', '2.01.01.01-2'],
    orgId: 'org-latam-001',
  },
  {
    id: 'anon-c8b1-4e7d',
    patient: {
      cvdRiskScore: 78, diabetesRiskScore: 22,
      lastBloodPressureCheck: null, lastCholesterolTest: null,
      lastHbA1c: null, lastPhysicalExam: null,
      tobaccoUse: true, tobaccoPackYears: 30,
      alcoholUse: true, alcoholDrinksPerWeek: 18,
      physicalActivityMinutesWeek: 0, bmi: 38, ageYears: 71,
    },
    overrides: { totalOverrides: 7, hardBlockOverrides: 3, totalRulesEvaluated: 27 },
    tussCodes: ['4.01.01.01', '4.01.04.01-9', '2.01.02.05-1', '3.01.01.20-0'],
    orgId: 'org-latam-002',
  },
  {
    id: 'anon-1a9c-d3f8',
    patient: {
      cvdRiskScore: 5, diabetesRiskScore: 3,
      lastBloodPressureCheck: new Date(Date.now() - 15 * 86400000),
      lastCholesterolTest: new Date(Date.now() - 45 * 86400000),
      lastHbA1c: new Date(Date.now() - 60 * 86400000),
      lastPhysicalExam: new Date(Date.now() - 30 * 86400000),
      tobaccoUse: false, tobaccoPackYears: null,
      alcoholUse: false, alcoholDrinksPerWeek: null,
      physicalActivityMinutesWeek: 300, bmi: 21.5, ageYears: 28,
    },
    overrides: { totalOverrides: 0, hardBlockOverrides: 0, totalRulesEvaluated: 10 },
    tussCodes: ['1.01.01.09-6'],
    orgId: 'org-latam-001',
  },
  {
    id: 'anon-f2e6-8b5c',
    patient: {
      cvdRiskScore: 55, diabetesRiskScore: 16,
      lastBloodPressureCheck: new Date(Date.now() - 380 * 86400000),
      lastCholesterolTest: null,
      lastHbA1c: new Date(Date.now() - 500 * 86400000),
      lastPhysicalExam: new Date(Date.now() - 400 * 86400000),
      tobaccoUse: true, tobaccoPackYears: 20,
      alcoholUse: true, alcoholDrinksPerWeek: 12,
      physicalActivityMinutesWeek: 30, bmi: 33, ageYears: 58,
    },
    overrides: { totalOverrides: 5, hardBlockOverrides: 2, totalRulesEvaluated: 27 },
    tussCodes: ['4.01.01.02', '2.01.01.22-5', '2.01.01.18-7', '2.01.02.15-9'],
    orgId: 'org-latam-002',
  },
  {
    id: 'anon-b7d4-2c9e',
    patient: {
      cvdRiskScore: 62, diabetesRiskScore: 20,
      lastBloodPressureCheck: new Date(Date.now() - 500 * 86400000),
      lastCholesterolTest: null, lastHbA1c: null,
      lastPhysicalExam: new Date(Date.now() - 600 * 86400000),
      tobaccoUse: true, tobaccoPackYears: 25,
      alcoholUse: true, alcoholDrinksPerWeek: 14,
      physicalActivityMinutesWeek: 10, bmi: 35, ageYears: 65,
    },
    overrides: { totalOverrides: 6, hardBlockOverrides: 3, totalRulesEvaluated: 27 },
    tussCodes: ['4.01.03.01-3', '4.01.04.05-1', '4.01.02.05-0'],
    orgId: 'org-latam-002',
  },
];

// =============================================================================
// ANIMATIONS
// =============================================================================

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

// =============================================================================
// TIER STYLING
// =============================================================================

const TIER_COLORS: Record<RiskTier, string> = {
  LOW: '#22c55e', MODERATE: '#f59e0b', HIGH: '#f97316', CRITICAL: '#ef4444',
};

function TierBadge({ tier }: { tier: RiskTier }) {
  const styles: Record<RiskTier, string> = {
    CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    MODERATE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    LOW: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[tier]}`}>
      {tier}
    </span>
  );
}

// =============================================================================
// PAGE
// =============================================================================

export default function AssessmentsPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // Filter patients by search query
  const filtered = React.useMemo(() => {
    if (!searchQuery.trim()) return MOCK_DATABASE;
    const q = searchQuery.toLowerCase();
    return MOCK_DATABASE.filter((p) => p.id.toLowerCase().includes(q));
  }, [searchQuery]);

  // Compute risk for selected patient
  const selectedDetail = React.useMemo(() => {
    if (!selectedId) return null;
    const record = MOCK_DATABASE.find((p) => p.id === selectedId);
    if (!record) return null;

    const riskResult = calculateCompositeRisk(record.patient, record.overrides);
    const exportPayload = exportForEnterprise({
      patientId: record.id,
      riskResult,
      recentTussCodes: record.tussCodes,
      protocolCompliance: riskResult.confidence,
      organizationId: record.orgId,
    });
    const costEstimate = record.tussCodes.length > 0
      ? estimateClaimCost(record.tussCodes, riskResult.riskTier === 'CRITICAL' ? 'BLOCK' : 'PASS')
      : null;

    return { record, riskResult, exportPayload, costEstimate };
  }, [selectedId]);

  // Quick stats from all records
  const allResults = React.useMemo(
    () => MOCK_DATABASE.map((r) => ({
      id: r.id,
      result: calculateCompositeRisk(r.patient, r.overrides),
    })),
    [],
  );

  return (
    <div className="relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-indigo-500/6 to-purple-500/6 dark:from-indigo-900/12 dark:to-purple-900/12 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <motion.header {...fadeUp} className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-white/5 border border-indigo-200/50 dark:border-indigo-800/30 backdrop-blur-sm mb-4">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[10px] font-bold tracking-widest uppercase text-indigo-600 dark:text-indigo-400">
              Individual Lookup
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Risk Assessments
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 max-w-xl">
            Search by anonymized patient ID. View composite risk, domain breakdown, TUSS cost estimates, and de-identified export payload.
          </p>
        </motion.header>

        {/* Search Bar */}
        <motion.div {...fadeUp} className="mb-6">
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by anonymized ID (e.g., anon-7a3f)"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200/60 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md text-sm text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
            />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient List */}
          <motion.div {...fadeUp} className="lg:col-span-1 space-y-2">
            <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">
              {filtered.length} patient{filtered.length !== 1 ? 's' : ''}
            </div>
            {filtered.map((record) => {
              const r = allResults.find((a) => a.id === record.id)!;
              const isSelected = selectedId === record.id;
              return (
                <motion.button
                  key={record.id}
                  onClick={() => setSelectedId(isSelected ? null : record.id)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/15 ring-1 ring-indigo-400/30'
                      : 'border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] hover:border-neutral-300/60 dark:hover:border-white/10'
                  } backdrop-blur-md`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs text-neutral-600 dark:text-neutral-300">{record.id}</span>
                    <TierBadge tier={r.result.riskTier} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold tabular-nums text-neutral-800 dark:text-neutral-100">{r.result.compositeScore}</span>
                    <span className="text-[10px] text-neutral-400">{Math.round(r.result.confidence * 100)}% conf.</span>
                  </div>
                  <div className="mt-1.5 flex gap-1">
                    {record.tussCodes.slice(0, 3).map((c) => (
                      <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-white/5 text-neutral-500 dark:text-neutral-400 font-mono">
                        {c}
                      </span>
                    ))}
                    {record.tussCodes.length > 3 && (
                      <span className="text-[9px] text-neutral-400">+{record.tussCodes.length - 3}</span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </motion.div>

          {/* Detail Panel */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {selectedDetail ? (
                <motion.div
                  key={selectedDetail.record.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {/* Header Card */}
                  <div className="rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Assessment Detail</div>
                        <div className="font-mono text-sm text-neutral-700 dark:text-neutral-200 mt-0.5">{selectedDetail.record.id}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold tabular-nums" style={{ color: TIER_COLORS[selectedDetail.riskResult.riskTier] }}>
                          {selectedDetail.riskResult.compositeScore}
                        </div>
                        <TierBadge tier={selectedDetail.riskResult.riskTier} />
                      </div>
                    </div>

                    {/* Domain Breakdown Bars */}
                    <div className="space-y-2.5">
                      {Object.entries(selectedDetail.riskResult.domainBreakdown).map(([domain, rawScore]) => {
                        const score = rawScore as number;
                        const maxWeights: Record<string, number> = {
                          cardiovascular: 30, metabolic: 20, screeningCompliance: 15,
                          lifestyle: 20, overrideRisk: 15,
                        };
                        const max = maxWeights[domain] || 20;
                        const pct = Math.round((score / max) * 100);
                        const label = domain.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
                        return (
                          <div key={domain}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-neutral-600 dark:text-neutral-300">{label}</span>
                              <span className="tabular-nums text-neutral-400">{score}/{max}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-white/5 overflow-hidden">
                              <motion.div
                                className={`h-full rounded-full ${
                                  pct > 66 ? 'bg-red-500' : pct > 33 ? 'bg-yellow-500' : 'bg-indigo-500'
                                }`}
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6, delay: 0.1 }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Confidence + Missing Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-4">
                      <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">Confidence</div>
                      <div className="text-2xl font-bold tabular-nums text-neutral-800 dark:text-neutral-100">
                        {Math.round(selectedDetail.riskResult.confidence * 100)}%
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-neutral-100 dark:bg-white/5 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-indigo-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${selectedDetail.riskResult.confidence * 100}%` }}
                          transition={{ duration: 0.6 }}
                        />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-4">
                      <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">Missing Fields</div>
                      {selectedDetail.riskResult.missingFields.length === 0 ? (
                        <div className="text-sm text-green-600 dark:text-green-400 font-medium">All data present</div>
                      ) : (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedDetail.riskResult.missingFields.map((f) => (
                            <span key={f} className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-mono">
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* TUSS Cost Estimate */}
                  {selectedDetail.costEstimate && (
                    <div className="rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-5">
                      <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-3">Procedure Cost Estimate</div>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <div className="text-[10px] text-neutral-400">Est. Cost (BRL)</div>
                          <div className="text-lg font-bold tabular-nums text-neutral-800 dark:text-neutral-100">
                            R$ {selectedDetail.costEstimate.estimatedCostBRL.toLocaleString('pt-BR')}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-neutral-400">Est. Cost (BOB)</div>
                          <div className="text-lg font-bold tabular-nums text-neutral-800 dark:text-neutral-100">
                            Bs. {selectedDetail.costEstimate.estimatedCostBOB.toLocaleString('es-BO')}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-neutral-400">Weighted Risk</div>
                          <div className="text-lg font-bold tabular-nums text-neutral-800 dark:text-neutral-100">
                            {selectedDetail.costEstimate.totalWeightedRisk}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedDetail.record.tussCodes.map((code) => (
                          <RevenueImpactBadge key={code} tussCode={code} showRate size="sm" />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Export Payload Preview */}
                  <div className="rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-5">
                    <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-3">De-Identified Export Payload</div>
                    <pre className="text-[11px] font-mono text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-white/[0.02] rounded-xl p-4 overflow-x-auto leading-relaxed">
                      {JSON.stringify(selectedDetail.exportPayload, null, 2)}
                    </pre>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-80 rounded-2xl border border-dashed border-neutral-200/60 dark:border-white/5"
                >
                  <svg className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <div className="text-sm text-neutral-400 dark:text-neutral-500">Select a patient to view assessment</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
