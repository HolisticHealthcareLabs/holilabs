/**
 * Appointment Confirmation Landing Page
 * Clean, gradient-based UI with card sections
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import confetti from 'canvas-confetti';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CalendarIcon,
  MapPinIcon,
  UserIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';

interface Appointment {
  id: string;
  patientName: string;
  clinicianName: string;
  clinicianSpecialty?: string;
  date: string;
  time: string;
  dateTime: string;
  type: string;
  status: string;
  confirmationStatus: string;
  description?: string;
  branch?: string;
  branchAddress?: string;
  branchMapLink?: string;
}

type ActionType = 'confirm' | 'reschedule' | 'cancel';

export default function ConfirmAppointmentPage() {
  const params = useParams();
  const token = (params?.token as string) || '';

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionComplete, setActionComplete] = useState(false);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [patientNotes, setPatientNotes] = useState('');

  useEffect(() => {
    fetchAppointment();
  }, [token]);

  const fetchAppointment = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/appointments/confirm/${token}`);
      const data = await response.json();

      if (!data.success) {
        setError(data.error);
        return;
      }

      setAppointment(data.data.appointment);
    } catch (err) {
      setError('Error al cargar la cita');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async () => {
    try {
      const response = await fetch(
        `/api/appointments/confirm/${token}/available-slots`
      );
      const data = await response.json();

      if (data.success) {
        setAvailableSlots(data.data.slots.map((s: any) => s.time));
      }
    } catch (err) {
      console.error('Error fetching slots:', err);
    }
  };

  // Trigger confetti animation
  const celebrate = () => {
    // Fire confetti from both sides
    const end = Date.now() + 3 * 1000; // 3 seconds
    const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B'];

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  const handleAction = async (action: ActionType) => {
    if (action === 'reschedule' && !selectedSlot) {
      alert('Por favor selecciona una nueva fecha y hora');
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`/api/appointments/confirm/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          newTime: action === 'reschedule' ? selectedSlot : undefined,
          reason: action === 'cancel' ? cancelReason : undefined,
          patientNotes: action === 'confirm' ? patientNotes : undefined,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        alert(data.error);
        return;
      }

      setActionType(action);
      setActionComplete(true);

      // Trigger confetti on successful confirmation
      if (action === 'confirm') {
        celebrate();
      }
    } catch (err) {
      alert('Error al procesar la solicitud');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl p-8 border border-white/20">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 font-medium">Cargando tu cita...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
        <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl p-8 max-w-md w-full border border-white/20">
          <div className="flex flex-col items-center space-y-4">
            <XCircleIcon className="h-16 w-16 text-red-500" />
            <h2 className="text-2xl font-bold text-gray-900">Oops...</h2>
            <p className="text-gray-600 text-center">
              {error || 'No se pudo encontrar la cita'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (actionComplete) {
    const messages = {
      confirm: {
        icon: <CheckCircleIcon className="h-20 w-20 text-green-500" />,
        title: '¡Cita Confirmada!',
        message: 'Tu asistencia ha sido confirmada exitosamente.',
        gradient: 'from-green-50 via-emerald-50 to-teal-50',
      },
      cancel: {
        icon: <XCircleIcon className="h-20 w-20 text-orange-500" />,
        title: 'Cita Cancelada',
        message: 'Tu cita ha sido cancelada. El médico ha sido notificado.',
        gradient: 'from-orange-50 via-amber-50 to-yellow-50',
      },
      reschedule: {
        icon: <ClockIcon className="h-20 w-20 text-blue-500" />,
        title: 'Solicitud Enviada',
        message:
          'Tu solicitud de reagendamiento ha sido enviada al médico para aprobación.',
        gradient: 'from-blue-50 via-indigo-50 to-purple-50',
      },
    };

    const config = messages[actionType!];

    return (
      <div
        className={`min-h-screen bg-gradient-to-br ${config.gradient} flex items-center justify-center p-4`}
      >
        <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl p-12 max-w-md w-full border border-white/20">
          <div className="flex flex-col items-center space-y-6 text-center">
            {config.icon}
            <h2 className="text-3xl font-bold text-gray-900">{config.title}</h2>
            <p className="text-lg text-gray-600">{config.message}</p>
            <div className="pt-4">
              <p className="text-sm text-gray-500">
                Puedes cerrar esta ventana ahora
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Card */}
        <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl p-8 border border-white/20">
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Holi Labs
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Confirmación de Cita Médica
            </p>
          </div>
        </div>

        {/* Appointment Details Card */}
        <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Detalles de tu Cita
          </h2>

          <div className="space-y-4">
            {/* Patient */}
            <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl">
              <UserIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-500">Paciente</p>
                <p className="text-lg font-semibold text-gray-900">
                  {appointment.patientName}
                </p>
              </div>
            </div>

            {/* Clinician */}
            <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl">
              <UserIcon className="h-6 w-6 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-500">Médico</p>
                <p className="text-lg font-semibold text-gray-900">
                  {appointment.clinicianName}
                </p>
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-pink-50 to-orange-50 rounded-2xl">
              <CalendarIcon className="h-6 w-6 text-pink-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-500">Fecha y Hora</p>
                <p className="text-lg font-semibold text-gray-900">
                  {appointment.date}
                </p>
                <p className="text-md text-gray-700">{appointment.time}</p>
              </div>
            </div>

            {/* Type */}
            <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl">
              <PhoneIcon className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-500">Tipo de Consulta</p>
                <p className="text-lg font-semibold text-gray-900">
                  {appointment.type === 'IN_PERSON'
                    ? 'Presencial'
                    : appointment.type === 'TELEHEALTH'
                    ? 'Videollamada'
                    : 'Telefónica'}
                </p>
              </div>
            </div>

            {/* Branch/Location */}
            {appointment.branch && (
              <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl">
                <MapPinIcon className="h-6 w-6 text-teal-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Sucursal</p>
                  <p className="text-lg font-semibold text-gray-900 mb-1">
                    {appointment.branch}
                  </p>
                  {appointment.branchAddress && (
                    <>
                      <p className="text-sm text-gray-600 mb-2">
                        {appointment.branchAddress}
                      </p>
                      {appointment.branchMapLink && (
                        <a
                          href={appointment.branchMapLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 text-sm font-medium text-teal-600 hover:text-teal-700 hover:underline"
                        >
                          <MapPinIcon className="h-4 w-4" />
                          <span>Ver en Google Maps</span>
                        </a>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Patient Notes Section */}
        {!showReschedule && !showCancel && (
          <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl p-8 border border-white/20">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              ¿Tienes alguna nota para el doctor?
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Puedes compartir información relevante que el doctor deba saber antes de la consulta (opcional)
            </p>
            <textarea
              value={patientNotes}
              onChange={(e) => setPatientNotes(e.target.value)}
              placeholder="Ej: Síntomas recientes, medicamentos que tomo, alergias, etc..."
              className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring focus:ring-blue-200 transition resize-none text-gray-900"
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-2 text-right">
              {patientNotes.length}/500 caracteres
            </p>
          </div>
        )}

        {/* Actions Card */}
        {!showReschedule && !showCancel && (
          <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl p-8 border border-white/20">
            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
              ¿Qué deseas hacer?
            </h2>

            <div className="space-y-4">
              {/* Confirm Button */}
              <button
                onClick={() => handleAction('confirm')}
                disabled={actionLoading}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
              >
                <CheckCircleIcon className="h-6 w-6" />
                <span className="text-lg">Confirmar mi Asistencia</span>
              </button>

              {/* Reschedule Button */}
              <button
                onClick={() => {
                  setShowReschedule(true);
                  fetchAvailableSlots();
                }}
                disabled={actionLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
              >
                <ClockIcon className="h-6 w-6" />
                <span className="text-lg">Reagendar para Otro Día</span>
              </button>

              {/* Cancel Button */}
              <button
                onClick={() => setShowCancel(true)}
                disabled={actionLoading}
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg transform transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
              >
                <XCircleIcon className="h-6 w-6" />
                <span className="text-lg">Cancelar mi Cita</span>
              </button>
            </div>
          </div>
        )}

        {/* Reschedule Flow */}
        {showReschedule && (
          <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl p-8 border border-white/20">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Selecciona Nueva Fecha y Hora
            </h2>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {availableSlots.length === 0 ? (
                <p className="text-gray-600 text-center py-8">
                  Cargando horarios disponibles...
                </p>
              ) : (
                availableSlots.map((slot) => {
                  const date = parseISO(slot);
                  return (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={`w-full p-4 rounded-2xl border-2 transition ${
                        selectedSlot === slot
                          ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50'
                          : 'border-gray-200 hover:border-blue-300 bg-white'
                      }`}
                    >
                      <p className="font-semibold text-gray-900">
                        {format(date, "EEEE, d 'de' MMMM", { locale: es })}
                      </p>
                      <p className="text-gray-600">{format(date, 'HH:mm')}</p>
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-6 flex space-x-4">
              <button
                onClick={() => setShowReschedule(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-2xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleAction('reschedule')}
                disabled={!selectedSlot || actionLoading}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-2xl transition disabled:opacity-50"
              >
                {actionLoading ? 'Enviando...' : 'Solicitar Cambio'}
              </button>
            </div>
          </div>
        )}

        {/* Cancel Flow */}
        {showCancel && (
          <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl p-8 border border-white/20">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              ¿Por qué deseas cancelar? (Opcional)
            </h2>

            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Escribe el motivo de la cancelación..."
              className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring focus:ring-blue-200 transition resize-none"
              rows={4}
            />

            <div className="mt-6 flex space-x-4">
              <button
                onClick={() => setShowCancel(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-2xl transition"
              >
                Volver
              </button>
              <button
                onClick={() => handleAction('cancel')}
                disabled={actionLoading}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-3 px-6 rounded-2xl transition disabled:opacity-50"
              >
                {actionLoading ? 'Cancelando...' : 'Confirmar Cancelación'}
              </button>
            </div>
          </div>
        )}

        {/* Help Card */}
        <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl p-6 border border-white/20">
          <p className="text-center text-sm text-gray-600">
            💬 ¿Necesitas ayuda? Contacta al consultorio directamente
          </p>
        </div>
      </div>
    </div>
  );
}
