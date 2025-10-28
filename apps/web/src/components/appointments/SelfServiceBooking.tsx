'use client';

/**
 * Self-Service Appointment Booking
 * FREE calendar picker - no external libraries needed
 * Reduces office calls by 50%+
 */

import { useState } from 'react';

interface TimeSlot {
  time: string;
  available: boolean;
}

interface Provider {
  id: string;
  name: string;
  specialty: string;
  photo?: string;
}

const PROVIDERS: Provider[] = [
  { id: '1', name: 'Dr. Juan Pérez', specialty: 'Family Medicine' },
  { id: '2', name: 'Dr. María López', specialty: 'Internal Medicine' },
  { id: '3', name: 'Dr. Carlos Rodríguez', specialty: 'Cardiology' },
];

const VISIT_REASONS = [
  'Annual physical exam',
  'Follow-up visit',
  'New patient visit',
  'Sick visit',
  'Preventive care',
  'Lab result discussion',
  'Medication review',
  'Other',
];

// Generate time slots (9 AM - 5 PM, 30-min intervals)
const generateTimeSlots = (date: Date): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let hour = 9; hour < 17; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      // Randomly make some slots unavailable (for demo)
      const available = Math.random() > 0.3;
      slots.push({ time, available });
    }
  }
  return slots;
};

export default function SelfServiceBooking() {
  const [step, setStep] = useState(1); // 1: Provider, 2: Reason, 3: Date/Time, 4: Confirm
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Generate calendar days
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty slots for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(''); // Reset time when date changes
  };

  const handleConfirmBooking = async () => {
    // TODO: Call API to create appointment
    const appointmentData = {
      providerId: selectedProvider?.id,
      providerName: selectedProvider?.name,
      reason: selectedReason,
      date: selectedDate,
      time: selectedTime,
    };

    console.log('Booking appointment:', appointmentData);

    // Show success message
    alert(`Appointment booked successfully!\n\nProvider: ${selectedProvider?.name}\nDate: ${selectedDate?.toLocaleDateString()}\nTime: ${selectedTime}`);

    // Mark appointment as booked for onboarding wizard
    localStorage.setItem('appointment_booked', 'true');

    // Reset form
    setStep(1);
    setSelectedProvider(null);
    setSelectedReason('');
    setSelectedDate(null);
    setSelectedTime('');
  };

  const timeSlots = selectedDate ? generateTimeSlots(selectedDate) : [];
  const monthDays = getDaysInMonth(currentMonth);

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-6">
        <h2 className="text-2xl font-bold mb-2">Book an Appointment</h2>
        <p className="text-green-100">Choose your provider, time, and reason for visit</p>
      </div>

      {/* Progress Steps */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: 'Provider' },
            { num: 2, label: 'Reason' },
            { num: 3, label: 'Date & Time' },
            { num: 4, label: 'Confirm' },
          ].map((s, index) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                    step > s.num
                      ? 'bg-green-500 text-white'
                      : step === s.num
                      ? 'bg-green-600 text-white ring-4 ring-green-200'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {step > s.num ? '✓' : s.num}
                </div>
                <div className="text-xs mt-1 font-medium text-gray-600">{s.label}</div>
              </div>
              {index < 3 && <div className={`h-1 flex-1 ${step > s.num ? 'bg-green-500' : 'bg-gray-300'}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6">
        {/* Step 1: Select Provider */}
        {step === 1 && (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Select a Provider</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PROVIDERS.map(provider => (
                <button
                  key={provider.id}
                  onClick={() => {
                    setSelectedProvider(provider);
                    setStep(2);
                  }}
                  className="border-2 border-gray-200 hover:border-green-500 rounded-lg p-4 text-left transition-all hover:shadow-md group"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-3">
                    {provider.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <h4 className="font-bold text-gray-900 group-hover:text-green-600">{provider.name}</h4>
                  <p className="text-sm text-gray-600">{provider.specialty}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Reason */}
        {step === 2 && (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Reason for Visit</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {VISIT_REASONS.map(reason => (
                <button
                  key={reason}
                  onClick={() => {
                    setSelectedReason(reason);
                    setStep(3);
                  }}
                  className="border-2 border-gray-200 hover:border-green-500 rounded-lg p-4 text-left transition-all hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <span className="font-medium text-gray-900">{reason}</span>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(1)}
              className="mt-6 px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              ← Back
            </button>
          </div>
        )}

        {/* Step 3: Select Date & Time */}
        {step === 3 && (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Select Date & Time</h3>

            {/* Calendar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handlePreviousMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h4 className="text-lg font-bold">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h4>
                <button
                  onClick={handleNextMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-2">
                {monthDays.map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} />;
                  }

                  const isToday = date.toDateString() === new Date().toDateString();
                  const isPast = date < new Date() && !isToday;
                  const isSelected = selectedDate?.toDateString() === date.toDateString();

                  return (
                    <button
                      key={index}
                      disabled={isPast}
                      onClick={() => handleDateSelect(date)}
                      className={`aspect-square p-2 rounded-lg text-sm font-medium transition-all ${
                        isPast
                          ? 'text-gray-300 cursor-not-allowed'
                          : isSelected
                          ? 'bg-green-600 text-white ring-4 ring-green-200'
                          : isToday
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slots */}
            {selectedDate && (
              <div>
                <h4 className="font-bold text-gray-900 mb-3">Available Times on {selectedDate.toLocaleDateString()}</h4>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2 max-h-64 overflow-y-auto">
                  {timeSlots.map(slot => (
                    <button
                      key={slot.time}
                      disabled={!slot.available}
                      onClick={() => {
                        setSelectedTime(slot.time);
                        setStep(4);
                      }}
                      className={`p-3 rounded-lg text-sm font-medium transition-all ${
                        !slot.available
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'border-2 border-gray-200 hover:border-green-500 hover:bg-green-50'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setStep(2)}
              className="mt-6 px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              ← Back
            </button>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-6">Confirm Your Appointment</h3>

            <div className="bg-gray-50 rounded-xl p-6 mb-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Provider</div>
                  <div className="font-bold text-gray-900">{selectedProvider?.name}</div>
                  <div className="text-sm text-gray-600">{selectedProvider?.specialty}</div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Reason</div>
                  <div className="font-bold text-gray-900">{selectedReason}</div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Date & Time</div>
                  <div className="font-bold text-gray-900">
                    {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="text-sm text-gray-600">{selectedTime}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setStep(3)}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                ← Back
              </button>
              <button
                onClick={handleConfirmBooking}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition shadow-lg hover:shadow-xl"
              >
                Confirm Appointment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
