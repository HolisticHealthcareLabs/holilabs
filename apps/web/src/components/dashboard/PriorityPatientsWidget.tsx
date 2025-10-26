'use client';

/**
 * Priority Patients Widget - Intelligent Task Prioritization
 *
 * Displays prioritized list of patients based on urgency factors:
 * - High pain scores
 * - Abnormal vitals
 * - Overdue tasks
 * - Scheduled appointments
 * - Recent admissions
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ExclamationTriangleIcon,
  ClockIcon,
  CalendarIcon,
  DocumentTextIcon,
  BeakerIcon,
  FlagIcon,
  ArrowPathIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import {
  ExclamationCircleIcon,
  FireIcon,
} from '@heroicons/react/24/solid';

interface PriorityPatient {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
  urgencyScore: number;
  urgencyReasons: string[];
  latestPainScore?: number;
  overdueNotes: number;
  pendingOrders: number;
  todayAppointment?: {
    id: string;
    scheduledFor: string;
    type: string;
  };
  daysSinceLastVisit?: number;
  carePlanGoalsDue: number;
}

interface Summary {
  totalPatients: number;
  criticalUrgency: number;
  highUrgency: number;
  moderateUrgency: number;
  lowUrgency: number;
  totalOverdueNotes: number;
  totalPendingOrders: number;
  appointmentsToday: number;
}

interface PriorityPatientsWidgetProps {
  /** Maximum number of patients to display */
  limit?: number;

  /** Minimum urgency score to display */
  minScore?: number;

  /** Show compact view */
  compact?: boolean;

  /** Auto-refresh interval in seconds (0 = disabled) */
  refreshInterval?: number;
}

export function PriorityPatientsWidget({
  limit = 10,
  minScore = 0,
  compact = false,
  refreshInterval = 300, // 5 minutes
}: PriorityPatientsWidgetProps) {
  const router = useRouter();
  const [patients, setPatients] = useState<PriorityPatient[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  /**
   * Fetch priority patients
   */
  const fetchPriorityPatients = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: limit.toString(),
        minScore: minScore.toString(),
      });

      const response = await fetch(`/api/dashboard/priority-patients?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch priority patients');
      }

      const data = await response.json();
      setPatients(data.data || []);
      setSummary(data.summary || null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching priority patients:', err);
      setError('Failed to load priority patients');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Initial load and auto-refresh
   */
  useEffect(() => {
    fetchPriorityPatients();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchPriorityPatients, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [limit, minScore, refreshInterval]);

  /**
   * Get urgency badge color
   */
  const getUrgencyColor = (score: number) => {
    if (score >= 70) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    if (score >= 50) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
    if (score >= 30) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  };

  /**
   * Get urgency icon
   */
  const getUrgencyIcon = (score: number) => {
    if (score >= 70) return <FireIcon className="w-5 h-5 text-red-600 dark:text-red-400" />;
    if (score >= 50) return <ExclamationCircleIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />;
    if (score >= 30) return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
    return <FlagIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
  };

  /**
   * Get urgency label
   */
  const getUrgencyLabel = (score: number) => {
    if (score >= 70) return 'Critical';
    if (score >= 50) return 'High';
    if (score >= 30) return 'Moderate';
    return 'Low';
  };

  /**
   * Navigate to patient
   */
  const handlePatientClick = (patientId: string) => {
    router.push(`/dashboard/patients/${patientId}`);
  };

  if (loading && !lastUpdated) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading priority patients...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6">
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="w-12 h-12 mx-auto text-red-600 mb-4" />
          <p className="text-red-800 dark:text-red-300">{error}</p>
          <button
            onClick={fetchPriorityPatients}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <FlagIcon className="w-7 h-7" />
              Priority Patients
            </h2>
            <p className="mt-1 text-white/80 text-sm">
              Intelligent task prioritization for today
            </p>
          </div>
          <button
            onClick={fetchPriorityPatients}
            disabled={loading}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <ArrowPathIcon className={`w-5 h-5 text-white ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Summary Stats */}
        {summary && (
          <div className="mt-4 grid grid-cols-4 gap-3">
            {summary.criticalUrgency > 0 && (
              <div className="bg-red-500/20 backdrop-blur-sm rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-white">{summary.criticalUrgency}</div>
                <div className="text-xs text-white/80">Critical</div>
              </div>
            )}
            {summary.highUrgency > 0 && (
              <div className="bg-orange-500/20 backdrop-blur-sm rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-white">{summary.highUrgency}</div>
                <div className="text-xs text-white/80">High</div>
              </div>
            )}
            {summary.totalOverdueNotes > 0 && (
              <div className="bg-yellow-500/20 backdrop-blur-sm rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-white">{summary.totalOverdueNotes}</div>
                <div className="text-xs text-white/80">Overdue Notes</div>
              </div>
            )}
            {summary.appointmentsToday > 0 && (
              <div className="bg-blue-500/20 backdrop-blur-sm rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-white">{summary.appointmentsToday}</div>
                <div className="text-xs text-white/80">Appointments</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Patients List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {patients.length === 0 ? (
          <div className="p-12 text-center">
            <FlagIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">No priority patients</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
              All patients are up to date! Great work.
            </p>
          </div>
        ) : (
          patients.map((patient, index) => (
            <div
              key={patient.id}
              onClick={() => handlePatientClick(patient.id)}
              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {/* Priority Badge */}
                  <div className="flex flex-col items-center gap-1">
                    <div className={`px-3 py-1 rounded-full text-sm font-bold ${getUrgencyColor(patient.urgencyScore)}`}>
                      {patient.urgencyScore}
                    </div>
                    {getUrgencyIcon(patient.urgencyScore)}
                  </div>

                  {/* Patient Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {patient.firstName} {patient.lastName}
                      </h3>
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-xs font-mono">
                        {patient.mrn}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getUrgencyColor(patient.urgencyScore)}`}>
                        {getUrgencyLabel(patient.urgencyScore)} Priority
                      </span>
                    </div>

                    {/* Urgency Reasons */}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {patient.urgencyReasons.map((reason, idx) => (
                        <span
                          key={idx}
                          className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs"
                        >
                          {reason.includes('pain') && <ExclamationCircleIcon className="w-3 h-3" />}
                          {reason.includes('overdue') && <ClockIcon className="w-3 h-3" />}
                          {reason.includes('Appointment') && <CalendarIcon className="w-3 h-3" />}
                          {reason}
                        </span>
                      ))}
                    </div>

                    {/* Action Items */}
                    {!compact && (
                      <div className="mt-3 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        {patient.overdueNotes > 0 && (
                          <span className="flex items-center gap-1">
                            <DocumentTextIcon className="w-4 h-4 text-red-600" />
                            {patient.overdueNotes} overdue note{patient.overdueNotes > 1 ? 's' : ''}
                          </span>
                        )}
                        {patient.pendingOrders > 0 && (
                          <span className="flex items-center gap-1">
                            <BeakerIcon className="w-4 h-4 text-orange-600" />
                            {patient.pendingOrders} pending order{patient.pendingOrders > 1 ? 's' : ''}
                          </span>
                        )}
                        {patient.todayAppointment && (
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-4 h-4 text-blue-600" />
                            {new Date(patient.todayAppointment.scheduledFor).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                        {patient.carePlanGoalsDue > 0 && (
                          <span className="flex items-center gap-1">
                            <FlagIcon className="w-4 h-4 text-purple-600" />
                            {patient.carePlanGoalsDue} goal{patient.carePlanGoalsDue > 1 ? 's' : ''} due
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRightIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {lastUpdated && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
            {refreshInterval > 0 && (
              <span>
                Auto-refresh: {refreshInterval}s
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
