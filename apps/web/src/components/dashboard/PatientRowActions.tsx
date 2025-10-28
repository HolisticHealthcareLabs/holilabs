'use client';

/**
 * Patient Row Actions
 * Quick action menu for patient rows
 * FREE - No external libraries needed
 *
 * Features:
 * - Dropdown menu with quick actions
 * - Schedule appointment
 * - Send message
 * - View chart
 * - Request labs
 * - Beautiful hover effects
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PatientRowActionsProps {
  patientId: string;
  patientName: string;
  onAction?: (action: string, patientId: string) => void;
}

export default function PatientRowActions({ patientId, patientName, onAction }: PatientRowActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const actions = [
    {
      id: 'schedule',
      label: 'Schedule Appointment',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'text-blue-600',
      hoverColor: 'hover:bg-blue-50',
    },
    {
      id: 'message',
      label: 'Send Message',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
      color: 'text-purple-600',
      hoverColor: 'hover:bg-purple-50',
    },
    {
      id: 'chart',
      label: 'View Chart',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'text-green-600',
      hoverColor: 'hover:bg-green-50',
    },
    {
      id: 'labs',
      label: 'Request Labs',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      ),
      color: 'text-orange-600',
      hoverColor: 'hover:bg-orange-50',
    },
  ];

  const handleAction = (actionId: string) => {
    setIsOpen(false);
    onAction?.(actionId, patientId);

    // Default navigation if no custom handler
    if (!onAction) {
      switch (actionId) {
        case 'schedule':
          window.location.href = `/dashboard/patients/${patientId}/appointments/new`;
          break;
        case 'message':
          window.location.href = `/dashboard/messages?patient=${patientId}`;
          break;
        case 'chart':
          window.location.href = `/dashboard/patients/${patientId}`;
          break;
        case 'labs':
          window.location.href = `/dashboard/patients/${patientId}/labs/new`;
          break;
      }
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Three Dots Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
        aria-label="More actions"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden"
          >
            <div className="py-2">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quick Actions</p>
                <p className="text-sm font-medium text-gray-900 truncate">{patientName}</p>
              </div>

              {actions.map((action, index) => (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleAction(action.id)}
                  className={`w-full px-4 py-3 flex items-center gap-3 ${action.hoverColor} transition-colors group`}
                >
                  <div className={action.color}>{action.icon}</div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    {action.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
