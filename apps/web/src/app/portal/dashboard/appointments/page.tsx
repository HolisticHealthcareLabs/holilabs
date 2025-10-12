'use client';

/**
 * Appointments Page
 * Displays patient's appointments with upcoming and past sections
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  ChevronLeftIcon,
  VideoCameraIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

interface Appointment {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  type: 'IN_PERSON' | 'TELEHEALTH' | 'PHONE';
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_PROGRESS';
  clinician: {
    id: string;
    firstName: string;
    lastName: string;
    specialty: string | null;
  };
}

interface AppointmentsResponse {
  success: boolean;
  data?: {
    appointments: Appointment[];
    summary: {
      total: number;
      upcoming: number;
      past: number;
    };
    upcomingAppointments: Appointment[];
    pastAppointments: Appointment[];
  };
  error?: string;
}

const statusColors = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  CHECKED_IN: 'bg-purple-100 text-purple-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-orange-100 text-orange-800',
};

const statusLabels = {
  SCHEDULED: 'Programada',
  CONFIRMED: 'Confirmada',
  CHECKED_IN: 'En recepción',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
};

const typeIcons = {
  IN_PERSON: BuildingOfficeIcon,
  TELEHEALTH: VideoCameraIcon,
  PHONE: PhoneIcon,
};

const typeLabels = {
  IN_PERSON: 'Presencial',
  TELEHEALTH: 'Virtual',
  PHONE: 'Telefónica',
};

const typeColors = {
  IN_PERSON: 'text-blue-600 bg-blue-100',
  TELEHEALTH: 'text-purple-600 bg-purple-100',
  PHONE: 'text-green-600 bg-green-100',
};

export default function AppointmentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [pastAppointments, setPastAppointments] = useState<Appointment[]>([]);
  const [summary, setSummary] = useState({ total: 0, upcoming: 0, past: 0 });
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/portal/appointments');
      const data: AppointmentsResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar citas');
      }

      if (data.success && data.data) {
        setUpcomingAppointments(data.data.upcomingAppointments);
        setPastAppointments(data.data.pastAppointments);
        setSummary(data.data.summary);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAppointmentClick = (appointmentId: string) => {
    router.push(`/portal/dashboard/appointments/${appointmentId}`);
  };

  const handleNewAppointment = () => {
    router.push('/portal/dashboard/appointments/new');
  };

  const getTimeUntil = (startTime: string) => {
    const now = new Date();
    const start = new Date(startTime);
    const diffMs = start.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffDays > 7) {
      return format(start, "d 'de' MMMM", { locale: es });
    } else if (diffDays > 0) {
      return `En ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `En ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
    } else if (diffMs > 0) {
      return 'Hoy';
    }
    return 'Pasada';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/portal/dashboard')}
            className="flex items-center text-gray-600 hover:text-blue-600 mb-4 transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5 mr-1" />
            Volver al Dashboard
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                =Å Mis Citas
              </h1>
              <p className="text-gray-600">
                {summary.upcoming} cita{summary.upcoming !== 1 ? 's' : ''} próxima
                {summary.upcoming !== 1 ? 's' : ''} · {summary.past} pasada{summary.past !== 1 ? 's' : ''}
              </p>
            </div>

            <button
              onClick={handleNewAppointment}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              <PlusIcon className="h-5 w-5" />
              Nueva Cita
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-6">
            <p className="text-red-800 mb-4">{error}</p>
            <button
              onClick={fetchAppointments}
              className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Upcoming Appointments */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Próximas Citas
          </h2>

          {upcomingAppointments.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No tienes citas próximas
              </h3>
              <p className="text-gray-600 mb-6">
                Agenda tu próxima cita con tu médico
              </p>
              <button
                onClick={handleNewAppointment}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="h-5 w-5" />
                Agendar Cita
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingAppointments.map((appointment) => {
                const TypeIcon = typeIcons[appointment.type];
                return (
                  <div
                    key={appointment.id}
                    onClick={() => handleAppointmentClick(appointment.id)}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${typeColors[appointment.type]}`}>
                          <TypeIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {appointment.title}
                          </h3>
                          <span className="text-sm text-gray-600">
                            {typeLabels[appointment.type]}
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-blue-600">
                        {getTimeUntil(appointment.startTime)}
                      </span>
                    </div>

                    {/* Date and Time */}
                    <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4" />
                        <span>
                          {format(new Date(appointment.startTime), "EEEE, d 'de' MMMM", {
                            locale: es,
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        <span>
                          {format(new Date(appointment.startTime), 'HH:mm', { locale: es })}
                        </span>
                      </div>
                    </div>

                    {/* Clinician */}
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                      <UserIcon className="h-4 w-4" />
                      <span>
                        Dr. {appointment.clinician.firstName} {appointment.clinician.lastName}
                        {appointment.clinician.specialty && ` - ${appointment.clinician.specialty}`}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          statusColors[appointment.status]
                        }`}
                      >
                        {statusLabels[appointment.status]}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Past Appointments */}
        {pastAppointments.length > 0 && (
          <div>
            <button
              onClick={() => setShowPast(!showPast)}
              className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-4 hover:text-blue-600 transition-colors"
            >
              <span>Citas Anteriores ({pastAppointments.length})</span>
              <svg
                className={`h-5 w-5 transition-transform ${showPast ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {showPast && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pastAppointments.map((appointment) => {
                  const TypeIcon = typeIcons[appointment.type];
                  return (
                    <div
                      key={appointment.id}
                      onClick={() => handleAppointmentClick(appointment.id)}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group opacity-75 hover:opacity-100"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <TypeIcon className="h-6 w-6 text-gray-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {appointment.title}
                            </h3>
                            <span className="text-sm text-gray-600">
                              {typeLabels[appointment.type]}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Date and Time */}
                      <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" />
                          <span>
                            {format(new Date(appointment.startTime), "d 'de' MMMM, yyyy", {
                              locale: es,
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ClockIcon className="h-4 w-4" />
                          <span>
                            {format(new Date(appointment.startTime), 'HH:mm', { locale: es })}
                          </span>
                        </div>
                      </div>

                      {/* Clinician */}
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                        <UserIcon className="h-4 w-4" />
                        <span>
                          Dr. {appointment.clinician.firstName} {appointment.clinician.lastName}
                        </span>
                      </div>

                      {/* Status Badge */}
                      <div>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            statusColors[appointment.status]
                          }`}
                        >
                          {statusLabels[appointment.status]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
