'use client';

/**
 * Status Dropdown Component
 *
 * Interactive dropdown with two sections:
 * 1. Notification - Send notifications via WhatsApp, Email, All
 *    - Each option has hover submenu: "Notify", "Follow-up 1", "Follow-up 2"
 * 2. Status - Update appointment status
 *    - Atendido, Atendiéndose, Cita Reprogramada, etc.
 *
 * Features:
 * - Floating tiles design
 * - Smooth animations
 * - Hover submenus
 * - Click outside to close
 */

import { useState, useRef, useEffect } from 'react';

interface StatusDropdownProps {
  currentStatus: string;
  appointmentId: string;
  onStatusChange: (status: string) => void;
  onNotificationSend: (channel: 'whatsapp' | 'email' | 'all', type: 'notify' | 'followup-1' | 'followup-2') => void;
}

export function StatusDropdown({
  currentStatus,
  appointmentId,
  onStatusChange,
  onNotificationSend,
}: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredChannel, setHoveredChannel] = useState<'whatsapp' | 'email' | 'all' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHoveredChannel(null);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const notificationChannels = [
    { id: 'whatsapp' as const, label: 'WhatsApp', icon: '💬', color: 'from-green-500 to-green-600' },
    { id: 'email' as const, label: 'Email', icon: '📧', color: 'from-blue-500 to-blue-600' },
    { id: 'all' as const, label: 'All', icon: '🔔', color: 'from-purple-500 to-purple-600' },
  ];

  const statuses = [
    { id: 'COMPLETED', label: 'Atendido', icon: '✓', color: 'hover:bg-teal-50 dark:hover:bg-teal-900/20' },
    { id: 'IN_PROGRESS', label: 'Atendiéndose', icon: '⚕️', color: 'hover:bg-purple-50 dark:hover:bg-purple-900/20' },
    { id: 'CONFIRMED', label: 'Confirmado por teléfono', icon: '📞', color: 'hover:bg-green-50 dark:hover:bg-green-900/20' },
    { id: 'CONFIRMED', label: 'Confirmado por Correo', icon: '✉️', color: 'hover:bg-green-50 dark:hover:bg-green-900/20' },
    { id: 'CHECKED_IN', label: 'En sala de Espera', icon: '🪑', color: 'hover:bg-blue-50 dark:hover:bg-blue-900/20' },
    { id: 'NO_SHOW', label: 'No asistió', icon: '⚠️', color: 'hover:bg-orange-50 dark:hover:bg-orange-900/20' },
    { id: 'RESCHEDULED', label: 'Cita Reprogramada', icon: '🔄', color: 'hover:bg-yellow-50 dark:hover:bg-yellow-900/20' },
  ];

  const followUpOptions = [
    { id: 'notify' as const, label: 'Notify', icon: '📤' },
    { id: 'followup-1' as const, label: 'Follow-up 1', icon: '1️⃣' },
    { id: 'followup-2' as const, label: 'Follow-up 2', icon: '2️⃣' },
  ];

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
      >
        <span>Estado</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Notification Section */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Notification
            </h3>
            <div className="space-y-2">
              {notificationChannels.map((channel) => (
                <div
                  key={channel.id}
                  className="relative"
                  onMouseEnter={() => setHoveredChannel(channel.id)}
                  onMouseLeave={() => setHoveredChannel(null)}
                >
                  <button
                    className={`w-full flex items-center space-x-3 px-4 py-3 bg-gradient-to-r ${channel.color} text-white rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]`}
                  >
                    <span className="text-2xl">{channel.icon}</span>
                    <span className="font-semibold">{channel.label}</span>
                    <svg className="w-4 h-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* Submenu */}
                  {hoveredChannel === channel.id && (
                    <div className="absolute left-full top-0 ml-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-left-2 duration-150">
                      {followUpOptions.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => {
                            onNotificationSend(channel.id, option.id);
                            setIsOpen(false);
                            setHoveredChannel(null);
                          }}
                          className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <span className="text-lg">{option.icon}</span>
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Divider with spacing */}
          <div className="h-4 bg-gray-50 dark:bg-gray-900"></div>

          {/* Status Section */}
          <div className="p-4">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Status
            </h3>
            <div className="space-y-1">
              {statuses.map((status, index) => (
                <button
                  key={`${status.id}-${index}`}
                  onClick={() => {
                    onStatusChange(status.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors ${status.color}`}
                >
                  <span className="text-lg">{status.icon}</span>
                  <span>{status.label}</span>
                  {currentStatus === status.id && (
                    <svg className="w-4 h-4 ml-auto text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
