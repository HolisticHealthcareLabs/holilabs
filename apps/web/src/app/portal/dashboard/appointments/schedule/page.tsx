'use client';

/**
 * Schedule Appointment Page
 * Book appointments with available time slots
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays, startOfWeek, addWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronLeftIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  ChevronRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface TimeSlot {
  time: string;
  available: boolean;
}

interface Clinician {
  id: string;
  name: string;
  specialty: string;
}

export default function ScheduleAppointmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedClinician, setSelectedClinician] = useState<string>('');
  const [appointmentType, setAppointmentType] = useState<'IN_PERSON' | 'TELEHEALTH' | 'PHONE'>('IN_PERSON');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Mock clinicians (replace with API call)
  const clinicians: Clinician[] = [
    { id: '1', name: 'Dr. María González', specialty: 'Medicina General' },
    { id: '2', name: 'Dr. Juan Pérez', specialty: 'Cardiología' },
    { id: '3', name: 'Dra. Ana López', specialty: 'Pediatría' },
  ];

  // Generate next 7 days for date selection
  const availableDates = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  // Mock time slots (replace with API call based on selected date and clinician)
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const hours = [9, 10, 11, 12, 14, 15, 16, 17];

    hours.forEach(hour => {
      slots.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        available: Math.random() > 0.3, // Random availability for demo
      });
      slots.push({
        time: `${hour.toString().padStart(2, '0')}:30`,
        available: Math.random() > 0.3,
      });
    });

    return slots;
  };

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(generateTimeSlots());

  useEffect(() => {
    // Fetch real time slots when date or clinician changes
    if (selectedClinician) {
      fetchAvailableSlots();
    } else {
      setTimeSlots([]);
      setSelectedTime(null);
    }
  }, [selectedDate, selectedClinician]);

  const fetchAvailableSlots = async () => {
    if (!selectedClinician) return;

    try {
      setLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await fetch(
        `/api/portal/appointments/available-slots?clinicianId=${selectedClinician}&date=${dateStr}&type=${appointmentType}`
      );
      const data = await response.json();

      if (data.success && data.data) {
        setTimeSlots(data.data.slots);
      } else {
        setTimeSlots(generateTimeSlots()); // Fallback to mock data
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      setTimeSlots(generateTimeSlots()); // Fallback to mock data
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClinician || !selectedTime || !reason) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    setSubmitting(true);

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      const response = await fetch('/api/portal/appointments/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clinicianId: selectedClinician,
          date: dateStr,
          time: selectedTime,
          type: appointmentType,
          reason,
          notes: notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al agendar cita');
      }

      alert('¡Cita agendada exitosamente!');
      router.push('/portal/dashboard/appointments');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al agendar cita';
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = selectedClinician && selectedDate && selectedTime && reason && !submitting;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/portal/dashboard/appointments')}
            className="flex items-center text-gray-600 hover:text-blue-600 mb-4 transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5 mr-1" />
            Volver a Citas
          </button>

          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Agendar Nueva Cita
          </h1>
          <p className="text-gray-600">
            Selecciona un profesional, fecha y horario disponible
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Clinician Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <UserIcon className="h-5 w-5 inline mr-2" />
              Selecciona un Profesional *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {clinicians.map((clinician) => (
                <button
                  key={clinician.id}
                  type="button"
                  onClick={() => setSelectedClinician(clinician.id)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    selectedClinician === clinician.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <p className="font-semibold text-gray-900">{clinician.name}</p>
                  <p className="text-sm text-gray-600">{clinician.specialty}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Appointment Type */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tipo de Consulta *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setAppointmentType('IN_PERSON')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  appointmentType === 'IN_PERSON'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <p className="font-semibold text-gray-900">Presencial</p>
                <p className="text-sm text-gray-600">En consultorio</p>
              </button>
              <button
                type="button"
                onClick={() => setAppointmentType('TELEHEALTH')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  appointmentType === 'TELEHEALTH'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <p className="font-semibold text-gray-900">Videollamada</p>
                <p className="text-sm text-gray-600">Consulta virtual</p>
              </button>
              <button
                type="button"
                onClick={() => setAppointmentType('PHONE')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  appointmentType === 'PHONE'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <p className="font-semibold text-gray-900">Telefónica</p>
                <p className="text-sm text-gray-600">Por teléfono</p>
              </button>
            </div>
          </div>

          {/* Date Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <CalendarIcon className="h-5 w-5 inline mr-2" />
              Selecciona una Fecha *
            </label>
            <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
              {availableDates.map((date, index) => {
                const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    className={`p-3 border-2 rounded-lg text-center transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <p className="text-xs text-gray-600">
                      {format(date, 'EEE', { locale: es })}
                    </p>
                    <p className={`text-lg font-bold ${isSelected ? 'text-blue-600' : 'text-gray-900'}`}>
                      {format(date, 'd')}
                    </p>
                    <p className="text-xs text-gray-600">
                      {format(date, 'MMM', { locale: es })}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Slot Selection */}
          {selectedClinician && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <ClockIcon className="h-5 w-5 inline mr-2" />
                Selecciona un Horario *
              </label>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {timeSlots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() => slot.available && setSelectedTime(slot.time)}
                    disabled={!slot.available}
                    className={`p-3 border-2 rounded-lg text-center transition-all ${
                      selectedTime === slot.time
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : slot.available
                        ? 'border-gray-200 hover:border-blue-300 text-gray-900'
                        : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo de la Consulta *
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Control de rutina, dolor de cabeza, etc."
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas Adicionales (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Información adicional que quieras compartir..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Summary & Submit */}
          {canSubmit && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 mb-3">Resumen de la Cita</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Profesional:</strong> {clinicians.find(c => c.id === selectedClinician)?.name}</p>
                <p><strong>Tipo:</strong> {appointmentType === 'IN_PERSON' ? 'Presencial' : appointmentType === 'TELEHEALTH' ? 'Videollamada' : 'Telefónica'}</p>
                <p><strong>Fecha:</strong> {format(selectedDate, "d 'de' MMMM, yyyy", { locale: es })}</p>
                <p><strong>Hora:</strong> {selectedTime}</p>
                <p><strong>Motivo:</strong> {reason}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push('/portal/dashboard/appointments')}
              disabled={submitting}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            >
              {submitting ? (
                'Agendando...'
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5" />
                  Confirmar Cita
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
