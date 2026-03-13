'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

export const dynamic = 'force-dynamic';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Medication {
  name: string;
  dose?: string;
  frequency?: string;
  tussCode?: string;
}

interface Encounter {
  id: string;
  status: string;
  chiefComplaint?: string;
  scheduledAt?: string;
}

interface Prescription {
  id: string;
  medications: Medication[];
  diagnosis?: string;
  status: string;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-green-50 text-green-700 border-green-200',
    INACTIVE: 'bg-gray-50 text-gray-500 border-gray-200',
    SCHEDULED: 'bg-blue-50 text-blue-700 border-blue-200',
    IN_PROGRESS: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    COMPLETED: 'bg-green-50 text-green-700 border-green-200',
    CANCELLED: 'bg-red-50 text-red-700 border-red-200',
    CHECKED_IN: 'bg-purple-50 text-purple-700 border-purple-200',
    PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  };
  const cls = map[status] ?? 'bg-gray-50 text-gray-500 border-gray-200';
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function safetyBadge(color: 'GREEN' | 'AMBER' | 'RED' | null) {
  if (!color) return null;
  const map = {
    GREEN: 'bg-green-50 text-green-700 border-green-200',
    AMBER: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    RED: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${map[color]}`}>
      {color}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const t = useTranslations('dashboard.patients');

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    const patientP = fetch(`/api/patients/${id}`, { cache: 'no-store' })
      .then((r) => r.json().then((d) => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data?.error || 'Failed to load patient');
        return data?.data;
      });

    const rxP = fetch(`/api/prescriptions?patientId=${id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => d?.data ?? [])
      .catch(() => []);

    const encounterP = fetch(`/api/encounters?patientId=${id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => d?.data ?? [])
      .catch(() => []); // graceful fallback if route doesn't exist yet

    Promise.all([patientP, rxP, encounterP])
      .then(([pat, rxs, encs]) => {
        setPatient(pat);
        setPrescriptions(Array.isArray(rxs) ? rxs : []);
        setEncounters(Array.isArray(encs) ? encs : []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Unknown error'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f2f2f7' }}>
        <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6" style={{ background: '#f2f2f7', minHeight: '100vh' }}>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  const patientName = patient
    ? `${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim() || t('patientFallback')
    : t('patientFallback');

  const isActive = patient?.isActive !== false;
  const age = patient?.dateOfBirth
    ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null;

  return (
    <div style={{ background: '#f2f2f7', minHeight: '100vh' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <Link href="/dashboard/patients" className="text-sm text-blue-600 font-medium mb-2 inline-block">
          ← {t('allPatientsLink')}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.1, color: '#1c1c1e' }}>
              {patientName}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              {patient?.mrn && (
                <span className="text-sm text-gray-400 font-mono">MRN: {patient.mrn}</span>
              )}
              {age !== null && (
                <span className="text-sm text-gray-400">{age} yrs</span>
              )}
              {patient?.gender && (
                <span className="text-sm text-gray-400 capitalize">{patient.gender?.toLowerCase()}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {statusBadge(isActive ? 'ACTIVE' : 'INACTIVE')}
            {patient?.isPalliativeCare && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200">
                {t('palliative')}
              </span>
            )}
            <span className="text-xs text-gray-400 border border-gray-200 rounded-xl px-3 py-1">
              {t('syntheticDemo')}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-3">
        <div className="flex items-center gap-2 max-w-6xl mx-auto overflow-x-auto">
          <Link
            href={`/dashboard/clinical-command?patientId=${id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors whitespace-nowrap"
          >
            {t('startEncounter')}
          </Link>
          <Link
            href={`/dashboard/prevention/hub?patientId=${id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {t('preventionPlan')}
          </Link>
          <Link
            href={`/dashboard/billing?action=prior-auth&patientId=${id}&patientName=${encodeURIComponent(patientName)}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {t('preAuthorization')}
          </Link>
          <Link
            href={`/dashboard/forms?patientId=${id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {t('sendForm')}
          </Link>
        </div>
      </div>

      <div className="p-6 flex flex-col gap-6 max-w-6xl mx-auto">

        {/* ── Section 1: Clinical Summary 2×2 ──────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">{t('clinicalSummary')}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-400">{t('activeMedications')}</span>
              <span className="text-2xl font-semibold text-gray-900">{prescriptions.length}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-400">{t('lastPrescribed')}</span>
              <span className="text-sm font-medium text-gray-900">
                {prescriptions[0]
                  ? new Date(prescriptions[0].createdAt).toLocaleDateString()
                  : '—'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-400">{t('riskFactors')}</span>
              <div className="flex flex-wrap gap-1">
                {patient?.isPalliativeCare ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">Palliative</span>
                ) : (
                  <span className="text-sm text-gray-400">—</span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-400">{t('recentEncounter')}</span>
              <span className="text-sm font-medium text-gray-900">
                {encounters[0] ? statusBadge(encounters[0].status) : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Section 2: Active Medications ────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('activeMedications')}</h2>
            <Link
              href="/dashboard/prescriptions/new"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              {t('addPrescription')}
            </Link>
          </div>
          {prescriptions.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">{t('noActiveMedications')}</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400">{t('drugAndDose')}</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400">{t('frequency')}</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400">{t('safety')}</th>
                  <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-400">{t('action')}</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((rx) => {
                  const meds = Array.isArray(rx.medications) ? rx.medications : [];
                  const med = meds[0] as Medication | undefined;
                  return (
                    <tr key={rx.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {med?.name ?? '—'} {med?.dose && <span className="text-gray-400 font-normal">{med.dose}</span>}
                      </td>
                      <td className="px-5 py-3 text-gray-600">{med?.frequency ?? '—'}</td>
                      <td className="px-5 py-3">{safetyBadge(null)}</td>
                      <td className="px-5 py-3 text-right">
                        <button className="text-xs text-blue-600 font-semibold hover:text-blue-700">
                          {t('prescribe')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Section 3: Recent Encounters Timeline ────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('recentEncounters')}</h2>
          </div>
          {encounters.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">{t('noEncountersRecorded')}</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {encounters.slice(0, 5).map((enc) => (
                <Link
                  key={enc.id}
                  href={`/dashboard/encounters/${enc.id}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/50 transition-colors group"
                >
                  <div className="w-1 h-8 rounded-full bg-blue-100 group-hover:bg-blue-300 transition-colors flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {enc.chiefComplaint || 'Encounter'}
                    </div>
                    {enc.scheduledAt && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {new Date(enc.scheduledAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div>{statusBadge(enc.status)}</div>
                  <span className="text-gray-300 group-hover:text-gray-400 text-sm">›</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Section 4: Quick Actions Bottom Bar ─────────────────────────── */}
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/dashboard/encounters/new?patientId=${id}`}
            className="bg-black text-white rounded-full px-6 py-3 text-sm font-semibold hover:bg-gray-900 transition-colors"
          >
            {t('startEncounter')}
          </Link>
          <Link
            href={`/dashboard/prescriptions/new?patientId=${id}`}
            className="bg-black text-white rounded-full px-6 py-3 text-sm font-semibold hover:bg-gray-900 transition-colors"
          >
            {t('prescribeMedication')}
          </Link>
          <Link
            href="/dashboard/prevention"
            className="bg-black text-white rounded-full px-6 py-3 text-sm font-semibold hover:bg-gray-900 transition-colors"
          >
            {t('viewPreventionPlan')}
          </Link>
          <Link
            href="/dashboard/co-pilot-v2"
            className="bg-black text-white rounded-full px-6 py-3 text-sm font-semibold hover:bg-gray-900 transition-colors"
          >
            {t('soapNote')}
          </Link>
        </div>

      </div>
    </div>
  );
}
