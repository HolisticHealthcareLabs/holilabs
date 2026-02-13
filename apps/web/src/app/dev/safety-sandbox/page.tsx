'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { SafetySignal } from '@/components/ui/safety/SafetySignal';
import { RevenueImpactBadge } from '@/components/ui/finance/RevenueImpactBadge';
import { getAllCodes, getActuarialWeight, estimateClaimCost } from '@/lib/finance/tuss-lookup';
import {
  calculateCompositeRisk,
  type PatientRiskInput,
  type OverrideHistoryInput,
} from '@/services/risk-calculator.service';

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_PATIENT: PatientRiskInput = {
  cvdRiskScore: 32,
  diabetesRiskScore: 14,
  lastBloodPressureCheck: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
  lastCholesterolTest: null,
  lastHbA1c: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000), // overdue
  lastPhysicalExam: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
  tobaccoUse: true,
  tobaccoPackYears: 12,
  alcoholUse: false,
  alcoholDrinksPerWeek: null,
  physicalActivityMinutesWeek: 60,
  bmi: 28.5,
  ageYears: 62,
};

const MOCK_OVERRIDES: OverrideHistoryInput = {
  totalOverrides: 3,
  hardBlockOverrides: 1,
  totalRulesEvaluated: 27,
};

// =============================================================================
// ANIMATIONS
// =============================================================================

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

// =============================================================================
// PAGE
// =============================================================================

export default function SafetySandboxPage() {
  const [blockOpen, setBlockOpen] = React.useState(false);
  const allTussCodes = getAllCodes();

  // Live risk calculation from mock patient
  const riskResult = React.useMemo(
    () => calculateCompositeRisk(MOCK_PATIENT, MOCK_OVERRIDES),
    [],
  );

  // Claim cost estimate
  const costEstimate = React.useMemo(
    () => estimateClaimCost(['4.01.01.01', '4.01.01.02'], 'BLOCK'),
    [],
  );

  const tierColors: Record<string, string> = {
    LOW: 'text-green-500',
    MODERATE: 'text-yellow-500',
    HIGH: 'text-orange-500',
    CRITICAL: 'text-red-500',
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] dark:bg-[#0a0a0f] relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-500/8 to-indigo-500/8 dark:from-blue-900/15 dark:to-indigo-900/15 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-sky-400/6 to-blue-500/6 dark:from-sky-900/10 dark:to-blue-900/10 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        {/* ============================================================= */}
        {/* HEADER */}
        {/* ============================================================= */}
        <motion.header {...fadeUp} className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-white/5 border border-blue-200/50 dark:border-blue-800/30 backdrop-blur-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-bold tracking-widest uppercase text-blue-600 dark:text-blue-400">
              Dev Sandbox
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-neutral-900 dark:text-white leading-[1.1]">
            Cortex{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              Safety Signal
            </span>
          </h1>
          <p className="mt-3 text-base text-neutral-500 dark:text-neutral-400 max-w-2xl leading-relaxed">
            Clinical safety signals, revenue impact badges, and the Blue Ocean risk engine
            — all rendered with production-grade components.
          </p>
        </motion.header>

        <motion.div {...stagger} initial="initial" animate="animate" className="space-y-12">
          {/* ============================================================= */}
          {/* RISK ENGINE READOUT */}
          {/* ============================================================= */}
          <motion.section {...fadeUp}>
            <SectionLabel label="Blue Ocean" title="Risk Calculator Engine" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Composite Score Card */}
              <div className="rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-6">
                <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">Composite Risk Score</div>
                <div className="flex items-end gap-3">
                  <span className={`text-5xl font-bold tabular-nums ${tierColors[riskResult.riskTier]}`}>
                    {riskResult.compositeScore}
                  </span>
                  <span className="text-sm text-neutral-400 mb-1.5">/ 100</span>
                  <span className={`ml-auto text-xs font-bold px-2.5 py-1 rounded-full ${
                    riskResult.riskTier === 'LOW' ? 'bg-green-500/10 text-green-600' :
                    riskResult.riskTier === 'MODERATE' ? 'bg-yellow-500/10 text-yellow-600' :
                    riskResult.riskTier === 'HIGH' ? 'bg-orange-500/10 text-orange-600' :
                    'bg-red-500/10 text-red-600'
                  }`}>
                    {riskResult.riskTier}
                  </span>
                </div>
                <div className="text-xs text-neutral-400 mt-2">
                  Confidence: {(riskResult.confidence * 100).toFixed(0)}%
                  {riskResult.missingFields.length > 0 && (
                    <span className="text-yellow-500 ml-2">
                      ({riskResult.missingFields.length} fields missing)
                    </span>
                  )}
                </div>
              </div>

              {/* Domain Breakdown */}
              <div className="rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-6">
                <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">Domain Breakdown</div>
                <div className="space-y-2.5">
                  {Object.entries(riskResult.domainBreakdown).map(([domain, rawScore]) => {
                    const score = rawScore as number;
                    const maxWeights: Record<string, number> = {
                      cardiovascular: 30, metabolic: 20, screeningCompliance: 15,
                      lifestyle: 20, overrideRisk: 15,
                    };
                    const max = maxWeights[domain] || 20;
                    const pct = Math.round((score / max) * 100);
                    const label = domain.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                    return (
                      <div key={domain}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-neutral-600 dark:text-neutral-300">{label}</span>
                          <span className="tabular-nums text-neutral-400">{score}/{max}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-white/5 overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${
                              pct > 66 ? 'bg-red-500' : pct > 33 ? 'bg-yellow-500' : 'bg-blue-500'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Cost Estimate Row */}
            <div className="mt-4 grid grid-cols-3 gap-4">
              <MetricCard label="Actuarial Weight (4.01.01.01)" value={getActuarialWeight('4.01.01.01').toFixed(2)} />
              <MetricCard label="Est. Cost Impact (BOB)" value={`Bs. ${costEstimate.estimatedCostBOB.toLocaleString()}`} />
              <MetricCard label="Weighted Risk Total" value={costEstimate.totalWeightedRisk.toFixed(2)} />
            </div>
          </motion.section>

          {/* ============================================================= */}
          {/* SAFETY SIGNALS */}
          {/* ============================================================= */}
          <motion.section {...fadeUp}>
            <SectionLabel label="Track 2" title="Safety Signals" />
            <div className="space-y-4 mt-4">
              {/* BLOCK */}
              <div className="rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">BLOCK</span>
                    <p className="text-sm text-neutral-500 mt-0.5">Modal — blocks clinical workflow</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBlockOpen(true)}
                    className="rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/30 transition-shadow"
                  >
                    Trigger Modal
                  </button>
                </div>
                <SafetySignal
                  severity="BLOCK"
                  ruleId="DOAC-CrCl-Rivaroxaban-001"
                  ruleName="Rivaroxaban CrCl Contraindication"
                  clinicalRationale="Rivaroxaban is contraindicated when CrCl < 15 ml/min due to increased bleeding risk."
                  open={blockOpen}
                  onOpenChange={setBlockOpen}
                  onAcknowledge={() => setBlockOpen(false)}
                  onOverride={() => setBlockOpen(false)}
                  financeBadgeSlot={<RevenueImpactBadge tussCode="4.01.01.01" showRate size="sm" />}
                />
              </div>

              {/* SOFT_NUDGE */}
              <div className="rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-6">
                <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-500 mb-3 block">SOFT NUDGE</span>
                <SafetySignal
                  severity="SOFT_NUDGE"
                  ruleId="DOAC-Interaction-Apixaban-Carbamazepine"
                  ruleName="Apixaban + Carbamazepine Interaction"
                  clinicalRationale="Strong CYP3A4 inducers (like Carbamazepine) decrease Apixaban exposure. Avoid co-administration."
                  onAcknowledge={() => {}}
                  rationaleSlot={
                    <p className="text-xs italic opacity-60">
                      Source: FDA Eliquis Prescribing Information, 2023. Evidence Grade: B.
                    </p>
                  }
                  financeBadgeSlot={<RevenueImpactBadge tussCode="4.01.01.02" showRate size="sm" />}
                />
              </div>

              {/* INFO */}
              <div className="rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-6">
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-3 block">INFO</span>
                <SafetySignal
                  severity="INFO"
                  ruleId="DOAC-Stale-Renal-001"
                  ruleName="Stale Renal Data Attestation"
                  clinicalRationale="Renal function data (Creatinine) is older than 72 hours. Please attest that you have reviewed recent labs."
                  rationaleSlot={
                    <p className="text-xs italic opacity-60">
                      Source: Holi Labs Clinical Governance — Stale Data Policy v1.0
                    </p>
                  }
                  financeBadgeSlot={<RevenueImpactBadge tussCode="4.01.01.03" showRate size="sm" />}
                />
              </div>
            </div>
          </motion.section>

          {/* ============================================================= */}
          {/* REVENUE IMPACT BADGES */}
          {/* ============================================================= */}
          <motion.section {...fadeUp}>
            <SectionLabel label="Track 3" title="Revenue Impact Badges" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
              {allTussCodes.map((code) => (
                <motion.div
                  key={code.code}
                  whileHover={{ scale: 1.02 }}
                  className="flex flex-col items-center gap-2.5 p-5 rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md transition-colors hover:border-blue-300/40 dark:hover:border-blue-700/30"
                >
                  <RevenueImpactBadge tussCode={code.code} showRate size="md" />
                  <span className="text-xs text-center text-neutral-500 dark:text-neutral-400 leading-tight">
                    {code.description}
                  </span>
                  <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                    <span>Sev: {code.applicableSeverities.join(', ')}</span>
                    <span className="w-px h-3 bg-neutral-200 dark:bg-neutral-700" />
                    <span>AW: {code.actuarialWeight}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* ============================================================= */}
          {/* UNKNOWN FALLBACK */}
          {/* ============================================================= */}
          <motion.section {...fadeUp}>
            <SectionLabel label="Edge Case" title="Unknown TUSS Code" />
            <div className="mt-4 rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-6 flex items-center gap-4">
              <RevenueImpactBadge tussCode="99.99.99.99" showRate />
              <span className="text-sm text-neutral-500">Graceful fallback for unrecognized codes</span>
            </div>
          </motion.section>
        </motion.div>

        {/* Footer */}
        <motion.footer
          {...fadeUp}
          className="mt-20 pt-8 border-t border-neutral-200/40 dark:border-white/5"
        >
          <p className="text-xs text-neutral-400 text-center">
            Cortex by Holi Labs &mdash; Clinical Safety + Actuarial Intelligence
          </p>
        </motion.footer>
      </div>
    </div>
  );
}

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

function SectionLabel({ label, title }: { label: string; title: string }) {
  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 dark:text-blue-400">
        {label}
      </span>
      <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100 mt-0.5">
        {title}
      </h2>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200/60 dark:border-white/5 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-4">
      <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">{label}</div>
      <div className="text-lg font-bold tabular-nums text-neutral-800 dark:text-neutral-100">{value}</div>
    </div>
  );
}
