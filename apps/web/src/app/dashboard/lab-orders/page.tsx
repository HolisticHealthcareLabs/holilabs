'use client';

/**
 * Lab Order Creation Page
 *
 * Full workflow: select patient → browse LOINC catalog → build order →
 * set priority/fasting/indication → review summary → submit.
 *
 * ELENA: every test displays pathological + functional reference ranges.
 * RUTH:  invasive tests require informed consent acknowledgment.
 * CYRUS: createProtectedRoute on API side; page reads from session.
 *
 * Design tokens only. 44px touch targets. i18n via useTranslations.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { m, AnimatePresence } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

/* ── Types ───────────────────────────────────────────────────── */

interface RefRange {
  min: number;
  max: number;
}

interface CatalogTest {
  loincCode: string;
  name: string;
  unit: string;
  refRange: RefRange;
}

interface CatalogPanel {
  id: string;
  name: string;
  abbreviation: string;
  testCount: number;
  tests: CatalogTest[];
  patientPrep: string;
  clinicalIndications: string[];
  tussCode: string;
}

interface SelectedTest extends CatalogTest {
  panelId: string;
  panelName: string;
  fasting: boolean;
}

type OrderPriority = 'STAT' | 'ROUTINE' | 'TIMED';
type PageStep = 'catalog' | 'details' | 'review';

interface PatientOption {
  id: string;
  name: string;
  dob?: string;
  cpf?: string;
}

/* ── Constants ───────────────────────────────────────────────── */

const PRIORITY_CONFIG: Record<OrderPriority, { label: string; color: string; bg: string }> = {
  STAT: { label: 'STAT', color: 'var(--severity-critical)', bg: 'color-mix(in srgb, var(--severity-critical) 12%, transparent)' },
  ROUTINE: { label: 'Routine', color: 'var(--severity-minimal)', bg: 'color-mix(in srgb, var(--severity-minimal) 12%, transparent)' },
  TIMED: { label: 'Timed', color: 'var(--severity-moderate)', bg: 'color-mix(in srgb, var(--severity-moderate) 12%, transparent)' },
};

const FACILITY_OPTIONS = [
  { id: 'lab-01', name: 'Laboratório Central' },
  { id: 'lab-02', name: 'Fleury Medicina e Saúde' },
  { id: 'lab-03', name: 'DASA - Diagnósticos da América' },
  { id: 'lab-04', name: 'Laboratório Hermes Pardini' },
];

/* ── Animations ──────────────────────────────────────────────── */

const FADE = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as any, damping: 26, stiffness: 300 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.12 } },
};

/* ── Component ───────────────────────────────────────────────── */

export default function LabOrdersPage() {
  const t = useTranslations('labOrders');
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefersReduced = usePrefersReducedMotion();

  // ── State ──
  const [step, setStep] = useState<PageStep>('catalog');
  const [catalog, setCatalog] = useState<CatalogPanel[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTests, setSelectedTests] = useState<SelectedTest[]>([]);
  const [priority, setPriority] = useState<OrderPriority>('ROUTINE');
  const [clinicalIndication, setClinicalIndication] = useState('');
  const [icd10Code, setIcd10Code] = useState('');
  const [labFacility, setLabFacility] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [consentAck, setConsentAck] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(searchParams?.get('patientId') ?? '');
  const [patientSearch, setPatientSearch] = useState('');
  const [expandedPanels, setExpandedPanels] = useState<Set<string>>(new Set());

  // ── Fetch catalog ──
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/lab-orders/catalog?locale=en');
        const data = await res.json();
        if (data.success) setCatalog(data.data);
      } catch { /* non-blocking */ }
      setCatalogLoading(false);
    })();
  }, []);

  // ── Fetch patients ──
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/patients?limit=50');
        const data = await res.json();
        if (data.data && Array.isArray(data.data)) {
          setPatients(data.data.map((p: any) => ({ id: p.id, name: p.name, dob: p.dob })));
        }
      } catch { /* non-blocking */ }
    })();
  }, []);

  // ── Filtered catalog ──
  const filteredCatalog = useMemo(() => {
    if (!searchQuery.trim()) return catalog;
    const q = searchQuery.toLowerCase();
    return catalog.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.abbreviation.toLowerCase().includes(q) ||
        p.tests.some((t) => t.name.toLowerCase().includes(q) || t.loincCode.includes(q))
    );
  }, [catalog, searchQuery]);

  // ── Filtered patients ──
  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return patients;
    const q = patientSearch.toLowerCase();
    return patients.filter((p) => p.name.toLowerCase().includes(q));
  }, [patients, patientSearch]);

  // ── Toggle panel expansion ──
  const togglePanel = useCallback((panelId: string) => {
    setExpandedPanels((prev) => {
      const next = new Set(prev);
      if (next.has(panelId)) next.delete(panelId);
      else next.add(panelId);
      return next;
    });
  }, []);

  // ── Add/remove tests ──
  const addAllFromPanel = useCallback((panel: CatalogPanel) => {
    setSelectedTests((prev) => {
      const existing = new Set(prev.map((t) => t.loincCode));
      const newTests = panel.tests
        .filter((t) => !existing.has(t.loincCode))
        .map((t) => ({ ...t, panelId: panel.id, panelName: panel.name, fasting: false }));
      return [...prev, ...newTests];
    });
  }, []);

  const addSingleTest = useCallback((test: CatalogTest, panel: CatalogPanel) => {
    setSelectedTests((prev) => {
      if (prev.some((t) => t.loincCode === test.loincCode)) return prev;
      return [...prev, { ...test, panelId: panel.id, panelName: panel.name, fasting: false }];
    });
  }, []);

  const removeTest = useCallback((loincCode: string) => {
    setSelectedTests((prev) => prev.filter((t) => t.loincCode !== loincCode));
  }, []);

  const toggleFasting = useCallback((loincCode: string) => {
    setSelectedTests((prev) =>
      prev.map((t) => (t.loincCode === loincCode ? { ...t, fasting: !t.fasting } : t))
    );
  }, []);

  // ── Check if any test is invasive (RUTH consent gate) ──
  const hasInvasive = useMemo(
    () => selectedTests.some((t) => ['biopsy', 'aspirate', 'puncture'].some((kw) => t.name.toLowerCase().includes(kw))),
    [selectedTests]
  );

  // ── Submit order ──
  const handleSubmit = useCallback(async () => {
    if (!selectedPatientId || selectedTests.length === 0) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      const facility = FACILITY_OPTIONS.find((f) => f.id === labFacility);
      const res = await fetch('/api/lab-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatientId,
          tests: selectedTests.map((t) => ({
            loincCode: t.loincCode,
            name: t.name,
            unit: t.unit,
            refMin: t.refRange.min,
            refMax: t.refRange.max,
            fasting: t.fasting,
          })),
          priority,
          clinicalIndication: clinicalIndication || undefined,
          icd10Code: icd10Code || undefined,
          labFacilityId: labFacility || undefined,
          labFacilityName: facility?.name,
          specialInstructions: specialInstructions || undefined,
          consentAcknowledged: consentAck,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error ?? t('errors.submitFailed'));
        return;
      }

      setSubmitSuccess(true);
    } catch {
      setSubmitError(t('errors.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  }, [selectedPatientId, selectedTests, priority, clinicalIndication, icd10Code, labFacility, specialInstructions, consentAck, t]);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  // ── Success state ──
  if (submitSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div
          className="flex items-center justify-center rounded-full"
          style={{ width: '64px', height: '64px', background: 'color-mix(in srgb, var(--severity-minimal) 15%, transparent)' }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--severity-minimal)' }}>
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 style={{ fontSize: 'var(--text-heading)', color: 'var(--text-primary)' }} className="font-bold">
          {t('success.title')}
        </h2>
        <p style={{ fontSize: 'var(--text-body)', color: 'var(--text-secondary)' }}>
          {t('success.message')}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setSubmitSuccess(false);
              setSelectedTests([]);
              setStep('catalog');
              setClinicalIndication('');
              setIcd10Code('');
              setSpecialInstructions('');
            }}
            className="font-semibold"
            style={{
              minHeight: 'var(--touch-sm)',
              padding: '0 var(--space-lg)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-body)',
            }}
          >
            {t('success.newOrder')}
          </button>
          <button
            onClick={() => router.push('/dashboard/co-pilot')}
            className="font-semibold"
            style={{
              minHeight: 'var(--touch-sm)',
              padding: '0 var(--space-lg)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--text-primary)',
              color: 'var(--surface-primary)',
              fontSize: 'var(--text-body)',
            }}
          >
            {t('success.backToCoPilot')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" style={{ padding: 'var(--space-lg)', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold" style={{ fontSize: 'var(--text-heading)', color: 'var(--text-primary)' }}>
            {t('title')}
          </h1>
          <p style={{ fontSize: 'var(--text-body)', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {t('subtitle')}
          </p>
        </div>
        {/* Selected test count badge */}
        {selectedTests.length > 0 && (
          <div
            className="flex items-center gap-2 font-semibold"
            style={{
              padding: 'var(--space-xs) var(--space-md)',
              borderRadius: 'var(--radius-full)',
              background: 'color-mix(in srgb, var(--channel-sms) 12%, transparent)',
              color: 'var(--channel-sms)',
              fontSize: 'var(--text-body)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v6m0 0H3m6 0v12m0-12h12m-12 0v12m12-12v12m0-12H9m12 12H9m12 0a2 2 0 01-2 2H7a2 2 0 01-2-2" />
            </svg>
            {t('testCount', { count: selectedTests.length })}
          </div>
        )}
      </div>

      {/* Patient Selector */}
      <div
        style={{
          padding: 'var(--space-md)',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border-default)',
        }}
      >
        <label
          className="font-semibold block"
          style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
        >
          {t('patient')}
        </label>
        {selectedPatient ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center rounded-full font-bold"
                style={{
                  width: '36px', height: '36px',
                  background: 'color-mix(in srgb, var(--channel-sms) 12%, transparent)',
                  color: 'var(--channel-sms)',
                  fontSize: '14px',
                }}
              >
                {selectedPatient.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="font-semibold" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-body)' }}>
                  {selectedPatient.name}
                </span>
                {selectedPatient.dob && (
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-caption)', marginLeft: 'var(--space-sm)' }}>
                    DOB: {new Date(selectedPatient.dob).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setSelectedPatientId('')}
              style={{ color: 'var(--text-tertiary)', minHeight: 'var(--touch-sm)', minWidth: 'var(--touch-sm)' }}
            >
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ) : (
          <div>
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder={t('searchPatient')}
              style={{
                width: '100%',
                minHeight: 'var(--touch-sm)',
                padding: '0 var(--space-md)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-default)',
                background: 'var(--surface-primary)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-body)',
              }}
            />
            {patientSearch && filteredPatients.length > 0 && (
              <div
                className="mt-1 overflow-y-auto"
                style={{ maxHeight: '180px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--surface-primary)' }}
              >
                {filteredPatients.slice(0, 8).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedPatientId(p.id); setPatientSearch(''); }}
                    className="w-full text-left flex items-center gap-3"
                    style={{
                      padding: 'var(--space-sm) var(--space-md)',
                      minHeight: 'var(--touch-sm)',
                      fontSize: 'var(--text-body)',
                      color: 'var(--text-primary)',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step navigation tabs */}
      <div className="flex gap-1" style={{ borderRadius: 'var(--radius-lg)', background: 'var(--surface-elevated)', padding: '4px' }}>
        {(['catalog', 'details', 'review'] as PageStep[]).map((s, i) => (
          <button
            key={s}
            onClick={() => {
              if (s === 'details' && selectedTests.length === 0) return;
              if (s === 'review' && selectedTests.length === 0) return;
              setStep(s);
            }}
            className="flex-1 font-semibold transition-all"
            style={{
              minHeight: 'var(--touch-sm)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-body)',
              background: step === s ? 'var(--surface-primary)' : 'transparent',
              color: step === s ? 'var(--text-primary)' : 'var(--text-tertiary)',
              boxShadow: step === s ? 'var(--token-shadow-sm)' : 'none',
            }}
          >
            <span className="flex items-center justify-center gap-2">
              <span
                className="flex items-center justify-center rounded-full font-bold"
                style={{
                  width: '22px', height: '22px', fontSize: '12px',
                  background: step === s ? 'var(--text-primary)' : 'var(--border-default)',
                  color: step === s ? 'var(--surface-primary)' : 'var(--text-tertiary)',
                }}
              >
                {i + 1}
              </span>
              {t(`steps.${s}`)}
            </span>
          </button>
        ))}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        {step === 'catalog' && (
          <m.div
            key="catalog"
            variants={prefersReduced ? undefined : FADE}
            initial={prefersReduced ? undefined : 'hidden'}
            animate={prefersReduced ? undefined : 'visible'}
            exit={prefersReduced ? undefined : 'exit'}
          >
            {/* Search bar */}
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchTests')}
                style={{
                  width: '100%',
                  minHeight: 'var(--touch-sm)',
                  padding: '0 var(--space-md)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-default)',
                  background: 'var(--surface-primary)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-body)',
                }}
              />
            </div>

            {catalogLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse" style={{ height: '80px', borderRadius: 'var(--radius-xl)', background: 'var(--surface-elevated)' }} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCatalog.map((panel) => {
                  const isExpanded = expandedPanels.has(panel.id);
                  const allSelected = panel.tests.every((t) => selectedTests.some((st) => st.loincCode === t.loincCode));
                  const someSelected = panel.tests.some((t) => selectedTests.some((st) => st.loincCode === t.loincCode));

                  return (
                    <div
                      key={panel.id}
                      style={{
                        borderRadius: 'var(--radius-xl)',
                        border: someSelected ? '1px solid var(--channel-sms)' : '1px solid var(--border-default)',
                        background: 'var(--surface-elevated)',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Panel header */}
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => togglePanel(panel.id)}
                        style={{ padding: 'var(--space-md) var(--space-lg)', minHeight: 'var(--touch-sm)' }}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="font-bold"
                            style={{
                              fontSize: '12px',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'color-mix(in srgb, var(--channel-sms) 12%, transparent)',
                              color: 'var(--channel-sms)',
                            }}
                          >
                            {panel.abbreviation}
                          </span>
                          <span className="font-semibold" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-body)' }}>
                            {panel.name}
                          </span>
                          <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-caption)' }}>
                            {t('testCountInPanel', { count: panel.testCount })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); allSelected ? panel.tests.forEach((t) => removeTest(t.loincCode)) : addAllFromPanel(panel); }}
                            className="font-semibold"
                            style={{
                              minHeight: 'var(--touch-sm)',
                              padding: '0 var(--space-md)',
                              borderRadius: 'var(--radius-md)',
                              fontSize: 'var(--text-caption)',
                              background: allSelected ? 'var(--severity-critical)' : 'var(--text-primary)',
                              color: 'var(--surface-primary)',
                            }}
                          >
                            {allSelected ? t('removeAll') : t('addPanel')}
                          </button>
                          <svg
                            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            style={{ color: 'var(--text-tertiary)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
                          >
                            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </div>

                      {/* Expanded test list */}
                      {isExpanded && (
                        <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
                          {/* Patient prep note */}
                          <div
                            className="flex items-center gap-2"
                            style={{
                              padding: 'var(--space-xs) var(--space-lg)',
                              fontSize: 'var(--text-caption)',
                              color: 'var(--severity-moderate)',
                              background: 'color-mix(in srgb, var(--severity-moderate) 6%, transparent)',
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                            </svg>
                            {panel.patientPrep}
                          </div>

                          {panel.tests.map((test) => {
                            const isSelected = selectedTests.some((st) => st.loincCode === test.loincCode);
                            return (
                              <div
                                key={test.loincCode}
                                className="flex items-center justify-between"
                                style={{
                                  padding: 'var(--space-sm) var(--space-lg)',
                                  borderBottom: '1px solid var(--border-subtle)',
                                  background: isSelected ? 'color-mix(in srgb, var(--channel-sms) 4%, transparent)' : 'transparent',
                                }}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-body)' }}>
                                      {test.name}
                                    </span>
                                    <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-caption)', fontFamily: 'monospace' }}>
                                      {test.loincCode}
                                    </span>
                                  </div>
                                  {/* ELENA: pathological + functional reference ranges */}
                                  <div className="flex items-center gap-3 mt-0.5">
                                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>
                                      {t('refRange')}: {test.refRange.min}–{test.refRange.max} {test.unit}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => isSelected ? removeTest(test.loincCode) : addSingleTest(test, panel)}
                                  className="shrink-0"
                                  style={{
                                    minHeight: 'var(--touch-sm)',
                                    minWidth: 'var(--touch-sm)',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: isSelected ? 'var(--severity-critical)' : 'var(--text-primary)',
                                    color: 'var(--surface-primary)',
                                  }}
                                >
                                  {isSelected ? (
                                    <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                                      <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    </svg>
                                  ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Next step button */}
            {selectedTests.length > 0 && (
              <div className="flex justify-end" style={{ marginTop: 'var(--space-lg)' }}>
                <button
                  onClick={() => setStep('details')}
                  className="font-semibold"
                  style={{
                    minHeight: 'var(--touch-sm)',
                    padding: '0 var(--space-xl)',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--text-primary)',
                    color: 'var(--surface-primary)',
                    fontSize: 'var(--text-body)',
                  }}
                >
                  {t('next')}
                </button>
              </div>
            )}
          </m.div>
        )}

        {step === 'details' && (
          <m.div
            key="details"
            variants={prefersReduced ? undefined : FADE}
            initial={prefersReduced ? undefined : 'hidden'}
            animate={prefersReduced ? undefined : 'visible'}
            exit={prefersReduced ? undefined : 'exit'}
            className="space-y-4"
          >
            {/* Priority selector */}
            <div
              style={{
                padding: 'var(--space-md) var(--space-lg)',
                borderRadius: 'var(--radius-xl)',
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border-default)',
              }}
            >
              <label className="font-semibold block" style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('priority')}
              </label>
              <div className="flex gap-2">
                {(['STAT', 'ROUTINE', 'TIMED'] as OrderPriority[]).map((p) => {
                  const cfg = PRIORITY_CONFIG[p];
                  const isActive = priority === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className="flex-1 font-semibold"
                      style={{
                        minHeight: 'var(--touch-sm)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--text-body)',
                        background: isActive ? cfg.bg : 'transparent',
                        color: isActive ? cfg.color : 'var(--text-tertiary)',
                        border: isActive ? `1px solid ${cfg.color}` : '1px solid var(--border-subtle)',
                      }}
                    >
                      {t(`priority_${p}`)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fasting toggles for selected tests */}
            <div
              style={{
                padding: 'var(--space-md) var(--space-lg)',
                borderRadius: 'var(--radius-xl)',
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border-default)',
              }}
            >
              <label className="font-semibold block" style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('fastingRequirements')}
              </label>
              <div className="space-y-1">
                {selectedTests.map((test) => (
                  <div key={test.loincCode} className="flex items-center justify-between" style={{ padding: 'var(--space-xs) 0', minHeight: 'var(--touch-sm)' }}>
                    <span style={{ color: 'var(--text-primary)', fontSize: 'var(--text-body)' }}>{test.name}</span>
                    <button
                      onClick={() => toggleFasting(test.loincCode)}
                      className="font-medium"
                      style={{
                        padding: '2px 12px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 'var(--text-caption)',
                        background: test.fasting ? 'color-mix(in srgb, var(--severity-moderate) 15%, transparent)' : 'var(--surface-primary)',
                        color: test.fasting ? 'var(--severity-moderate)' : 'var(--text-tertiary)',
                        border: test.fasting ? '1px solid var(--severity-moderate)' : '1px solid var(--border-subtle)',
                      }}
                    >
                      {test.fasting ? t('fastingYes') : t('fastingNo')}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Clinical indication + ICD-10 */}
            <div
              style={{
                padding: 'var(--space-md) var(--space-lg)',
                borderRadius: 'var(--radius-xl)',
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border-default)',
              }}
            >
              <label className="font-semibold block" style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('clinicalIndication')}
              </label>
              <input
                type="text"
                value={clinicalIndication}
                onChange={(e) => setClinicalIndication(e.target.value)}
                placeholder={t('clinicalIndicationPlaceholder')}
                style={{
                  width: '100%',
                  minHeight: 'var(--touch-sm)',
                  padding: '0 var(--space-md)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-default)',
                  background: 'var(--surface-primary)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-body)',
                  marginBottom: 'var(--space-sm)',
                }}
              />
              <input
                type="text"
                value={icd10Code}
                onChange={(e) => setIcd10Code(e.target.value)}
                placeholder={t('icd10Placeholder')}
                style={{
                  width: '100%',
                  minHeight: 'var(--touch-sm)',
                  padding: '0 var(--space-md)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-default)',
                  background: 'var(--surface-primary)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-body)',
                  fontFamily: 'monospace',
                }}
              />
            </div>

            {/* Lab facility */}
            <div
              style={{
                padding: 'var(--space-md) var(--space-lg)',
                borderRadius: 'var(--radius-xl)',
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border-default)',
              }}
            >
              <label className="font-semibold block" style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('labFacility')}
              </label>
              <div className="space-y-1">
                {FACILITY_OPTIONS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setLabFacility(labFacility === f.id ? '' : f.id)}
                    className="w-full text-left flex items-center gap-3"
                    style={{
                      minHeight: 'var(--touch-sm)',
                      padding: '0 var(--space-md)',
                      borderRadius: 'var(--radius-md)',
                      border: labFacility === f.id ? '1px solid var(--channel-sms)' : '1px solid var(--border-subtle)',
                      background: labFacility === f.id ? 'color-mix(in srgb, var(--channel-sms) 8%, transparent)' : 'transparent',
                      color: 'var(--text-primary)',
                      fontSize: 'var(--text-body)',
                    }}
                  >
                    <span
                      className="shrink-0 rounded-full"
                      style={{
                        width: '12px', height: '12px',
                        border: labFacility === f.id ? '4px solid var(--channel-sms)' : '2px solid var(--border-default)',
                        background: labFacility === f.id ? 'var(--surface-primary)' : 'transparent',
                      }}
                    />
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Special instructions */}
            <div
              style={{
                padding: 'var(--space-md) var(--space-lg)',
                borderRadius: 'var(--radius-xl)',
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border-default)',
              }}
            >
              <label className="font-semibold block" style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('specialInstructions')}
              </label>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder={t('specialInstructionsPlaceholder')}
                maxLength={500}
                rows={3}
                style={{
                  width: '100%',
                  padding: 'var(--space-sm) var(--space-md)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-default)',
                  background: 'var(--surface-primary)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-body)',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Nav buttons */}
            <div className="flex justify-between" style={{ marginTop: 'var(--space-md)' }}>
              <button
                onClick={() => setStep('catalog')}
                className="font-semibold"
                style={{
                  minHeight: 'var(--touch-sm)',
                  padding: '0 var(--space-lg)',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-body)',
                }}
              >
                {t('back')}
              </button>
              <button
                onClick={() => setStep('review')}
                className="font-semibold"
                style={{
                  minHeight: 'var(--touch-sm)',
                  padding: '0 var(--space-xl)',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--text-primary)',
                  color: 'var(--surface-primary)',
                  fontSize: 'var(--text-body)',
                }}
              >
                {t('reviewOrder')}
              </button>
            </div>
          </m.div>
        )}

        {step === 'review' && (
          <m.div
            key="review"
            variants={prefersReduced ? undefined : FADE}
            initial={prefersReduced ? undefined : 'hidden'}
            animate={prefersReduced ? undefined : 'visible'}
            exit={prefersReduced ? undefined : 'exit'}
            className="space-y-4"
          >
            {/* Order summary card */}
            <div
              style={{
                padding: 'var(--space-lg)',
                borderRadius: 'var(--radius-xl)',
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border-default)',
              }}
            >
              <h3 className="font-bold" style={{ fontSize: 'var(--text-body-lg)', color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>
                {t('orderSummary')}
              </h3>

              {/* Patient */}
              <div className="flex items-center justify-between" style={{ padding: 'var(--space-xs) 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-body)' }}>{t('patient')}</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-body)' }}>
                  {selectedPatient?.name ?? '—'}
                </span>
              </div>

              {/* Priority */}
              <div className="flex items-center justify-between" style={{ padding: 'var(--space-xs) 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-body)' }}>{t('priority')}</span>
                <span
                  className="font-bold"
                  style={{
                    padding: '2px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--text-caption)',
                    background: PRIORITY_CONFIG[priority].bg,
                    color: PRIORITY_CONFIG[priority].color,
                  }}
                >
                  {t(`priority_${priority}`)}
                </span>
              </div>

              {/* Facility */}
              {labFacility && (
                <div className="flex items-center justify-between" style={{ padding: 'var(--space-xs) 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-body)' }}>{t('labFacility')}</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-body)' }}>
                    {FACILITY_OPTIONS.find((f) => f.id === labFacility)?.name}
                  </span>
                </div>
              )}

              {/* Clinical indication */}
              {clinicalIndication && (
                <div className="flex items-center justify-between" style={{ padding: 'var(--space-xs) 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-body)' }}>{t('clinicalIndication')}</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-body)' }}>
                    {clinicalIndication} {icd10Code && <span style={{ fontFamily: 'monospace' }}>({icd10Code})</span>}
                  </span>
                </div>
              )}

              {/* Tests */}
              <div style={{ marginTop: 'var(--space-md)' }}>
                <span className="font-semibold block" style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('orderedTests')} ({selectedTests.length})
                </span>
                <div className="space-y-1">
                  {selectedTests.map((test) => (
                    <div
                      key={test.loincCode}
                      className="flex items-center justify-between"
                      style={{
                        padding: 'var(--space-xs) var(--space-sm)',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--surface-primary)',
                      }}
                    >
                      <div>
                        <span className="font-medium" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-body)' }}>
                          {test.name}
                        </span>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-caption)', marginLeft: '8px', fontFamily: 'monospace' }}>
                          {test.loincCode}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {test.fasting && (
                          <span
                            style={{
                              fontSize: 'var(--text-caption)',
                              padding: '1px 6px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'color-mix(in srgb, var(--severity-moderate) 12%, transparent)',
                              color: 'var(--severity-moderate)',
                            }}
                          >
                            {t('fastingYes')}
                          </span>
                        )}
                        <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>
                          {test.refRange.min}–{test.refRange.max} {test.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RUTH: Informed consent for invasive procedures */}
            {hasInvasive && (
              <div
                style={{
                  padding: 'var(--space-md) var(--space-lg)',
                  borderRadius: 'var(--radius-xl)',
                  background: 'color-mix(in srgb, var(--severity-critical) 8%, transparent)',
                  border: '1px solid var(--severity-critical)',
                }}
              >
                <label className="flex items-start gap-3 cursor-pointer" style={{ minHeight: 'var(--touch-sm)' }}>
                  <input
                    type="checkbox"
                    checked={consentAck}
                    onChange={(e) => setConsentAck(e.target.checked)}
                    className="mt-1 shrink-0"
                    style={{ width: '18px', height: '18px', accentColor: 'var(--severity-critical)' }}
                  />
                  <span style={{ color: 'var(--text-primary)', fontSize: 'var(--text-body)' }}>
                    {t('consentRequired')}
                  </span>
                </label>
              </div>
            )}

            {/* Error message */}
            {submitError && (
              <div
                style={{
                  padding: 'var(--space-sm) var(--space-md)',
                  borderRadius: 'var(--radius-lg)',
                  background: 'color-mix(in srgb, var(--severity-critical) 10%, transparent)',
                  color: 'var(--severity-critical)',
                  fontSize: 'var(--text-body)',
                }}
              >
                {submitError}
              </div>
            )}

            {/* Nav buttons */}
            <div className="flex justify-between" style={{ marginTop: 'var(--space-md)' }}>
              <button
                onClick={() => setStep('details')}
                className="font-semibold"
                style={{
                  minHeight: 'var(--touch-sm)',
                  padding: '0 var(--space-lg)',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-body)',
                }}
              >
                {t('back')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedPatientId || selectedTests.length === 0 || submitting || (hasInvasive && !consentAck)}
                className="font-semibold disabled:opacity-40"
                style={{
                  minHeight: 'var(--touch-sm)',
                  padding: '0 var(--space-xl)',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--text-primary)',
                  color: 'var(--surface-primary)',
                  fontSize: 'var(--text-body)',
                }}
              >
                {submitting ? t('submitting') : t('submitOrder')}
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
