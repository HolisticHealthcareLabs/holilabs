'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle, TrendingUp,
  Search, Filter, ChevronRight, CheckCircle2, Clock,
  XCircle, BarChart3, X, FileText,
} from 'lucide-react';
import { DEMO_CLAIMS, getDemoBillingStats, type DemoClaim } from '@/lib/demo/dashboard-mocks';
import SpotlightTrigger from '@/components/onboarding/SpotlightTrigger';

type ClaimStatus = 'submitted' | 'approved' | 'denied' | 'pending_review' | 'resubmitted';
type BillingStandard = 'CBHPM' | 'TUSS' | 'CPT' | 'CUPS';
type CountryCode = 'BR' | 'MX' | 'CO' | 'US';

interface BillingCode {
  code: string;
  standard: BillingStandard;
  description: string;
  unitValue: number;
  currency: string;
}

interface Claim extends DemoClaim {}

const COUNTRY_LABELS: Record<CountryCode, string> = {
  BR: 'Brazil',
  MX: 'Mexico',
  CO: 'Colombia',
  US: 'United States',
};

const BILLING_STANDARD_BY_COUNTRY: Record<CountryCode, { primary: BillingStandard; secondary?: BillingStandard; label: string }> = {
  BR: { primary: 'CBHPM', secondary: 'TUSS', label: 'CBHPM / TUSS (ANS)' },
  MX: { primary: 'CUPS', label: 'CAUSES / FPGC' },
  CO: { primary: 'CUPS', label: 'CUPS (MinSalud)' },
  US: { primary: 'CPT', label: 'CPT / ICD-10-PCS' },
};

const STATUS_CONFIG: Record<ClaimStatus, { label: string; color: string; Icon: typeof CheckCircle2 }> = {
  submitted:      { label: 'Submitted',       color: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',       Icon: Clock },
  approved:       { label: 'Approved',        color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400', Icon: CheckCircle2 },
  denied:         { label: 'Denied',          color: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',           Icon: XCircle },
  pending_review: { label: 'Pending Review',  color: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',   Icon: AlertTriangle },
  resubmitted:    { label: 'Resubmitted',     color: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400', Icon: FileText },
};

const MOCK_CLAIMS: Claim[] = DEMO_CLAIMS;

type StatusFilter = 'all' | ClaimStatus;

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-US', {
    style: 'currency',
    currency,
  }).format(value);
}

// ---------------------------------------------------------------------------
// Pre-Authorization Modal
// ---------------------------------------------------------------------------

function PreAuthModal({
  patientId,
  patientName,
  onClose,
  onSubmit,
}: {
  patientId: string;
  patientName: string;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const t = useTranslations('dashboard.billing');
  const [procedure, setProcedure] = useState('');
  const [justification, setJustification] = useState('');
  const [urgency, setUrgency] = useState<'routine' | 'urgent' | 'emergent'>('routine');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    if (!procedure.trim() || !justification.trim()) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSubmitting(false);
    setSuccess(true);
    setTimeout(() => {
      onSubmit();
    }, 1500);
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-lg">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t('priorAuthRequest')}</h2>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{patientName} ({patientId})</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {success ? (
            <div className="px-6 py-12 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{t('authSubmitted')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {t('authQueued')}
              </p>
            </div>
          ) : (
            <>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{t('procedure')} *</label>
                  <input
                    type="text"
                    value={procedure}
                    onChange={(e) => setProcedure(e.target.value)}
                    placeholder="e.g. Contrast-enhanced cardiac MRI"
                    autoFocus
                    className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{t('clinicalJustification')} *</label>
                  <textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder={t('clinicalRationale')}
                    rows={3}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{t('urgency')}</label>
                  <div className="flex gap-2">
                    {(['routine', 'urgent', 'emergent'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => setUrgency(level)}
                        className={`
                          flex-1 py-2 rounded-lg text-xs font-semibold transition-all border
                          ${urgency === level
                            ? level === 'emergent'
                              ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30'
                              : level === 'urgent'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30'
                                : 'bg-gray-800 text-white border-gray-800 dark:bg-gray-200 dark:text-gray-900 dark:border-gray-200'
                            : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }
                        `}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <FileText className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed">
                      Cortex will auto-attach the relevant SOAP note, ICD-10 codes, and supporting lab results from this patient&apos;s record to strengthen the authorization request.
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!procedure.trim() || !justification.trim() || submitting}
                  className="
                    inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg
                    bg-violet-600 text-white hover:bg-violet-500
                    disabled:opacity-40 disabled:cursor-not-allowed
                    transition-colors
                  "
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('submitting')}
                    </>
                  ) : (
                    <>
                      <ChevronRight className="w-3.5 h-3.5" />
                      {t('submitAuthorization')}
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Deep-link reader (isolated inside Suspense to avoid blocking page render)
// ---------------------------------------------------------------------------

function DeepLinkReader({ onDeepLink }: { onDeepLink: (patientId: string, patientName: string) => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams) return;

    const action = searchParams.get('action');
    if (action === 'prior-auth') {
      onDeepLink(
        searchParams.get('patientId') || '',
        searchParams.get('patientName') || 'Unknown Patient'
      );
    }
  }, [searchParams, onDeepLink]);

  return null;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ClaimsIntelligencePage() {
  const t = useTranslations('dashboard.billing');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [metricFilter, setMetricFilter] = useState<'all' | 'approved' | 'denied' | 'cdi'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('BR');

  const [priorAuthOpen, setPriorAuthOpen] = useState(false);
  const [priorAuthPatientId, setPriorAuthPatientId] = useState('');
  const [priorAuthPatientName, setPriorAuthPatientName] = useState('');

  const handleDeepLink = useMemo(() => {
    return (patientId: string, patientName: string) => {
      setPriorAuthPatientId(patientId);
      setPriorAuthPatientName(patientName);
      setPriorAuthOpen(true);
    };
  }, []);

  const billingInfo = BILLING_STANDARD_BY_COUNTRY[selectedCountry];

  const filteredClaims = useMemo(() => {
    return MOCK_CLAIMS.filter((c) => {
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesMetric =
        metricFilter === 'all' ||
        (metricFilter === 'approved' && c.status === 'approved') ||
        (metricFilter === 'denied' && c.status === 'denied') ||
        (metricFilter === 'cdi' && c.cdiFlags > 0);
      const matchesSearch =
        !searchQuery.trim() ||
        c.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.payer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCountry = c.country === selectedCountry;
      return matchesStatus && matchesMetric && matchesSearch && matchesCountry;
    });
  }, [statusFilter, metricFilter, searchQuery, selectedCountry]);

  const stats = useMemo(() => {
    return getDemoBillingStats(selectedCountry);
  }, [selectedCountry]);

  const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: t('all') },
    { value: 'pending_review', label: t('pending') },
    { value: 'submitted', label: t('submitted') },
    { value: 'approved', label: t('approved') },
    { value: 'denied', label: t('denied') },
    { value: 'resubmitted', label: t('resubmitted') },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <Suspense fallback={null}>
        <DeepLinkReader onDeepLink={handleDeepLink} />
      </Suspense>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="header-entrance">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            {t('claimsIntelligence')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {t('claimsSubtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SpotlightTrigger
            steps={[
              { target: '#billing-kpis', title: 'Revenue KPIs', content: 'Total billed, approval rate, denials, and CDI alerts at a glance.' },
              { target: '#claims-table', title: 'Claims Pipeline', content: 'Filter by status, country, and search. Click any claim for details.' },
              { target: '#prior-auth-btn', title: 'Prior Authorization', content: 'Submit pre-auth requests directly from the dashboard.' },
            ]}
          />
          <button
            id="prior-auth-btn"
            onClick={() => { setPriorAuthPatientId(''); setPriorAuthPatientName(''); setPriorAuthOpen(true); }}
            className="
              inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
              bg-violet-600 text-white hover:bg-violet-500
              transition-colors
            "
          >
            <ChevronRight className="w-3.5 h-3.5" />
            {t('newAuthorization')}
          </button>
        </div>
      </div>

      {/* Billing Standard Banner */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-4 py-3 flex items-center gap-2.5">
        <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
          {t('billingStandard')}: {billingInfo.label}
        </span>
      </div>

      {/* KPI Row */}
      <div id="billing-kpis" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: BarChart3, label: t('totalBilled'), value: formatCurrency(stats.totalBilled, stats.currency), accent: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200/60 dark:border-blue-500/20', metric: 'all' as const },
          { icon: TrendingUp, label: t('approvalRate'), value: `${stats.approvalRate}%`, accent: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200/60 dark:border-emerald-500/20', metric: 'approved' as const },
          { icon: XCircle, label: t('denied'), value: String(stats.deniedCount), accent: 'text-red-600 dark:text-red-400', border: 'border-red-200/60 dark:border-red-500/20', metric: 'denied' as const },
          { icon: AlertTriangle, label: t('cdiAlerts'), value: String(stats.cdiAlerts), accent: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200/60 dark:border-amber-500/20', metric: 'cdi' as const },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <button
              key={kpi.label}
              onClick={() => setMetricFilter(kpi.metric)}
              className={`rounded-2xl border ${kpi.border} bg-white dark:bg-gray-900 px-2 py-3 sm:p-4 flex flex-col items-center justify-center text-center overflow-hidden min-w-0 card-entrance card-entrance-${i + 1} hover:scale-[1.02] hover:shadow-md transition-all duration-200 ${metricFilter === kpi.metric ? 'ring-2 ring-violet-500/50' : ''}`}
            >
              <div className="flex items-center gap-1 sm:gap-1.5 mb-1.5 sm:mb-2 max-w-full">
                <Icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${kpi.accent}`} />
                <span className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 truncate leading-none">{kpi.label}</span>
              </div>
              <p className={`text-base sm:text-xl md:text-2xl font-bold tabular-nums leading-tight w-full truncate ${kpi.accent}`}>
                {kpi.value}
              </p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('searchClaims')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="
              w-full pl-9 pr-3 py-2 text-sm rounded-xl
              bg-white dark:bg-gray-900
              border border-gray-200 dark:border-gray-700
              text-gray-700 dark:text-gray-300
              placeholder-gray-400 dark:placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-gray-400
            "
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          {STATUS_FILTERS.map((f) => {
            const isActive = statusFilter === f.value;
            const count = f.value === 'all'
              ? MOCK_CLAIMS.filter((c) => c.country === selectedCountry).length
              : MOCK_CLAIMS.filter((c) => c.country === selectedCountry && c.status === f.value).length;
            return (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                  ${isActive
                    ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }
                `}
              >
                {f.label}
                <span className={`text-[10px] font-bold tabular-nums ${isActive ? 'text-white/70 dark:text-gray-900/60' : 'text-gray-400 dark:text-gray-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Claims Table */}
      <div id="claims-table" className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {t('claimsLedger')}
          </h2>
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
            {filteredClaims.length} claims
          </span>
        </div>

        {filteredClaims.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('noClaimsMatch')}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{t('adjustFilters')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredClaims.map((claim) => {
              const statusCfg = STATUS_CONFIG[claim.status];
              const StatusIcon = statusCfg.Icon;
              return (
                <div
                  key={claim.id}
                  className="px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-800 dark:text-white">
                          {claim.patientName}
                        </span>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">
                          {claim.id}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusCfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusCfg.label}
                        </span>
                        {claim.cdiFlags > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                            <AlertTriangle className="w-3 h-3" />
                            {claim.cdiFlags} CDI {claim.cdiFlags === 1 ? 'flag' : 'flags'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-2">
                        <span>{claim.encounterDate}</span>
                        <span className="w-0.5 h-0.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                        <span>{claim.provider}</span>
                        <span className="w-0.5 h-0.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                        <span>{claim.payer}</span>
                      </div>

                      {/* Billing codes */}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {claim.billingCodes.map((bc, idx) => (
                          <span
                            key={idx}
                            className="
                              inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px]
                              bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400
                              border border-gray-200 dark:border-gray-700
                            "
                          >
                            <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{bc.code}</span>
                            <span className="text-gray-400 dark:text-gray-500">({bc.standard})</span>
                            <span className="hidden sm:inline truncate max-w-[180px]">{bc.description}</span>
                          </span>
                        ))}
                      </div>

                      {claim.denialReason && (
                        <div className="mt-1.5 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20">
                          <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
                            <span className="font-semibold">{t('denialReason')}</span> {claim.denialReason}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <p className="text-lg font-bold tabular-nums text-gray-800 dark:text-white">
                        {formatCurrency(claim.totalValue, claim.currency)}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                        {claim.billingCodes.length} {claim.billingCodes.length === 1 ? 'code' : 'codes'}
                      </p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pre-Authorization Modal */}
      {priorAuthOpen && (
        <PreAuthModal
          patientId={priorAuthPatientId}
          patientName={priorAuthPatientName || 'Select a patient'}
          onClose={() => setPriorAuthOpen(false)}
          onSubmit={() => setPriorAuthOpen(false)}
        />
      )}
    </div>
  );
}
