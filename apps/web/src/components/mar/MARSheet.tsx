'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * MAR (Medication Administration Record) Sheet
 *
 * Phase 4: Nursing Workflows
 * Hospital-grade medication administration tracking
 * CRITICAL for patient safety - prevents wrong drug/dose/time errors
 */

interface MedicationAdministration {
  id: string;
  medication: {
    id: string;
    name: string;
    dose: string;
    route: string;
    frequency: string;
  };
  scheduledTime: string;
  actualTime?: string;
  status: 'SCHEDULED' | 'DUE' | 'GIVEN' | 'LATE' | 'REFUSED' | 'MISSED' | 'HELD';
  administeredBy?: string;
  onTime: boolean;
  minutesLate?: number;
  isPRN: boolean;
  prnReason?: string;
  refusalReason?: string;
  missedReason?: string;
  notes?: string;
  adverseReaction: boolean;
  reactionDetails?: string;
}

interface MARSheetProps {
  patientId: string;
  date?: Date;
  shift?: 'day' | 'evening' | 'night' | 'all';
  onAdminister?: (administrationId: string) => void;
  className?: string;
}

const STATUS_COLORS = {
  SCHEDULED: 'bg-gray-100 text-gray-700 border-gray-300',
  DUE: 'bg-yellow-100 text-yellow-800 border-yellow-400',
  GIVEN: 'bg-green-100 text-green-800 border-green-400',
  LATE: 'bg-red-100 text-red-800 border-red-400',
  REFUSED: 'bg-orange-100 text-orange-800 border-orange-400',
  MISSED: 'bg-purple-100 text-purple-800 border-purple-400',
  HELD: 'bg-blue-100 text-blue-800 border-blue-400',
};

const STATUS_ICONS = {
  SCHEDULED: '⏰',
  DUE: '🔔',
  GIVEN: '✓',
  LATE: '⚠️',
  REFUSED: '✗',
  MISSED: '○',
  HELD: '⏸',
};

const SHIFT_TIMES = {
  day: { start: 7, end: 15, label: 'Day Shift (7am-3pm)' },
  evening: { start: 15, end: 23, label: 'Evening Shift (3pm-11pm)' },
  night: { start: 23, end: 7, label: 'Night Shift (11pm-7am)' },
  all: { start: 0, end: 24, label: 'All Shifts (24 hours)' },
};

export function MARSheet({
  patientId,
  date = new Date(),
  shift = 'day',
  onAdminister,
  className = '',
}: MARSheetProps) {
  const [administrations, setAdministrations] = useState<MedicationAdministration[]>([]);
  const [groupedByMedication, setGroupedByMedication] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState(shift);
  const [selectedDate, setSelectedDate] = useState(date);
  const [showAdministerModal, setShowAdministerModal] = useState<string | null>(null);

  // Fetch MAR data
  useEffect(() => {
    fetchMAR();
  }, [patientId, selectedDate, selectedShift]);

  const fetchMAR = async () => {
    try {
      setLoading(true);
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);

      const response = await fetch(
        `/api/mar/administer?patientId=${patientId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&shift=${selectedShift}`
      );

      if (!response.ok) throw new Error('Failed to fetch MAR');

      const data = await response.json();
      setAdministrations(data.administrations || []);
      setGroupedByMedication(data.groupedByMedication || {});
    } catch (error) {
      console.error('Fetch MAR error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminister = async (
    administrationId: string,
    status: string,
    additionalData?: any
  ) => {
    try {
      const response = await fetch('/api/mar/administer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...additionalData,
          status,
        }),
      });

      if (!response.ok) throw new Error('Failed to record administration');

      // Refresh MAR
      await fetchMAR();

      if (onAdminister) {
        onAdminister(administrationId);
      }

      setShowAdministerModal(null);
    } catch (error) {
      console.error('Administration error:', error);
      alert('Failed to record medication administration');
    }
  };

  // Group times by hour for column headers
  const timeSlots = Array.from({ length: 24 }, (_, i) => i);
  const shiftHours = SHIFT_TIMES[selectedShift];
  const visibleHours = timeSlots.filter((hour) => {
    if (selectedShift === 'night') {
      // Night shift wraps around midnight
      return hour >= shiftHours.start || hour < shiftHours.end;
    }
    return hour >= shiftHours.start && hour < shiftHours.end;
  });

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="text-gray-600 dark:text-gray-400">Loading MAR...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              💊 Medication Administration Record (MAR)
            </h1>
            <p className="text-white/80">
              {SHIFT_TIMES[selectedShift].label} •{' '}
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button
            onClick={fetchMAR}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Date Selector */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
              Date
            </label>
            <input
              type="date"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Shift Selector */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
              Shift
            </label>
            <div className="flex gap-2">
              {(['day', 'evening', 'night', 'all'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedShift(s)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedShift === s
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {s === 'day' && '☀️'}
                  {s === 'evening' && '🌆'}
                  {s === 'night' && '🌙'}
                  {s === 'all' && '🕐'}
                  {' '}
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MAR Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-900 z-10">
                Medication
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Dose
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Route
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Frequency
              </th>
              {visibleHours.map((hour) => (
                <th
                  key={hour}
                  className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {hour.toString().padStart(2, '0')}:00
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {Object.values(groupedByMedication).map((group: any) => (
              <tr key={group.medication.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-800">
                  {group.medication.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {group.medication.dose}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {group.medication.route || 'PO'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {group.medication.frequency}
                </td>
                {visibleHours.map((hour) => {
                  // Find administration for this hour
                  const admin = group.administrations.find((a: any) => {
                    const adminHour = new Date(a.scheduledTime).getHours();
                    return adminHour === hour;
                  });

                  if (!admin) {
                    return (
                      <td
                        key={hour}
                        className="px-3 py-4 text-center text-gray-300 dark:text-gray-600"
                      >
                        —
                      </td>
                    );
                  }

                  const statusColor = STATUS_COLORS[admin.status as keyof typeof STATUS_COLORS];
                  const statusIcon = STATUS_ICONS[admin.status as keyof typeof STATUS_ICONS];

                  return (
                    <td key={hour} className="px-3 py-4 text-center">
                      <button
                        onClick={() => setShowAdministerModal(admin.id)}
                        className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all hover:scale-105 ${statusColor}`}
                        title={`${admin.status} - Click to update`}
                      >
                        <div className="text-lg mb-1">{statusIcon}</div>
                        <div className="text-xs">
                          {admin.status === 'GIVEN' && admin.actualTime
                            ? new Date(admin.actualTime).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : admin.status}
                        </div>
                        {admin.minutesLate && admin.minutesLate > 0 && (
                          <div className="text-xs text-red-600 font-bold">
                            +{admin.minutesLate}min
                          </div>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {Object.keys(groupedByMedication).length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💊</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Medications Scheduled
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              No medications scheduled for this patient during the selected shift
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Legend:</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded border-2 text-xs ${color}`}>
                {STATUS_ICONS[status as keyof typeof STATUS_ICONS]} {status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Administration Modal would go here */}
      {/* TODO: Create detailed administration modal for recording dose, site, witnessing, etc. */}
    </div>
  );
}
