'use client';

/**
 * [ACTIVATING: PAUL — Clinician Prescriptions Page]
 *
 * Clinician-facing prescription management: list, create, sign.
 * Design tokens only. 44px touch targets. i18n via useTranslations.
 * RBAC enforced server-side by /api/prescriptions (PHYSICIAN, CLINICIAN, ADMIN).
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import {
  Plus,
  X,
  Search,
  AlertCircle,
  Clock,
  CheckCircle2,
  Mail,
  Shield,
  Loader2,
  FileText,
  Activity,
} from 'lucide-react';
const FileKey = FileText;
const Pill = Activity;
const Send = Mail;
const Ban = Shield;

export const dynamic = 'force-dynamic';

type PrescriptionStatus = 'PENDING' | 'SIGNED' | 'SENT' | 'FILLED' | 'CANCELLED';
type FilterTab = 'all' | 'active' | 'history';
type PageView = 'list' | 'create';

interface Prescription {
  id: string;
  medications: Array<{ name: string; dose: string; frequency: string; route?: string }>;
  instructions: string | null;
  diagnosis: string | null;
  status: PrescriptionStatus;
  signedAt: string | null;
  createdAt: string;
  prescriptionHash: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
  };
  clinician: {
    id: string;
    firstName: string;
    lastName: string;
    licenseNumber: string;
  };
}

interface PatientOption {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
}

interface MedicationEntry {
  name: string;
  genericName: string;
  dose: string;
  frequency: string;
  route: string;
  duration: string;
  instructions: string;
}

const EMPTY_MEDICATION: MedicationEntry = {
  name: '',
  genericName: '',
  dose: '',
  frequency: '',
  route: 'oral',
  duration: '',
  instructions: '',
};

export default function PrescriptionsPage() {
  const t = useTranslations('dashboard.prescriptions');
  const { data: session } = useSession();

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('active');

  const [view, setView] = useState<PageView>('list');
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [medications, setMedications] = useState<MedicationEntry[]>([{ ...EMPTY_MEDICATION }]);
  const [diagnosis, setDiagnosis] = useState('');
  const [instructions, setInstructions] = useState('');
  const [signingPin, setSigningPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const loadPrescriptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/prescriptions', {
        headers: { 'X-Access-Reason': 'CLINICAL_CARE' },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.message || 'Failed to load prescriptions');
      }
      const data = await res.json();
      setPrescriptions(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  useEffect(() => {
    if (view !== 'create' || patientSearch.length < 2) {
      setPatients([]);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/patients?search=${encodeURIComponent(patientSearch)}&limit=10`, {
      signal: controller.signal,
      headers: { 'X-Access-Reason': 'CLINICAL_CARE' },
    })
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((data) => setPatients(data.data || []))
      .catch(() => {});
    return () => controller.abort();
  }, [patientSearch, view]);

  const addMedication = () => setMedications((prev) => [...prev, { ...EMPTY_MEDICATION }]);

  const removeMedication = (index: number) => {
    setMedications((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const updateMedication = (index: number, field: keyof MedicationEntry, value: string) => {
    setMedications((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  };

  const resetForm = () => {
    setSelectedPatient(null);
    setPatientSearch('');
    setMedications([{ ...EMPTY_MEDICATION }]);
    setDiagnosis('');
    setInstructions('');
    setSigningPin('');
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || medications.some((m) => !m.name || !m.dose || !m.frequency)) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Access-Reason': 'CLINICAL_CARE' },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          medications: medications.map((m) => ({
            name: m.name,
            genericName: m.genericName || m.name,
            dose: m.dose,
            frequency: m.frequency,
            route: m.route,
            duration: m.duration,
            instructions: m.instructions,
          })),
          diagnosis,
          instructions,
          signatureMethod: 'pin',
          signatureData: signingPin,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create prescription');
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        setView('list');
        setSubmitSuccess(false);
        resetForm();
        loadPrescriptions();
      }, 1500);
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = prescriptions.filter((rx) => {
    if (activeFilter === 'active') return ['PENDING', 'SIGNED', 'SENT'].includes(rx.status);
    if (activeFilter === 'history') return ['FILLED', 'CANCELLED'].includes(rx.status);
    return true;
  });

  const getStatusConfig = (status: PrescriptionStatus) => {
    switch (status) {
      case 'SIGNED':
        return { icon: CheckCircle2, label: t('signed'), className: 'text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400' };
      case 'SENT':
        return { icon: Send, label: t('sent'), className: 'text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' };
      case 'FILLED':
        return { icon: CheckCircle2, label: t('filled'), className: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400' };
      case 'CANCELLED':
        return { icon: Ban, label: t('cancelled'), className: 'text-gray-700 bg-gray-100 dark:bg-gray-800 dark:text-gray-400' };
      default:
        return { icon: Clock, label: t('pending'), className: 'text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400' };
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  // --- Loading ---
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('loading')}</p>
        </div>
      </div>
    );
  }

  // --- Error ---
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{t('errorTitle')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={loadPrescriptions}
            className="px-4 py-2.5 min-h-[44px] bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  // --- Create Form ---
  if (view === 'create') {
    return (
      <div className="max-w-3xl mx-auto p-4 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t('newPrescription')}</h1>
          <button
            onClick={() => {
              setView('list');
              resetForm();
            }}
            className="w-11 h-11 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={t('cancel')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t('patient')}
            </label>
            {selectedPatient ? (
              <div className="flex items-center justify-between px-4 py-3 min-h-[44px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder={t('searchPatient')}
                  className="w-full pl-10 pr-4 py-3 min-h-[44px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {patients.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {patients.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPatient(p);
                          setPatientSearch('');
                          setPatients([]);
                        }}
                        className="w-full text-left px-4 py-3 min-h-[44px] text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <span className="font-medium text-gray-900 dark:text-white">
                          {p.firstName} {p.lastName}
                        </span>
                        {p.dateOfBirth && (
                          <span className="text-gray-500 dark:text-gray-400 ml-2">
                            {formatDate(p.dateOfBirth)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Medications */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('medications')}</label>
              <button
                type="button"
                onClick={addMedication}
                className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('addMedication')}
              </button>
            </div>
            <div className="space-y-4">
              {medications.map((med, i) => (
                <div
                  key={i}
                  className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('medications')} {i + 1}
                    </span>
                    {medications.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMedication(i)}
                        className="text-red-400 hover:text-red-600 text-xs font-medium min-h-[44px] min-w-[44px] flex items-center justify-center"
                      >
                        {t('removeMedication')}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      value={med.name}
                      onChange={(e) => updateMedication(i, 'name', e.target.value)}
                      placeholder={t('medicationName')}
                      className="px-3 py-2.5 min-h-[44px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={med.genericName}
                      onChange={(e) => updateMedication(i, 'genericName', e.target.value)}
                      placeholder={t('genericName')}
                      className="px-3 py-2.5 min-h-[44px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      required
                      value={med.dose}
                      onChange={(e) => updateMedication(i, 'dose', e.target.value)}
                      placeholder={t('dosage')}
                      className="px-3 py-2.5 min-h-[44px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      required
                      value={med.frequency}
                      onChange={(e) => updateMedication(i, 'frequency', e.target.value)}
                      placeholder={t('frequency')}
                      className="px-3 py-2.5 min-h-[44px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={med.route}
                      onChange={(e) => updateMedication(i, 'route', e.target.value)}
                      placeholder={t('route')}
                      className="px-3 py-2.5 min-h-[44px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={med.duration}
                      onChange={(e) => updateMedication(i, 'duration', e.target.value)}
                      placeholder={t('duration')}
                      className="px-3 py-2.5 min-h-[44px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Diagnosis & instructions */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('diagnosis')}
              </label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder={t('diagnosisPlaceholder')}
                className="w-full px-3 py-2.5 min-h-[44px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('instructions')}
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder={t('instructionsPlaceholder')}
                rows={3}
                className="w-full px-3 py-2.5 min-h-[44px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Digital signature */}
          <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/30 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <FileKey className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <label className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {t('signatureMethod')}
              </label>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">{t('signatureDisclaimer')}</p>
            <input
              type="password"
              inputMode="numeric"
              pattern="\d{4,6}"
              required
              value={signingPin}
              onChange={(e) => setSigningPin(e.target.value)}
              placeholder={t('enterPin')}
              className="w-full px-3 py-2.5 min-h-[44px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {submitError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30 rounded-lg text-sm text-red-700 dark:text-red-400">
              {submitError}
            </div>
          )}

          {submitSuccess && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/30 rounded-lg text-sm text-green-700 dark:text-green-400">
              {t('prescriptionCreated')}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !selectedPatient || !signingPin}
            className="w-full py-3.5 min-h-[44px] bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('signing')}
              </>
            ) : (
              <>
                <FileKey className="w-4 h-4" />
                {t('sign')}
              </>
            )}
          </button>
        </form>
      </div>
    );
  }

  // --- List View ---
  return (
    <div className="max-w-5xl mx-auto p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('subtitle')}</p>
        </div>
        <button
          onClick={() => setView('create')}
          className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          {t('newPrescription')}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {(['active', 'all', 'history'] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={`flex-1 px-4 py-2.5 min-h-[44px] rounded-md text-sm font-medium transition-all ${
              activeFilter === tab
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {t(`filter${tab.charAt(0).toUpperCase() + tab.slice(1)}` as any)}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700">
          <Pill className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">{t('noPrescriptions')}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('noPrescriptionsHint')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((rx) => {
            const statusConfig = getStatusConfig(rx.status);
            const StatusIcon = statusConfig.icon;
            return (
              <div
                key={rx.id}
                className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {rx.patient.firstName} {rx.patient.lastName}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.className}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {rx.medications.map((m: any) => m.name).join(', ')}
                    </p>
                    {rx.diagnosis && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {t('diagnosis')}: {rx.diagnosis}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(rx.createdAt)}</p>
                    {rx.signedAt && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {t('signedAt')}: {formatDate(rx.signedAt)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
