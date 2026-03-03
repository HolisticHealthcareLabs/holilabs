'use client';

import React, { useState, useCallback } from 'react';
import type { CDSEvaluationResult, CDSAlert } from '@/lib/cds/types';
import type { DemoScenario, TrafficLightSignal } from '@/lib/demo/demo-scenarios';
import { ScenarioSelector } from './ScenarioSelector';
import { PatientSummary } from './PatientSummary';
import { TrafficLight } from './TrafficLight';
import { AlertList } from './AlertList';
import { AttestationSim } from './AttestationSim';

export function DemoPlayground() {
  const [selectedScenario, setSelectedScenario] = useState<DemoScenario | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<CDSEvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [signal, setSignal] = useState<TrafficLightSignal | 'off'>('off');
  const [overrideAlert, setOverrideAlert] = useState<CDSAlert | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReset = useCallback(() => {
    setSelectedScenario(null);
    setEvaluationResult(null);
    setIsEvaluating(false);
    setSignal('off');
    setOverrideAlert(null);
    setError(null);
  }, []);

  const handleSelectScenario = useCallback(async (scenario: DemoScenario) => {
    setSelectedScenario(scenario);
    setEvaluationResult(null);
    setSignal('off');
    setOverrideAlert(null);
    setError(null);
  }, []);

  const handleRunEvaluation = useCallback(async () => {
    if (!selectedScenario || isEvaluating) return;

    setIsEvaluating(true);
    setEvaluationResult(null);
    setSignal('off');
    setError(null);

    try {
      const res = await fetch('/api/demo/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId: selectedScenario.id }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Evaluation failed.');
        return;
      }

      setEvaluationResult(data.data);
      setSignal(data.scenario.trafficLight as TrafficLightSignal);
    } catch {
      setError('Unable to reach the evaluation server.');
    } finally {
      setIsEvaluating(false);
    }
  }, [selectedScenario, isEvaluating]);

  const handleOverride = useCallback((alert: CDSAlert) => {
    setOverrideAlert(alert);
  }, []);

  const hasCriticalAlerts = evaluationResult?.alerts.some((a) => a.severity === 'critical') ?? false;

  return (
    <div className="min-h-screen bg-white">
      {/* Dark hero header */}
      <section className="bg-[#1d1d1f] px-5 pt-20 pb-14 sm:pt-24 sm:pb-16">
        <div className="max-w-[980px] mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 backdrop-blur-sm px-4 py-[7px] mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0071e3] flex-shrink-0" aria-hidden="true" />
            <span className="text-[13px] font-medium text-white/70">Interactive Demo</span>
          </div>
          <h1 className="text-[clamp(32px,6vw,56px)] font-semibold tracking-[-0.03em] leading-[1.08] text-white mb-4">
            Experience Cortex
          </h1>
          <p className="text-[clamp(16px,2vw,20px)] text-white/50 tracking-[-0.01em] leading-[1.45] max-w-[520px] mx-auto">
            See how Cortex catches billing errors, drug interactions, and compliance gaps in real time.
          </p>
        </div>
      </section>

      {/* Main content */}
      <div className="max-w-[1080px] mx-auto px-5 py-10 sm:py-14">
        {/* Step 1: Select scenario */}
        <div className="mb-10">
          <ScenarioSelector
            selectedId={selectedScenario?.id ?? null}
            onSelect={handleSelectScenario}
          />
        </div>

        {/* Patient summary + evaluation */}
        {selectedScenario && (
          <div className="space-y-8">
            {/* Patient Summary */}
            <PatientSummary
              context={selectedScenario.context}
              patientName={selectedScenario.name}
            />

            {/* Run evaluation button */}
            {!evaluationResult && !isEvaluating && (
              <div className="text-center">
                <button
                  onClick={handleRunEvaluation}
                  className="inline-flex items-center gap-2 rounded-full bg-[#0071e3] text-white text-[16px] font-semibold px-8 py-3.5 hover:bg-[#0077ed] transition-colors shadow-[0_4px_16px_rgba(0,113,227,0.2)] active:scale-[0.98]"
                  aria-label="Run safety check on selected patient"
                >
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                  Run Safety Check
                </button>
              </div>
            )}

            {/* Loading state */}
            {isEvaluating && (
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                  <span className="text-[15px] text-[#6e6e73]">Evaluating clinical rules...</span>
                </div>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="bg-red-50 rounded-xl p-4 ring-1 ring-red-200 text-center">
                <p className="text-[14px] text-red-700">{error}</p>
                <button
                  onClick={handleRunEvaluation}
                  className="mt-2 text-[13px] text-[#0071e3] font-medium hover:text-[#0077ed]"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Results */}
            {evaluationResult && (
              <div className="space-y-8">
                {/* Traffic light + stats */}
                <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
                  <TrafficLight signal={signal} />

                  <div className="text-center sm:text-left">
                    <p className="text-[28px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
                      {signalLabel(signal)}
                    </p>
                    <p className="text-[14px] text-[#6e6e73] mt-1">
                      {evaluationResult.rulesFired} of {evaluationResult.rulesEvaluated} rules triggered
                      {' '}&middot;{' '}
                      {evaluationResult.processingTime}ms
                    </p>
                  </div>
                </div>

                {/* Alerts */}
                <div>
                  <h3 className="text-[11px] font-semibold text-[#6e6e73] uppercase tracking-[0.06em] mb-4">
                    Clinical Alerts ({evaluationResult.alerts.length})
                  </h3>
                  <AlertList
                    alerts={evaluationResult.alerts}
                    onOverride={hasCriticalAlerts ? handleOverride : undefined}
                  />
                </div>

                {/* Override flow */}
                {overrideAlert && (
                  <AttestationSim
                    alert={overrideAlert}
                    onClose={() => setOverrideAlert(null)}
                  />
                )}

                {/* CTA banner */}
                <div className="bg-[#f5f5f7] rounded-2xl p-8 text-center ring-1 ring-black/[0.05]">
                  <h3 className="text-[22px] font-semibold tracking-[-0.02em] text-[#1d1d1f] mb-2">
                    See what Cortex catches in your hospital
                  </h3>
                  <p className="text-[15px] text-[#6e6e73] mb-5">
                    This demo uses 5 patients. Cortex evaluates thousands daily.
                  </p>
                  <a
                    href="/#access"
                    className="inline-flex items-center rounded-full bg-[#0071e3] text-white text-[15px] font-semibold px-7 py-3 hover:bg-[#0077ed] transition-colors active:scale-[0.98]"
                  >
                    Request Access
                  </a>
                  <button
                    onClick={handleReset}
                    className="block mx-auto mt-4 text-[14px] text-[#6e6e73] font-medium hover:text-[#1d1d1f] transition-colors"
                    aria-label="Reset and try another patient scenario"
                  >
                    Try Another Patient
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function signalLabel(signal: TrafficLightSignal | 'off'): string {
  switch (signal) {
    case 'green': return 'All Clear';
    case 'yellow': return 'Warnings Detected';
    case 'red': return 'Critical Alerts';
    default: return 'Awaiting Evaluation';
  }
}
