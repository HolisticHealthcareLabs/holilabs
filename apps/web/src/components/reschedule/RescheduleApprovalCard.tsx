'use client';

/**
 * Reschedule Approval Card Component
 * Shows pending reschedule requests with approve/deny/counter-propose actions
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CalendarIcon,
  UserIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

interface RescheduleApprovalCardProps {
  appointment: {
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
    rescheduleNewTime: Date | null;
    rescheduleReason: string | null;
    rescheduleRequestedAt: Date | null;
    patient: {
      firstName: string;
      lastName: string;
      phone: string | null;
      email: string | null;
    };
    clinician: {
      firstName: string;
      lastName: string;
    };
  };
  onApprove: (appointmentId: string) => Promise<void>;
  onDeny: (appointmentId: string, reason: string) => Promise<void>;
  onCounterPropose?: (appointmentId: string, newTime: Date) => Promise<void>;
}

export function RescheduleApprovalCard({
  appointment,
  onApprove,
  onDeny,
  onCounterPropose,
}: RescheduleApprovalCardProps) {
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [showCounterProposeModal, setShowCounterProposeModal] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const [counterProposeDate, setCounterProposeDate] = useState('');
  const [counterProposeTime, setCounterProposeTime] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleApprove = async () => {
    if (!confirm('¿Aprobar esta solicitud de reagendamiento?')) return;

    try {
      setProcessing(true);
      await onApprove(appointment.id);
    } catch (error) {
      console.error('Error approving reschedule:', error);
      alert('Error al aprobar reagendamiento');
    } finally {
      setProcessing(false);
    }
  };

  const handleDenySubmit = async () => {
    if (!denyReason.trim()) {
      alert('Por favor ingresa una razón para negar el reagendamiento');
      return;
    }

    try {
      setProcessing(true);
      await onDeny(appointment.id, denyReason);
      setShowDenyModal(false);
      setDenyReason('');
    } catch (error) {
      console.error('Error denying reschedule:', error);
      alert('Error al negar reagendamiento');
    } finally {
      setProcessing(false);
    }
  };

  const handleCounterProposeSubmit = async () => {
    if (!counterProposeDate || !counterProposeTime) {
      alert('Por favor selecciona una fecha y hora');
      return;
    }

    if (!onCounterPropose) return;

    try {
      setProcessing(true);
      const newTime = new Date(`${counterProposeDate}T${counterProposeTime}`);
      await onCounterPropose(appointment.id, newTime);
      setShowCounterProposeModal(false);
      setCounterProposeDate('');
      setCounterProposeTime('');
    } catch (error) {
      console.error('Error counter-proposing:', error);
      alert('Error al proponer nueva fecha');
    } finally {
      setProcessing(false);
    }
  };

  const originalDate = format(appointment.startTime, "EEEE, d 'de' MMMM", { locale: es });
  const originalTime = format(appointment.startTime, 'HH:mm', { locale: es });

  const newDate = appointment.rescheduleNewTime
    ? format(appointment.rescheduleNewTime, "EEEE, d 'de' MMMM", { locale: es })
    : '';
  const newTime = appointment.rescheduleNewTime
    ? format(appointment.rescheduleNewTime, 'HH:mm', { locale: es })
    : '';

  return (
    <>
      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-xl overflow-hidden shadow-lg">
        {/* Alert Header */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 px-4 py-3 flex items-center space-x-2">
          <ClockIcon className="h-5 w-5 text-white animate-pulse" />
          <span className="text-white font-bold text-sm uppercase tracking-wide">
            Solicitud de Reagendamiento Pendiente
          </span>
        </div>

        <div className="p-6 space-y-4">
          {/* Patient Info */}
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {appointment.patient.firstName[0]}{appointment.patient.lastName[0]}
            </div>
            <div className="flex-1">
              <div className="font-bold text-gray-900 dark:text-white">
                {appointment.patient.firstName} {appointment.patient.lastName}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {appointment.patient.phone || appointment.patient.email}
              </div>
            </div>
          </div>

          {/* Time Comparison */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            {/* Original Time */}
            <div className="flex items-center space-x-3 mb-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <XCircleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Fecha Original
                </div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {originalDate}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {originalTime} - Dr. {appointment.clinician.firstName} {appointment.clinician.lastName}
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center my-2">
              <ArrowRightIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>

            {/* New Time */}
            <div className="flex items-center space-x-3 mt-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <CalendarIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                  Nueva Fecha Propuesta
                </div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {newDate}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {newTime}
                </div>
              </div>
            </div>
          </div>

          {/* Reason */}
          {appointment.rescheduleReason && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                Razón del paciente:
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 italic">
                "{appointment.rescheduleReason}"
              </div>
            </div>
          )}

          {/* Request Time */}
          {appointment.rescheduleRequestedAt && (
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Solicitado {format(appointment.rescheduleRequestedAt, "d 'de' MMM 'a las' HH:mm", { locale: es })}
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleApprove}
              disabled={processing}
              className="px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all font-semibold flex items-center justify-center space-x-2 disabled:opacity-50 disabled:transform-none"
            >
              <CheckCircleIcon className="h-5 w-5" />
              <span>Aprobar</span>
            </button>

            <button
              onClick={() => setShowDenyModal(true)}
              disabled={processing}
              className="px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all font-semibold flex items-center justify-center space-x-2 disabled:opacity-50 disabled:transform-none"
            >
              <XCircleIcon className="h-5 w-5" />
              <span>Negar</span>
            </button>
          </div>

          {/* Counter Propose (Optional) */}
          {onCounterPropose && (
            <button
              onClick={() => setShowCounterProposeModal(true)}
              disabled={processing}
              className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm disabled:opacity-50"
            >
              📅 Proponer Otra Fecha
            </button>
          )}
        </div>
      </div>

      {/* Deny Modal */}
      {showDenyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <XCircleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Negar Reagendamiento
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Por favor explica la razón
                </p>
              </div>
            </div>

            <textarea
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              placeholder="Ej: Lo siento, no hay disponibilidad en esa fecha..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
              autoFocus
            />

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDenyModal(false);
                  setDenyReason('');
                }}
                disabled={processing}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDenySubmit}
                disabled={processing || !denyReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {processing ? 'Negando...' : 'Negar y Notificar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Counter Propose Modal */}
      {showCounterProposeModal && onCounterPropose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <CalendarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Proponer Otra Fecha
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Sugiere una fecha alternativa
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fecha
                </label>
                <input
                  type="date"
                  value={counterProposeDate}
                  onChange={(e) => setCounterProposeDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Hora
                </label>
                <input
                  type="time"
                  value={counterProposeTime}
                  onChange={(e) => setCounterProposeTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowCounterProposeModal(false);
                  setCounterProposeDate('');
                  setCounterProposeTime('');
                }}
                disabled={processing}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCounterProposeSubmit}
                disabled={processing || !counterProposeDate || !counterProposeTime}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {processing ? 'Enviando...' : 'Proponer y Notificar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
