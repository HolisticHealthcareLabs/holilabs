/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
  dateOfBirth?: string;
  gender?: string;
  isActive?: boolean;
  isPalliativeCare?: boolean;
};

export const dynamic = 'force-dynamic';

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/patients?limit=100', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => setPatients((data?.data as Patient[]) || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) =>
      `${p.firstName} ${p.lastName} ${p.mrn}`.toLowerCase().includes(q)
    );
  }, [patients, query]);

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Patients</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Synthetic demo list (no PHI). Search by name or MRN.
          </p>
        </div>
        <div className="w-full max-w-sm">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-900 dark:text-white">
          {loading ? 'Loading…' : `${filtered.length} patients`}
        </div>
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {filtered.map((p) => (
            <li key={p.id} className="px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-900/30">
              <Link href={`/dashboard/patients/${p.id}`} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 dark:text-white truncate">
                    {p.firstName} {p.lastName}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    MRN: {p.mrn}
                    {p.isPalliativeCare ? ' • Palliative' : ''}
                    {p.isActive === false ? ' • Inactive' : ''}
                  </div>
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400 font-semibold">
                  Open →
                </div>
              </Link>
            </li>
          ))}
          {!loading && filtered.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-gray-600 dark:text-gray-300">
              No matches.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

