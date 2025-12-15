/**
export const dynamic = 'force-dynamic';

 * Patient Appointments Page
 *
 * Mobile-first appointment management with:
 * - Upcoming and past appointments
 * - Request new appointment flow
 * - Beautiful cards and animations
 * - Calendar integration ready
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow, isPast, isFuture } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

interface Clinician {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string | null;
}

interface Appointment {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  type: string;
  status: string;
  urgency: string | null;
  clinician: Clinician;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [pastAppointments, setPastAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await fetch('/api/portal/appointments');
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error loading appointments');
      }

      setAppointments(data.data.appointments);
      setUpcomingAppointments(data.data.upcomingAppointments);
      setPastAppointments(data.data.pastAppointments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
      case 'RESCHEDULED':
        return 'bg-green-100 text-green-700';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-700';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700';
      case 'NO_SHOW':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'Scheduled';
      case 'RESCHEDULED':
        return 'Rescheduled';
      case 'COMPLETED':
        return 'Completed';
      case 'CANCELLED':
        return 'Cancelled';
      case 'NO_SHOW':
        return 'No Show';
      default:
        return status;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'VIRTUAL':
        return '💻';
      case 'PHONE':
        return '📞';
      case 'IN_PERSON':
      default:
        return '🏥';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'VIRTUAL':
        return 'Virtual';
      case 'PHONE':
        return 'Phone';
      case 'IN_PERSON':
      default:
        return 'In-Person';
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 lg:p-8 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 lg:p-8 max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <svg
            className="w-12 h-12 text-red-500 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Error loading appointments
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchAppointments}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const displayAppointments =
    activeTab === 'upcoming' ? upcomingAppointments : pastAppointments;

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            My Appointments
          </h1>
          <p className="text-gray-600">
            Manage your medical visits
          </p>
        </div>
        <Link
          href="/portal/appointments/request"
          className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span className="hidden sm:inline">Request</span>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-green-400 to-green-600 rounded-xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">📅</span>
            <span className="text-3xl font-bold">{upcomingAppointments.length}</span>
          </div>
          <p className="text-sm font-medium">Upcoming</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">✅</span>
            <span className="text-3xl font-bold">{pastAppointments.length}</span>
          </div>
          <p className="text-sm font-medium">Past</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">💻</span>
            <span className="text-3xl font-bold">
              {appointments.filter((a) => a.type === 'VIRTUAL').length}
            </span>
          </div>
          <p className="text-sm font-medium">Virtual</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">🏥</span>
            <span className="text-3xl font-bold">
              {appointments.filter((a) => a.type === 'IN_PERSON').length}
            </span>
          </div>
          <p className="text-sm font-medium">In-Person</p>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'upcoming'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Upcoming ({upcomingAppointments.length})
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'past'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Past ({pastAppointments.length})
        </button>
      </div>

      {/* Appointments List */}
      <AnimatePresence mode="wait">
        {displayAppointments.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-12 text-center"
          >
            {/* Decorative - low contrast intentional for empty state icon */}
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activeTab === 'upcoming'
                ? 'No upcoming appointments'
                : 'No past appointments'}
            </h3>
            <p className="text-gray-600 mb-6">
              {activeTab === 'upcoming'
                ? 'Request an appointment to schedule your visit'
                : 'Completed appointments will appear here'}
            </p>
            {activeTab === 'upcoming' && (
              <Link
                href="/portal/appointments/request"
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Request Appointment
              </Link>
            )}
          </motion.div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid gap-4"
          >
            {displayAppointments.map((appointment, index) => (
              <motion.div
                key={appointment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                      {format(new Date(appointment.startTime), 'd', { locale: es })}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {appointment.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {format(new Date(appointment.startTime), "EEEE, d 'de' MMMM 'de' yyyy", {
                          locale: es,
                        })}
                      </p>
                      <p className="text-sm font-semibold text-gray-700">
                        {format(new Date(appointment.startTime), 'HH:mm', { locale: es })} -{' '}
                        {format(new Date(appointment.endTime), 'HH:mm', { locale: es })}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                        appointment.status
                      )}`}
                    >
                      {getStatusText(appointment.status)}
                    </span>
                    {isFuture(new Date(appointment.startTime)) && (
                      <span className="text-xs text-green-600 font-medium">
                        {formatDistanceToNow(new Date(appointment.startTime), {
                          locale: es,
                          addSuffix: true,
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Clinician Info */}
                <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    {appointment.clinician.firstName[0]}
                    {appointment.clinician.lastName[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      Dr. {appointment.clinician.firstName} {appointment.clinician.lastName}
                    </p>
                    <p className="text-xs text-gray-600">
                      {appointment.clinician.specialty || 'Medicina General'}
                    </p>
                  </div>
                </div>

                {/* Type and Description */}
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  <span className="flex items-center gap-1">
                    <span className="text-lg">{getTypeIcon(appointment.type)}</span>
                    {getTypeText(appointment.type)}
                  </span>
                  {appointment.urgency === 'URGENT' && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded">
                      ⚠️ Urgent
                    </span>
                  )}
                </div>

                {appointment.description && (
                  <p className="text-sm text-gray-600 mb-4">{appointment.description}</p>
                )}

                {/* Actions */}
                {['SCHEDULED', 'RESCHEDULED'].includes(appointment.status) &&
                  isFuture(new Date(appointment.startTime)) && (
                    <div className="flex gap-2 pt-4 border-t border-gray-200">
                      <button className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition-colors">
                        Cancel
                      </button>
                      <button className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors">
                        View Details
                      </button>
                    </div>
                  )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
