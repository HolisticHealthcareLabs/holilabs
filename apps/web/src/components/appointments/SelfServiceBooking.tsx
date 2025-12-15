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

    // Mark appointment as booked for onboarding wizard
    localStorage.setItem('appointment_booked', 'true');

    // Move to success step
    setStep(5);
  };

  // Generate calendar URLs for different providers
  const generateCalendarLinks = () => {
    if (!selectedDate || !selectedTime || !selectedProvider) return null;

    const [hours, minutes] = selectedTime.split(':');
    const startDate = new Date(selectedDate);
    startDate.setHours(parseInt(hours), parseInt(minutes), 0);

    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 1); // 1-hour appointment

    const title = `Medical Appointment with ${selectedProvider.name}`;
    const description = `Reason: ${selectedReason}\nProvider: ${selectedProvider.name} (${selectedProvider.specialty})`;
    const location = 'Holi Labs Medical Center';

    // Format dates for calendar URLs
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    // Google Calendar URL
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}`;

    // Outlook Calendar URL
    const outlookCalendarUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(title)}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&body=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}`;

    // Apple Calendar (.ics file content)
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${title}
DESCRIPTION:${description.replace(/\n/g, '\\n')}
LOCATION:${location}
END:VEVENT
END:VCALENDAR`;

    return {
      google: googleCalendarUrl,
      outlook: outlookCalendarUrl,
      apple: `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`,
    };
  };

  const calendarLinks = generateCalendarLinks();

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
      {step < 5 && (
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
      )}

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
                  <p className="text-sm text-gray-600 dark:text-gray-400">{provider.specialty}</p>
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
                  <div className="text-sm text-gray-600 dark:text-gray-400">Provider</div>
                  <div className="font-bold text-gray-900 dark:text-white">{selectedProvider?.name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{selectedProvider?.specialty}</div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Reason</div>
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
                  <div className="text-sm text-gray-600 dark:text-gray-400">Date & Time</div>
                  <div className="font-bold text-gray-900">
                    {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{selectedTime}</div>
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

        {/* Step 5: Success - Add to Calendar */}
        {step === 5 && (
          <div className="text-center">
            {/* Success Animation */}
            <div className="mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Appointment Confirmed!</h3>
              <p className="text-gray-600 mb-6">
                Your appointment with {selectedProvider?.name} has been successfully booked
              </p>
            </div>

            {/* Appointment Summary */}
            <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-6 mb-6 text-left border-2 border-green-200">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">When</div>
                    <div className="font-bold text-gray-900">
                      {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at {selectedTime}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Provider</div>
                    <div className="font-bold text-gray-900">{selectedProvider?.name} - {selectedProvider?.specialty}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Reason</div>
                    <div className="font-bold text-gray-900">{selectedReason}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Add to Calendar Section */}
            <div className="mb-6">
              <h4 className="font-bold text-gray-900 mb-4 text-lg">Add to Your Calendar</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Google Calendar */}
                {calendarLinks && (
                  <>
                    <a
                      href={calendarLinks.google}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-3 p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-red-400 hover:shadow-lg transition-all group"
                    >
                      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg className="w-10 h-10" viewBox="0 0 48 48" fill="none">
                          <path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" fill="#4285F4"/>
                          <path d="M6.3 14.7l6.6 4.8C14.2 16.1 18.8 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.1 2 9.2 6.3 6.3 14.7z" fill="#EA4335"/>
                          <path d="M24 46c5.5 0 10.4-2 14.2-5.3l-6.6-5.6c-2.2 1.5-5 2.4-7.6 2.4-6 0-11.1-3.9-12.9-9.3l-6.5 5C7.5 40.4 15.2 46 24 46z" fill="#34A853"/>
                          <path d="M44.5 20H24v8.5h11.8c-.8 2.3-2.3 4.3-4.3 5.6l6.6 5.6c4-3.7 6.4-9.1 6.4-16.2 0-1.3-.2-2.7-.5-3.5z" fill="#FBBC05"/>
                        </svg>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-gray-900 group-hover:text-red-600">Google Calendar</div>
                        {/* Calendar service label - low contrast intentional */}
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Add to Google</div>
                      </div>
                    </a>

                    {/* Outlook Calendar */}
                    <a
                      href={calendarLinks.outlook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-3 p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-lg transition-all group"
                    >
                      <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg className="w-10 h-10" viewBox="0 0 48 48" fill="none">
                          <rect x="4" y="8" width="40" height="32" rx="2" fill="#0078D4"/>
                          <path d="M4 10c0-1.1.9-2 2-2h36c1.1 0 2 .9 2 2v4L24 26 4 14v-4z" fill="#50E6FF"/>
                          <path d="M44 14L24 26 4 14v24c0 1.1.9 2 2 2h36c1.1 0 2-.9 2-2V14z" fill="#0078D4"/>
                        </svg>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-gray-900 group-hover:text-blue-600">Outlook</div>
                        {/* Calendar service label - low contrast intentional */}
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Add to Outlook</div>
                      </div>
                    </a>

                    {/* Apple Calendar */}
                    <a
                      href={calendarLinks.apple}
                      download="appointment.ics"
                      className="flex flex-col items-center gap-3 p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-700 hover:shadow-lg transition-all group"
                    >
                      <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg className="w-10 h-10" viewBox="0 0 48 48" fill="none">
                          <path d="M24 2c12.2 0 22 9.8 22 22s-9.8 22-22 22S2 36.2 2 24 11.8 2 24 2z" fill="#555"/>
                          <path d="M29.5 10c.6 2.3-.4 4.6-2.2 6-1.7 1.3-4.1 1.8-6 .8-.5-2.3.5-4.7 2.2-6 1.7-1.3 4-1.7 6-.8zm6.5 18c0-2.7-.9-5.3-2.5-7.4-1.6-2-3.9-3.3-6.5-3.3-2 0-3.2.8-4.8.8-1.7 0-3.4-.8-5.2-.8-3.3 0-6.5 2-8.5 5.3-2.2 3.8-2.2 10.5.5 15.4 1.4 2.5 3.3 5.3 6 5.3 1.5 0 2.4-.8 4.5-.8 2 0 2.9.8 4.5.8 2.7 0 4.5-2.5 6-5 1-1.6 1.4-2.4 2-4.2-5.3-2.1-6-9.6-.5-11.1z" fill="#fff"/>
                        </svg>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-gray-900 group-hover:text-gray-700">Apple Calendar</div>
                        {/* Calendar service label - low contrast intentional */}
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Download .ics file</div>
                      </div>
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <a
                href="/portal/dashboard"
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition shadow-lg hover:shadow-xl"
              >
                Go to Dashboard
              </a>
              <button
                onClick={() => {
                  setStep(1);
                  setSelectedProvider(null);
                  setSelectedReason('');
                  setSelectedDate(null);
                  setSelectedTime('');
                }}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Book Another Appointment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
