'use client';

/**
 * Daily View Grid Component
 *
 * Displays appointments in a clean, futuristic table with columns:
 * - Hora (Time)
 * - Paciente (Patient) - with photo and quick info
 * - Doctor (Assigned clinician)
 * - Estado de la Cita (Appointment Status) - interactive dropdown
 * - Situación (Situation Tags) - color-coded, multi-select
 *
 * Features:
 * - Interactive row hover effects
 * - Click to expand appointment details
 * - Real-time status updates
 * - Smooth animations
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Situation {
  id: string;
  name: string;
  color: string;
  icon?: string;
  priority: number;
}

interface Appointment {
  id: string;
  startTime: Date;
  endTime: Date;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl?: string;
    preferredName?: string;
  };
  clinician: {
    id: string;
    firstName: string;
    lastName: string;
    specialty?: string;
  };
  status: string;
  situations: Situation[];
  branch?: string;
  patientNotes?: string;
  waitingRoomCheckedInAt?: Date;
}

interface DailyViewGridProps {
  date: Date;
  appointments: Appointment[];
  onAppointmentClick?: (appointment: Appointment) => void;
  onStatusChange?: (appointmentId: string, newStatus: string) => void;
  onSituationChange?: (appointmentId: string, situations: Situation[]) => void;
}

export function DailyViewGrid({
  date,
  appointments,
  onAppointmentClick,
  onStatusChange,
  onSituationChange,
}: DailyViewGridProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // Sort appointments by start time
  const sortedAppointments = [...appointments].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  );

  // Status display helper
  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; icon: string }> = {
      SCHEDULED: { label: 'Agendado', color: 'text-gray-600 bg-gray-100', icon: '📅' },
      CONFIRMED: { label: 'Confirmado', color: 'text-green-600 bg-green-100', icon: '✅' },
      CHECKED_IN: { label: 'En Sala de Espera', color: 'text-blue-600 bg-blue-100', icon: '🪑' },
      IN_PROGRESS: { label: 'Atendiéndose', color: 'text-purple-600 bg-purple-100', icon: '⚕️' },
      COMPLETED: { label: 'Atendido', color: 'text-teal-600 bg-teal-100', icon: '✓' },
      CANCELLED: { label: 'Cancelado', color: 'text-red-600 bg-red-100', icon: '✗' },
      NO_SHOW: { label: 'No asistió', color: 'text-orange-600 bg-orange-100', icon: '⚠️' },
    };
    return statusMap[status] || statusMap.SCHEDULED;
  };

  return (
    <div className="overflow-hidden">
      {/* Table Header */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-b-2 border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-12 gap-4 px-6 py-4">
          <div className="col-span-1">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Hora
            </h3>
          </div>
          <div className="col-span-3">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Paciente
            </h3>
          </div>
          <div className="col-span-2">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Doctor
            </h3>
          </div>
          <div className="col-span-3">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Estado de la Cita
            </h3>
          </div>
          <div className="col-span-3">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Situación
            </h3>
          </div>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {sortedAppointments.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <span className="text-3xl">📅</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No hay citas programadas
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No hay citas para {format(date, "d 'de' MMMM", { locale: es })}
            </p>
          </div>
        ) : (
          sortedAppointments.map((appointment) => {
            const isExpanded = expandedRow === appointment.id;
            const isHovered = hoveredRow === appointment.id;
            const statusDisplay = getStatusDisplay(appointment.status);

            return (
              <div
                key={appointment.id}
                onMouseEnter={() => setHoveredRow(appointment.id)}
                onMouseLeave={() => setHoveredRow(null)}
                className={`transition-all duration-200 ${
                  isHovered
                    ? 'bg-blue-50 dark:bg-blue-900/10 shadow-md scale-[1.01]'
                    : 'bg-white dark:bg-gray-800'
                }`}
              >
                {/* Main Row */}
                <div
                  className="grid grid-cols-12 gap-4 px-6 py-4 cursor-pointer"
                  onClick={() => {
                    setExpandedRow(isExpanded ? null : appointment.id);
                    onAppointmentClick?.(appointment);
                  }}
                >
                  {/* Hora Column */}
                  <div className="col-span-1 flex flex-col justify-center">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {format(appointment.startTime, 'HH:mm', { locale: es })}
                    </div>
                    {/* Time metadata - low contrast intentional */}
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {format(appointment.endTime, 'HH:mm', { locale: es })}
                    </div>
                  </div>

                  {/* Paciente Column */}
                  <div className="col-span-3 flex items-center space-x-3">
                    {/* Patient Photo */}
                    <div className="flex-shrink-0">
                      {appointment.patient.photoUrl ? (
                        <img
                          src={appointment.patient.photoUrl}
                          alt={`${appointment.patient.firstName} ${appointment.patient.lastName}`}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm ring-2 ring-gray-200 dark:ring-gray-700">
                          {appointment.patient.firstName[0]}{appointment.patient.lastName[0]}
                        </div>
                      )}
                    </div>
                    {/* Patient Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {appointment.patient.firstName} {appointment.patient.lastName}
                      </div>
                      {/* Preferred name metadata - low contrast intentional */}
                      {appointment.patient.preferredName && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          "{appointment.patient.preferredName}"
                        </div>
                      )}
                      {appointment.waitingRoomCheckedInAt && (
                        <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                          ✓ En sala de espera
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Doctor Column */}
                  <div className="col-span-2 flex flex-col justify-center">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Dr(a). {appointment.clinician.lastName}
                    </div>
                    {/* Specialty metadata - low contrast intentional */}
                    {appointment.clinician.specialty && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {appointment.clinician.specialty}
                      </div>
                    )}
                  </div>

                  {/* Estado de la Cita Column */}
                  <div className="col-span-3 flex items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Will trigger StatusDropdown component
                      }}
                      className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md ${statusDisplay.color}`}
                    >
                      <span>{statusDisplay.icon}</span>
                      <span>{statusDisplay.label}</span>
                      <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Situación Column */}
                  <div className="col-span-3 flex items-center">
                    <div className="flex flex-wrap gap-2">
                      {appointment.situations.length === 0 ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Will trigger SituationSelector
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          + Agregar situación
                        </button>
                      ) : (
                        <>
                          {appointment.situations.slice(0, 2).map((situation) => (
                            <span
                              key={situation.id}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-white rounded-full shadow-sm"
                              style={{ backgroundColor: situation.color }}
                            >
                              {situation.icon && <span>{situation.icon}</span>}
                              <span>{situation.name}</span>
                            </span>
                          ))}
                          {appointment.situations.length > 2 && (
                            <span className="inline-flex items-center px-2 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-full">
                              +{appointment.situations.length - 2}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-6 pb-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <div className="grid grid-cols-2 gap-6 pt-4">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Detalles de la Cita
                        </h4>
                        <dl className="space-y-1 text-sm">
                          {appointment.branch && (
                            <div className="flex justify-between">
                              <dt className="text-gray-600 dark:text-gray-400">Sucursal:</dt>
                              <dd className="text-gray-900 dark:text-white font-medium">{appointment.branch}</dd>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <dt className="text-gray-600 dark:text-gray-400">Duración:</dt>
                            <dd className="text-gray-900 dark:text-white font-medium">
                              {Math.round((appointment.endTime.getTime() - appointment.startTime.getTime()) / 60000)} min
                            </dd>
                          </div>
                        </dl>
                      </div>
                      {appointment.patientNotes && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Notas del Paciente
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            {appointment.patientNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
