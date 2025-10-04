'use client';

import { useState } from 'react';

type IntegrationState = 'not_integrated' | 'single_calendar' | 'multiple_calendars';

interface Calendar {
  id: string;
  name: string;
  provider: 'google' | 'outlook';
}

interface SchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SchedulingModal({ isOpen, onClose }: SchedulingModalProps) {
  const [integrationState, setIntegrationState] = useState<IntegrationState>('not_integrated');
  const [availableCalendars, setAvailableCalendars] = useState<Calendar[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');

  const handleConnectGoogle = async () => {
    // Simulate OAuth flow
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulate receiving multiple calendars
    const calendars: Calendar[] = [
      { id: 'cal1', name: 'Consultorio Principal', provider: 'google' },
      { id: 'cal2', name: 'Clínica Secundaria', provider: 'google' },
      { id: 'cal3', name: 'Personal', provider: 'google' },
    ];

    setAvailableCalendars(calendars);
    setIntegrationState('multiple_calendars');
    setSelectedCalendar(calendars[0].id);
  };

  const handleConnectOutlook = async () => {
    // Simulate OAuth flow
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulate receiving single calendar
    const calendars: Calendar[] = [
      { id: 'cal1', name: 'Calendario Clínico', provider: 'outlook' },
    ];

    setAvailableCalendars(calendars);
    setIntegrationState('single_calendar');
    setSelectedCalendar(calendars[0].id);
  };

  const handleScheduleAppointment = () => {
    alert(`✅ Cita agendada para ${selectedDate?.toLocaleDateString()} a las ${selectedTime}`);
    onClose();
  };

  // Generate mock availability slots
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour < 18; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        const isBusy = Math.random() > 0.6; // Simulate busy slots from external calendar
        slots.push({ time, isBusy });
      }
    }
    return slots;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Agendar Cita</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {/* State 1: Not Integrated */}
            {integrationState === 'not_integrated' && (
              <div className="text-center py-12">
                <div className="text-6xl mb-6">📅</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                  Optimice su agenda
                </h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Conecte su calendario para ver la disponibilidad en tiempo real y evitar conflictos de horarios.
                </p>

                <div className="flex justify-center space-x-4">
                  <button
                    onClick={handleConnectGoogle}
                    className="px-8 py-4 bg-white border-2 border-gray-300 rounded-lg hover:border-primary hover:shadow-lg transition font-semibold flex items-center space-x-3"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span>Conectar Google Calendar</span>
                  </button>

                  <button
                    onClick={handleConnectOutlook}
                    className="px-8 py-4 bg-white border-2 border-gray-300 rounded-lg hover:border-primary hover:shadow-lg transition font-semibold flex items-center space-x-3"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path
                        fill="#0078D4"
                        d="M23 5.5V18c0 .83-.17 1.5-1 1.5h-7v-15h7c.83 0 1 .67 1 1.5zm-10 0V19.5h-11c-.83 0-1-.67-1-1.5V5.5c0-.83.17-1.5 1-1.5h11z"
                      />
                    </svg>
                    <span>Conectar Outlook Calendar</span>
                  </button>
                </div>
              </div>
            )}

            {/* State 2 & 3: Integrated Calendar View */}
            {(integrationState === 'single_calendar' || integrationState === 'multiple_calendars') && (
              <div>
                {/* Calendar Selector (only for multiple calendars) */}
                {integrationState === 'multiple_calendars' && (
                  <div className="mb-6">
                    <label className="block font-semibold text-gray-700 mb-2">
                      Seleccionar Calendario Primario
                    </label>
                    <select
                      value={selectedCalendar}
                      onChange={(e) => setSelectedCalendar(e.target.value)}
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      {availableCalendars.map((cal) => (
                        <option key={cal.id} value={cal.id}>
                          {cal.name} ({cal.provider})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Integrated Calendar View */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Date Selector */}
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-3">Seleccionar Fecha</h3>
                    <div className="border-2 border-gray-200 rounded-lg p-4">
                      <input
                        type="date"
                        onChange={(e) => setSelectedDate(new Date(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>

                  {/* Time Slots */}
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-3">Horarios Disponibles</h3>
                    <div className="border-2 border-gray-200 rounded-lg p-4 max-h-80 overflow-y-auto">
                      {selectedDate ? (
                        <div className="grid grid-cols-3 gap-2">
                          {generateTimeSlots().map((slot, i) => (
                            <button
                              key={i}
                              disabled={slot.isBusy}
                              onClick={() => setSelectedTime(slot.time)}
                              className={`p-2 rounded-lg text-sm font-medium transition ${
                                slot.isBusy
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : selectedTime === slot.time
                                  ? 'bg-primary text-white'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                            >
                              {slot.time}
                              {slot.isBusy && (
                                <div className="text-xs">Ocupado</div>
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-8">
                          Seleccione una fecha para ver horarios disponibles
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                    <span className="text-gray-600">Disponible (Holi Labs)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
                    <span className="text-gray-600">Ocupado (Calendario externo)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-primary rounded"></div>
                    <span className="text-gray-600">Seleccionado</span>
                  </div>
                </div>

                {/* Schedule Button */}
                <button
                  onClick={handleScheduleAppointment}
                  disabled={!selectedDate || !selectedTime}
                  className="w-full mt-6 py-4 bg-primary text-white rounded-lg font-semibold text-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Agendar Cita
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
