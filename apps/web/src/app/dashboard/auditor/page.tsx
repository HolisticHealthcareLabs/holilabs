'use client';

/**
 * Auditor Dashboard
 *
 * Displays potential recoverable revenue from unbilled procedures.
 * This is the "Adversarial Auditor" - a background service that
 * cross-references clinical notes against billing codes.
 *
 * @module app/dashboard/auditor
 */

import { useState, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface RevenueGap {
  id: string;
  patientId: string;
  patientName?: string;
  procedure: {
    tissCode?: string;
    cptCode?: string;
    description: string;
    descriptionPortuguese?: string;
    confidence: number;
    sourceText: string;
    sourceLocation: string;
    estimatedValue: number;
    estimatedValueFormatted: string;
    category: string;
  };
  sourceNoteId: string;
  documentedAt: string;
  status: 'OPEN' | 'REVIEWED' | 'BILLED' | 'DISMISSED';
}

interface AuditorSummary {
  totalGaps: number;
  totalPotentialValue: number;
  totalPotentialValueFormatted: string;
  byStatus: {
    open: number;
    reviewed: number;
    billed: number;
    dismissed: number;
  };
  byCategory: Record<string, { count: number; value: number; valueFormatted: string }>;
  topProcedures: Array<{
    description: string;
    count: number;
    totalValue: number;
    totalValueFormatted: string;
  }>;
  periodStart: string;
  periodEnd: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function AuditorDashboard() {
  const [summary, setSummary] = useState<AuditorSummary | null>(null);
  const [gaps, setGaps] = useState<RevenueGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lookbackHours, setLookbackHours] = useState(24);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [scanning, setScanning] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/auditor?lookbackHours=${lookbackHours}`);
      const data = await response.json();

      if (data.success) {
        setSummary(data.data);
      } else {
        setError(data.error || 'Failed to fetch summary');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [lookbackHours]);

  const scanPatient = async () => {
    if (!selectedPatientId.trim()) {
      setError('Please enter a patient ID');
      return;
    }

    try {
      setScanning(true);
      setError(null);

      const response = await fetch('/api/auditor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: selectedPatientId, lookbackHours }),
      });

      const data = await response.json();

      if (data.success) {
        setGaps(data.data.gaps);
      } else {
        setError(data.error || 'Failed to scan patient');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Revenue Gap Auditor
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Identify procedures documented but not billed - Potential Recoverable Revenue
              </p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={lookbackHours}
                onChange={(e) => setLookbackHours(parseInt(e.target.value, 10))}
                className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value={24}>Last 24 hours</option>
                <option value={48}>Last 48 hours</option>
                <option value={72}>Last 72 hours</option>
                <option value={168}>Last 7 days</option>
              </select>
              <button
                onClick={fetchSummary}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Potential Revenue */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <svg
                    className="h-6 w-6 text-green-600 dark:text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Potential Recoverable Revenue
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {summary.totalPotentialValueFormatted}
                  </p>
                </div>
              </div>
            </div>

            {/* Total Gaps */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <svg
                    className="h-6 w-6 text-yellow-600 dark:text-yellow-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Unbilled Procedures
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {summary.totalGaps}
                  </p>
                </div>
              </div>
            </div>

            {/* Open Gaps */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <svg
                    className="h-6 w-6 text-red-600 dark:text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Pending Review
                  </p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {summary.byStatus.open}
                  </p>
                </div>
              </div>
            </div>

            {/* Recovered */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <svg
                    className="h-6 w-6 text-blue-600 dark:text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Billed / Recovered
                  </p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {summary.byStatus.billed}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Categories & Top Procedures */}
          <div className="lg:col-span-2 space-y-6">
            {/* By Category */}
            {summary && Object.keys(summary.byCategory).length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Revenue Gaps by Category
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {Object.entries(summary.byCategory).map(([category, data]) => (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(category)}`}
                          >
                            {category}
                          </span>
                          <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">
                            {data.count} procedures
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {data.valueFormatted}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Top Procedures */}
            {summary && summary.topProcedures.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Top Unbilled Procedures
                  </h2>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {summary.topProcedures.map((procedure, index) => (
                    <div key={index} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {procedure.description}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {procedure.count} occurrences
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                        {procedure.totalValueFormatted}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Patient Gaps List */}
            {gaps.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Detected Revenue Gaps
                  </h2>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {gaps.map((gap) => (
                    <div key={gap.id} className="px-6 py-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(gap.procedure.category)}`}
                            >
                              {gap.procedure.category}
                            </span>
                            {gap.procedure.tissCode && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                TISS: {gap.procedure.tissCode}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {gap.procedure.descriptionPortuguese || gap.procedure.description}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 italic">
                            &ldquo;{gap.procedure.sourceText}&rdquo;
                          </p>
                          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            Found in: {gap.procedure.sourceLocation} | Confidence:{' '}
                            {(gap.procedure.confidence * 100).toFixed(0)}%
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                            {gap.procedure.estimatedValueFormatted}
                          </p>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(gap.status)}`}
                          >
                            {gap.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Patient Scanner */}
          <div className="space-y-6">
            {/* Patient Scanner */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Scan Patient Notes
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="patientId"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Patient ID
                    </label>
                    <input
                      type="text"
                      id="patientId"
                      value={selectedPatientId}
                      onChange={(e) => setSelectedPatientId(e.target.value)}
                      placeholder="Enter patient ID..."
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <button
                    onClick={scanPatient}
                    disabled={scanning || !selectedPatientId.trim()}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                  >
                    {scanning ? 'Scanning...' : 'Scan for Revenue Gaps'}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            {summary && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Quick Stats
                  </h2>
                </div>
                <div className="p-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Period</span>
                    <span className="text-gray-900 dark:text-white">
                      {new Date(summary.periodStart).toLocaleDateString('pt-BR')} -{' '}
                      {new Date(summary.periodEnd).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Open Gaps</span>
                    <span className="text-red-600 dark:text-red-400 font-medium">
                      {summary.byStatus.open}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Under Review</span>
                    <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                      {summary.byStatus.reviewed}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Billed</span>
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      {summary.byStatus.billed}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Dismissed</span>
                    <span className="text-gray-600 dark:text-gray-400 font-medium">
                      {summary.byStatus.dismissed}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Help */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                How It Works
              </h3>
              <p className="mt-2 text-xs text-blue-700 dark:text-blue-400">
                The Revenue Gap Auditor scans clinical notes for mentioned procedures and
                cross-references them against submitted billing claims. Procedures documented but not
                billed represent potential recoverable revenue.
              </p>
              <ul className="mt-3 text-xs text-blue-700 dark:text-blue-400 space-y-1">
                <li>
                  <strong>OPEN:</strong> Needs review
                </li>
                <li>
                  <strong>REVIEWED:</strong> Under billing review
                </li>
                <li>
                  <strong>BILLED:</strong> Claim submitted
                </li>
                <li>
                  <strong>DISMISSED:</strong> Not applicable
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    IMAGING: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    LABORATORY: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    PROCEDURE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    CONSULTATION: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    THERAPY: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
    OTHER: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
  };
  return colors[category] || colors.OTHER;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    OPEN: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    REVIEWED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    BILLED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    DISMISSED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
  };
  return colors[status] || colors.OPEN;
}
