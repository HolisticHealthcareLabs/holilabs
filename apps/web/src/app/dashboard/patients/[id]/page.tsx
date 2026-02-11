'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    // Demo mode endpoint does not require accessReason.
    fetch(`/api/patients/${id}`, { cache: 'no-store' })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error || 'Failed to load patient');
        return data;
      })
      .then((data) => setPatient(data?.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Unknown error'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <Link href="/dashboard/patients" className="text-blue-600 dark:text-blue-400 font-semibold">
              ← Back to patients
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {loading ? 'Loading…' : `${patient?.firstName ?? ''} ${patient?.lastName ?? ''}`.trim() || 'Patient'}
          </h1>
          {!loading && patient?.mrn && (
            <p className="text-sm text-gray-600 dark:text-gray-300">MRN: {patient.mrn}</p>
          )}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2">
          Synthetic demo record (no PHI)
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      )}

      {!error && !loading && patient && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">
              Profile
            </h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">DOB</dt>
                <dd className="text-gray-900 dark:text-white">
                  {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Gender</dt>
                <dd className="text-gray-900 dark:text-white">{patient.gender ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Status</dt>
                <dd className="text-gray-900 dark:text-white">
                  {patient.isActive === false ? 'Inactive' : 'Active'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Program</dt>
                <dd className="text-gray-900 dark:text-white">
                  {patient.isPalliativeCare ? 'Palliative Care' : 'General'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">
              Next actions (synthetic)
            </h2>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Prevention plan review</div>
                  <div className="text-gray-600 dark:text-gray-300">Validate screenings + schedule follow-ups.</div>
                </div>
                <Link href="/dashboard/prevention" className="text-blue-600 dark:text-blue-400 font-semibold">
                  Open
                </Link>
              </li>
              <li className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Generate summary note</div>
                  <div className="text-gray-600 dark:text-gray-300">Scribe a consult summary using the co-pilot.</div>
                </div>
                <Link href="/dashboard/co-pilot-v2" className="text-blue-600 dark:text-blue-400 font-semibold">
                  Open
                </Link>
              </li>
              <li className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Review governance checks</div>
                  <div className="text-gray-600 dark:text-gray-300">See hard brakes + nudges applied.</div>
                </div>
                <Link href="/dashboard/governance" className="text-blue-600 dark:text-blue-400 font-semibold">
                  Open
                </Link>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

