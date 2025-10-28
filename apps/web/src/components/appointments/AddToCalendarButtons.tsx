'use client';

/**
 * Add to Calendar Buttons Component
 * Provides options to add appointment to Google Calendar, Outlook, or Apple Calendar
 * Features dropdown menu with golden theme styling
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  generateGoogleCalendarURL,
  generateOutlookCalendarURL,
  type AppointmentData,
} from '@/lib/calendar/ics-generator';

interface AddToCalendarButtonsProps {
  appointment: {
    id: string;
    startTime: Date | string;
    endTime: Date | string;
    patientName: string;
    clinicianName: string;
    branch?: string;
    notes?: string;
    type?: string;
  };
  variant?: 'default' | 'compact';
}

export default function AddToCalendarButtons({
  appointment,
  variant = 'default',
}: AddToCalendarButtonsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Convert string dates to Date objects if needed
  const appointmentData: AppointmentData = {
    ...appointment,
    startTime: typeof appointment.startTime === 'string' ? new Date(appointment.startTime) : appointment.startTime,
    endTime: typeof appointment.endTime === 'string' ? new Date(appointment.endTime) : appointment.endTime,
  };

  const handleGoogleCalendar = () => {
    const url = generateGoogleCalendarURL(appointmentData);
    window.open(url, '_blank');
    setIsOpen(false);
  };

  const handleOutlookCalendar = () => {
    const url = generateOutlookCalendarURL(appointmentData);
    window.open(url, '_blank');
    setIsOpen(false);
  };

  const handleAppleCalendar = () => {
    // Download .ics file for Apple Calendar
    const downloadURL = `/api/appointments/${appointment.id}/export-calendar`;
    window.location.href = downloadURL;
    setIsOpen(false);
  };

  if (variant === 'compact') {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-amber-400 text-amber-700 rounded-lg hover:bg-amber-50 hover:border-amber-500 transition-all font-semibold text-sm"
        >
          📅 Add to Calendar
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border-2 border-amber-400 shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="py-2">
              <button
                onClick={handleGoogleCalendar}
                className="w-full px-4 py-3 text-left hover:bg-amber-50 transition-colors flex items-center gap-3 group"
              >
                <span className="text-2xl">📅</span>
                <div>
                  <div className="font-semibold text-gray-900 group-hover:text-amber-700">Google Calendar</div>
                  <div className="text-xs text-gray-600">Opens in new tab</div>
                </div>
              </button>

              <button
                onClick={handleOutlookCalendar}
                className="w-full px-4 py-3 text-left hover:bg-amber-50 transition-colors flex items-center gap-3 group"
              >
                <span className="text-2xl">📧</span>
                <div>
                  <div className="font-semibold text-gray-900 group-hover:text-amber-700">Outlook</div>
                  <div className="text-xs text-gray-600">Opens in new tab</div>
                </div>
              </button>

              <button
                onClick={handleAppleCalendar}
                className="w-full px-4 py-3 text-left hover:bg-amber-50 transition-colors flex items-center gap-3 group"
              >
                <span className="text-2xl">🍎</span>
                <div>
                  <div className="font-semibold text-gray-900 group-hover:text-amber-700">Apple Calendar</div>
                  <div className="text-xs text-gray-600">Downloads .ics file</div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default variant - larger card-style
  return (
    <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-6" ref={dropdownRef}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-amber-400 bg-white flex items-center justify-center text-2xl">
            📅
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Add to Calendar</h3>
            <p className="text-sm text-gray-600">Never miss your appointment</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={handleGoogleCalendar}
          className="w-full px-4 py-3 bg-white border-2 border-amber-400 rounded-lg hover:bg-amber-100 hover:border-amber-500 hover:scale-[1.02] transition-all flex items-center gap-3 group"
        >
          <span className="text-2xl">📅</span>
          <div className="flex-1 text-left">
            <div className="font-semibold text-gray-900 group-hover:text-amber-700">Google Calendar</div>
            <div className="text-xs text-gray-600">Opens in new tab</div>
          </div>
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={handleOutlookCalendar}
          className="w-full px-4 py-3 bg-white border-2 border-amber-400 rounded-lg hover:bg-amber-100 hover:border-amber-500 hover:scale-[1.02] transition-all flex items-center gap-3 group"
        >
          <span className="text-2xl">📧</span>
          <div className="flex-1 text-left">
            <div className="font-semibold text-gray-900 group-hover:text-amber-700">Outlook Calendar</div>
            <div className="text-xs text-gray-600">Opens in new tab</div>
          </div>
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={handleAppleCalendar}
          className="w-full px-4 py-3 bg-white border-2 border-amber-400 rounded-lg hover:bg-amber-100 hover:border-amber-500 hover:scale-[1.02] transition-all flex items-center gap-3 group"
        >
          <span className="text-2xl">🍎</span>
          <div className="flex-1 text-left">
            <div className="font-semibold text-gray-900 group-hover:text-amber-700">Apple Calendar</div>
            <div className="text-xs text-gray-600">Downloads .ics file</div>
          </div>
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      </div>

      <p className="text-xs text-gray-600 mt-4 text-center">
        Choose your preferred calendar app to save this appointment
      </p>
    </div>
  );
}
