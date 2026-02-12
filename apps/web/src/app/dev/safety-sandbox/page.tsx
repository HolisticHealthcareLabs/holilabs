'use client';

import React from 'react';
import { SafetySignal } from '@/components/ui/safety/SafetySignal';
import { RevenueImpactBadge } from '@/components/ui/finance/RevenueImpactBadge';
import { getAllCodes } from '@/lib/finance/tuss-lookup';

export default function SafetySandboxPage() {
  const [blockOpen, setBlockOpen] = React.useState(false);

  const allTussCodes = getAllCodes();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-8">
      <div className="max-w-3xl mx-auto space-y-10">
        <header>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Safety Signal Sandbox
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Visual verification for SafetySignal + RevenueImpactBadge components
          </p>
        </header>

        {/* ================================================================ */}
        {/* SECTION 1: BLOCK variant */}
        {/* ================================================================ */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
            1. BLOCK Variant (Modal)
          </h2>
          <button
            type="button"
            onClick={() => setBlockOpen(true)}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Trigger BLOCK Modal
          </button>
          <SafetySignal
            severity="BLOCK"
            ruleId="DOAC-CrCl-Rivaroxaban-001"
            ruleName="Rivaroxaban CrCl Contraindication"
            clinicalRationale="Rivaroxaban is contraindicated when CrCl < 15 ml/min due to increased bleeding risk."
            open={blockOpen}
            onOpenChange={setBlockOpen}
            onAcknowledge={() => {
              alert('Acknowledged');
              setBlockOpen(false);
            }}
            onOverride={(reason) => {
              alert(`Override submitted: ${reason}`);
              setBlockOpen(false);
            }}
            financeBadgeSlot={<RevenueImpactBadge tussCode="4.01.01.01" showRate size="sm" />}
          />
        </section>

        {/* ================================================================ */}
        {/* SECTION 2: SOFT_NUDGE variant */}
        {/* ================================================================ */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
            2. SOFT_NUDGE Variant (Inline)
          </h2>
          <SafetySignal
            severity="SOFT_NUDGE"
            ruleId="DOAC-Interaction-Apixaban-Carbamazepine"
            ruleName="Apixaban + Carbamazepine Interaction"
            clinicalRationale="Strong CYP3A4 inducers (like Carbamazepine) decrease Apixaban exposure. Avoid co-administration."
            onAcknowledge={() => alert('SOFT_NUDGE acknowledged')}
            rationaleSlot={
              <p className="text-xs italic opacity-75">
                Source: FDA Eliquis Prescribing Information, 2023. Evidence Grade: B.
              </p>
            }
            financeBadgeSlot={<RevenueImpactBadge tussCode="4.01.01.02" showRate size="sm" />}
          />
        </section>

        {/* ================================================================ */}
        {/* SECTION 3: INFO variant */}
        {/* ================================================================ */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
            3. INFO Variant (Inline, Dismissible)
          </h2>
          <SafetySignal
            severity="INFO"
            ruleId="DOAC-Stale-Renal-001"
            ruleName="Stale Renal Data Attestation"
            clinicalRationale="Renal function data (Creatinine) is older than 72 hours. Please attest that you have reviewed recent labs."
            rationaleSlot={
              <p className="text-xs italic opacity-75">
                Source: Holi Labs Clinical Governance — Stale Data Policy v1.0
              </p>
            }
            financeBadgeSlot={<RevenueImpactBadge tussCode="4.01.01.03" showRate size="sm" />}
          />
        </section>

        {/* ================================================================ */}
        {/* SECTION 4: RevenueImpactBadge grid — all TUSS codes */}
        {/* ================================================================ */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
            4. Revenue Impact Badges (All TUSS Codes)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {allTussCodes.map((code) => (
              <div
                key={code.code}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-white dark:bg-neutral-900"
              >
                <RevenueImpactBadge tussCode={code.code} showRate size="md" />
                <span className="text-xs text-center text-neutral-500 leading-tight">
                  {code.description}
                </span>
                <span className="text-[10px] text-neutral-400">
                  Severities: {code.applicableSeverities.join(', ')}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ================================================================ */}
        {/* SECTION 5: Unknown TUSS fallback */}
        {/* ================================================================ */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
            5. Unknown TUSS Code (Fallback)
          </h2>
          <RevenueImpactBadge tussCode="99.99.99.99" showRate />
        </section>
      </div>
    </div>
  );
}
