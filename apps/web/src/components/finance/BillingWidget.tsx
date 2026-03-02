'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, Info, Shield, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type BillingCountry = 'BR' | 'AR' | 'BO' | 'US' | 'CA' | 'CO' | 'MX';

interface PriorAuthResult {
  required: boolean;
  windowDays: number | null;
  urgentWindowHours: number | null;
  requiredDocuments: string[];
  requiredDiagnoses: string[];
  notes: string | null;
}

interface RateLookupResult {
  billingCode: string;
  billingSystem: string;
  negotiatedRate: number;
  currency: string;
  confidence: string;
  isCovered: boolean;
  coverageLimit: number | null;
  copayFlat: number | null;
  copayPercent: number | null;
  usedFallback: boolean;
}

interface ClinicianNetworkStatus {
  isInNetwork: boolean;
  networkTier: string | null;
}

interface ClaimRouteResult {
  snomedConceptId: string;
  country: BillingCountry;
  billingCode: string | null;
  billingSystem: string | null;
  procedureDescription: string | null;
  actuarialWeight: number;
  rate: RateLookupResult | null;
  priorAuth: PriorAuthResult;
  clinicianNetwork: ClinicianNetworkStatus | null;
  routingConfidence: number;
  usedFallback: boolean;
  resolvedAt: string;
}

type WidgetState = 'idle' | 'loading' | 'success' | 'error';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface BillingWidgetProps {
  snomedConceptId: string | null;
  country: BillingCountry;
  insurerId: string;
  insurerName?: string;
  clinicianId?: string;
  onRouteResolved?: (result: ClaimRouteResult) => void;
  className?: string;
}

// ─── Currency Formatting ──────────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  BRL: 'R$',
  ARS: 'AR$',
  BOB: 'Bs',
  USD: '$',
  CAD: 'CA$',
  COP: 'COL$',
  MXN: 'MX$',
};

function formatCurrency(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  return `${symbol} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ─── Confidence Helpers ───────────────────────────────────────────────────────

function confidenceLabel(value: number): string {
  if (value >= 0.9) return 'High';
  if (value >= 0.7) return 'Good';
  if (value >= 0.5) return 'Moderate';
  return 'Low';
}

function confidenceColor(value: number): string {
  if (value >= 0.9) return 'bg-emerald-500';
  if (value >= 0.7) return 'bg-emerald-400';
  if (value >= 0.5) return 'bg-amber-400';
  return 'bg-red-400';
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

function SkeletonRow({ width = 'w-3/4' }: { width?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="h-3 w-20 rounded bg-slate-200 animate-pulse" />
      <div className={cn('h-3 rounded bg-slate-200 animate-pulse', width)} />
    </div>
  );
}

function WidgetSkeleton() {
  return (
    <div className="space-y-0 divide-y divide-slate-100">
      <SkeletonRow width="w-32" />
      <SkeletonRow width="w-24" />
      <SkeletonRow width="w-28" />
      <SkeletonRow width="w-20" />
    </div>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function DataRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between py-2.5', className)}>
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
        {label}
      </span>
      <span className="text-sm font-semibold text-slate-800">{children}</span>
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', confidenceColor(value))}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-slate-600">
        {pct}% {confidenceLabel(value)}
      </span>
    </div>
  );
}

function PriorAuthBadge({ priorAuth }: { priorAuth: PriorAuthResult }) {
  if (!priorAuth.required) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="w-3 h-3" />
        Not required
      </span>
    );
  }

  return (
    <div className="space-y-1.5">
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
        <AlertTriangle className="w-3 h-3" />
        Required
        {priorAuth.windowDays && (
          <span className="text-amber-500 font-normal">
            ({priorAuth.windowDays}d window)
          </span>
        )}
      </span>
      {priorAuth.requiredDocuments.length > 0 && (
        <div className="text-[11px] text-slate-500 pl-1">
          Docs: {priorAuth.requiredDocuments.join(', ')}
        </div>
      )}
    </div>
  );
}

function NetworkBadge({ network }: { network: ClinicianNetworkStatus }) {
  if (network.isInNetwork) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
        <Shield className="w-3 h-3" />
        In-Network
        {network.networkTier && (
          <span className="text-emerald-500 font-normal">
            ({network.networkTier})
          </span>
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
      <Shield className="w-3 h-3" />
      Out-of-Network
    </span>
  );
}

// ─── Error / Fallback State ───────────────────────────────────────────────────

function FallbackState({
  snomedConceptId,
  message,
}: {
  snomedConceptId: string;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mb-3">
        <Info className="w-4 h-4 text-slate-400" />
      </div>
      <p className="text-sm font-medium text-slate-700">
        Manual entry required
      </p>
      <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
        {message ?? 'No billing code mapping found for this procedure.'}
      </p>
      <code className="mt-2 text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
        SNOMED {snomedConceptId}
      </code>
    </div>
  );
}

// ─── Idle State ───────────────────────────────────────────────────────────────

function IdleState() {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center mb-3">
        <span className="text-sm font-bold text-slate-300" aria-hidden>$</span>
      </div>
      <p className="text-xs text-slate-400">
        Select a procedure to view billing details
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BillingWidget({
  snomedConceptId,
  country,
  insurerId,
  insurerName,
  clinicianId,
  onRouteResolved,
  className,
}: BillingWidgetProps) {
  const [state, setState] = useState<WidgetState>('idle');
  const [result, setResult] = useState<ClaimRouteResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchRoute = useCallback(async (snomedId: string) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState('loading');
    setErrorMessage(null);

    try {
      const body: Record<string, string> = {
        snomedConceptId: snomedId,
        country,
        insurerId,
      };
      if (clinicianId) body.clinicianId = clinicianId;

      const res = await fetch('/api/billing/route-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error ?? `Request failed (${res.status})`
        );
      }

      const { data } = await res.json();
      const routeData = data as ClaimRouteResult;

      // If billingCode is null, the crosswalk didn't resolve
      if (!routeData.billingCode) {
        setState('error');
        setResult(null);
        setErrorMessage(
          `No billing code mapping found for SNOMED ${snomedId} in ${country}`
        );
        return;
      }

      setResult(routeData);
      setState('success');
      onRouteResolved?.(routeData);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setState('error');
      setResult(null);
      setErrorMessage(err.message ?? 'Failed to fetch billing route');
    }
  }, [country, insurerId, clinicianId, onRouteResolved]);

  useEffect(() => {
    if (!snomedConceptId) {
      setState('idle');
      setResult(null);
      setErrorMessage(null);
      return;
    }

    fetchRoute(snomedConceptId);

    return () => {
      abortRef.current?.abort();
    };
  }, [snomedConceptId, fetchRoute]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        'rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Billing
        </h3>
        {insurerName && (
          <span className="text-[11px] text-slate-400 font-medium truncate max-w-[160px]">
            {insurerName}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-1">
        {state === 'idle' && <IdleState />}

        {state === 'loading' && <WidgetSkeleton />}

        {state === 'error' && (
          <FallbackState
            snomedConceptId={snomedConceptId ?? ''}
            message={errorMessage ?? undefined}
          />
        )}

        {state === 'success' && result && (
          <div className="divide-y divide-slate-100">
            {/* Billing Code */}
            <DataRow label="Code">
              <span className="font-mono text-xs">
                {result.billingCode}
              </span>
              <span className="ml-1.5 text-[10px] font-normal text-slate-400">
                {result.billingSystem}
              </span>
            </DataRow>

            {/* Procedure Description */}
            {result.procedureDescription && (
              <div className="py-2.5">
                <p className="text-xs text-slate-600 leading-relaxed">
                  {result.procedureDescription}
                </p>
              </div>
            )}

            {/* Rate */}
            <DataRow label="Rate">
              {result.rate ? (
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-800">
                    {formatCurrency(
                      result.rate.negotiatedRate,
                      result.rate.currency
                    )}
                  </span>
                  {result.rate.usedFallback && (
                    <span
                      className="text-[10px] text-amber-500 font-normal"
                      title="Rate from reference table, not contracted"
                    >
                      (ref)
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-xs text-slate-400">No rate data</span>
              )}
            </DataRow>

            {/* Coverage */}
            {result.rate && (
              <DataRow label="Coverage">
                {result.rate.isCovered ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" />
                    Covered
                    {result.rate.copayPercent != null && (
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({Math.round(result.rate.copayPercent * 100)}% copay)
                      </span>
                    )}
                    {result.rate.copayFlat != null && !result.rate.copayPercent && (
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({formatCurrency(result.rate.copayFlat, result.rate.currency)} copay)
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-red-600">
                    <X className="w-3 h-3" />
                    Not covered
                  </span>
                )}
              </DataRow>
            )}

            {/* Confidence */}
            <DataRow label="Confidence">
              <ConfidenceBar value={result.routingConfidence} />
            </DataRow>

            {/* Prior Auth */}
            <DataRow label="Pre-Auth">
              <PriorAuthBadge priorAuth={result.priorAuth} />
            </DataRow>

            {/* Clinician Network */}
            {result.clinicianNetwork && (
              <DataRow label="Network">
                <NetworkBadge network={result.clinicianNetwork} />
              </DataRow>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
