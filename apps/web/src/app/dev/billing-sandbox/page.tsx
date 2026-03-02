'use client';

import React, { useState, useCallback } from 'react';
import { BillingWidget } from '@/components/finance/BillingWidget';

// ─── Procedure Presets ─────────────────────────────────────────────────────────

const PROCEDURES = [
  { label: 'Consultation', snomedId: '11429006' },
  { label: 'Complete Blood Count', snomedId: '26604007' },
  { label: 'ECG', snomedId: '29303009' },
  { label: 'Chest X-ray', snomedId: '399208008' },
  { label: 'Knee Arthroplasty', snomedId: '609588000' },
  { label: 'Colonoscopy', snomedId: '73761001' },
  { label: 'Unknown Code', snomedId: '999999999' },
] as const;

const COUNTRIES = ['BR', 'AR', 'BO', 'US', 'CA', 'CO', 'MX'] as const;

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function BillingSandboxPage() {
  const [snomedId, setSnomedId] = useState<string | null>(null);
  const [country, setCountry] = useState<'BR' | 'AR' | 'BO' | 'US' | 'CA' | 'CO' | 'MX'>('BR');
  const [insurerId, setInsurerId] = useState('00000000-0000-0000-0000-000000000001');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [lastPayload, setLastPayload] = useState<any>(null);

  const handleRouteResolved = useCallback((result: any) => {
    setLastPayload(result);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-white/5 border border-blue-200/50 dark:border-blue-800/30 mb-4">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-bold tracking-widest uppercase text-blue-600 dark:text-blue-400">
              Dev Sandbox
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Billing Widget
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-lg">
            Select a procedure, country, and insurer to test the BillingWidget
            in all four states: idle, loading, success, and error (manual fallback).
          </p>
        </div>

        {/* Controls */}
        <div className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          {/* Procedure */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Procedure (SNOMED)
            </label>
            <div className="flex flex-wrap gap-2">
              {PROCEDURES.map((p) => (
                <button
                  key={p.snomedId}
                  type="button"
                  onClick={() => {
                    setSnomedId(p.snomedId);
                    setLastPayload(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    snomedId === p.snomedId
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setSnomedId(null);
                  setLastPayload(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  snomedId === null
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Country */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Country
            </label>
            <div className="flex gap-2">
              {COUNTRIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCountry(c)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    country === c
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Insurer ID */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Insurer ID (UUID from seed)
            </label>
            <input
              type="text"
              value={insurerId}
              onChange={(e) => setInsurerId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              placeholder="Paste your seeded insurer UUID here"
            />
          </div>
        </div>

        {/* Widget */}
        <div className="flex justify-center">
          <BillingWidget
            snomedConceptId={snomedId}
            country={country}
            insurerId={insurerId}
            insurerName="Bradesco Saude"
            onRouteResolved={handleRouteResolved}
            className="w-full max-w-sm"
          />
        </div>

        {/* Debug payload */}
        {lastPayload && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              onRouteResolved Payload
            </h2>
            <pre className="text-xs text-slate-600 dark:text-slate-400 overflow-x-auto max-h-80 leading-relaxed">
              {JSON.stringify(lastPayload, null, 2)}
            </pre>
          </div>
        )}

        {/* Footer */}
        <p className="text-xs text-slate-400 text-center pt-4 border-t border-slate-200/40 dark:border-slate-800/40">
          Cortex by Holi Labs &mdash; Billing Intelligence Sandbox
        </p>
      </div>
    </div>
  );
}
