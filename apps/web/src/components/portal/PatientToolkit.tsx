'use client';

/**
 * Patient Toolkit Component
 * Large, prominent dashboard element with dropdown menu for quick patient actions
 * Similar to a command center or toolkit for patients
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface ToolkitAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  badge?: string;
  color: string;
}

const TOOLKIT_ACTIONS: ToolkitAction[] = [
  {
    id: 'book-appointment',
    label: 'Book Appointment',
    description: 'Schedule a visit with your provider',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    href: '/portal/dashboard/appointments/schedule',
    color: 'gray',
  },
  {
    id: 'my-prescriptions',
    label: 'My Prescriptions',
    description: 'View and track your prescriptions',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    href: '/portal/dashboard/prescriptions',
    color: 'gray',
  },
  {
    id: 'messages',
    label: 'Messages & Communication',
    description: 'Chat with your care team',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
    href: '/portal/dashboard/messages',
    color: 'gray',
  },
  {
    id: 'view-medications',
    label: 'My Medications',
    description: 'View and track your medications',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    href: '/portal/dashboard/medications',
    color: 'gray',
  },
  {
    id: 'lab-results',
    label: 'Lab Results',
    description: 'Check your latest test results',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    href: '/portal/dashboard/lab-results',
    badge: 'New',
    color: 'gray',
  },
  {
    id: 'documents',
    label: 'Upload Documents',
    description: 'Share files with your provider',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
    href: '/portal/dashboard/documents/upload',
    color: 'gray',
  },
  {
    id: 'health-records',
    label: 'Health Records',
    description: 'Access your complete medical history',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    href: '/portal/dashboard/records',
    color: 'gray',
  },
  {
    id: 'billing',
    label: 'Billing & Payments',
    description: 'Manage your bills and payments',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    href: '/portal/dashboard/billing',
    color: 'gray',
  },
  {
    id: 'prevention',
    label: 'Preventive Care',
    description: 'Stay up to date with screenings',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    href: '/portal/dashboard/prevention',
    color: 'gray',
  },
];

export default function PatientToolkit() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ToolkitAction>(TOOLKIT_ACTIONS[0]);
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

  const getColorClasses = (color: string, variant: 'bg' | 'text' | 'border' | 'hover-bg' | 'hover-border') => {
    const colorMap: Record<string, Record<string, string>> = {
      gray: { bg: 'bg-gray-700', text: 'text-gray-700', border: 'border-gray-200', 'hover-bg': 'hover:bg-gray-800', 'hover-border': 'hover:border-gray-300' },
    };
    return colorMap[color]?.[variant] || colorMap.gray[variant];
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main Toolkit Card */}
      <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white ${getColorClasses(selectedAction.color, 'bg')} shadow-sm`}>
              {selectedAction.icon}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">My Health Toolkit</h3>
              <p className="text-sm text-gray-600 mt-1">Quick access to your care</p>
            </div>
          </div>
          {selectedAction.badge && (
            <span className="px-3 py-1 bg-gray-700 text-white text-xs font-bold rounded-full">
              {selectedAction.badge}
            </span>
          )}
        </div>

        {/* Selected Action Display */}
        <div className="mb-4">
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-colors">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${getColorClasses(selectedAction.color, 'bg')} text-white`}>
                {selectedAction.icon}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 text-lg mb-1">{selectedAction.label}</h4>
                <p className="text-sm text-gray-600">{selectedAction.description}</p>
              </div>
              <a
                href={selectedAction.href}
                className={`px-6 py-3 ${getColorClasses(selectedAction.color, 'bg')} ${getColorClasses(selectedAction.color, 'hover-bg')} text-white rounded-lg font-semibold transition shadow-sm hover:shadow-md flex items-center gap-2`}
              >
                Go
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Dropdown Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xl px-6 py-4 flex items-center justify-between transition-all hover:bg-gray-100"
        >
          <span className="font-semibold text-gray-900">
            {isOpen ? 'Hide all actions' : 'Show all actions'}
          </span>
          <ChevronDown
            className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="p-2 max-h-96 overflow-y-auto">
              {TOOLKIT_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  onClick={() => {
                    setSelectedAction(action);
                    setIsOpen(false);
                  }}
                  className={`w-full p-4 rounded-lg hover:bg-gray-50 transition-colors text-left group ${
                    selectedAction.id === action.id ? 'bg-gray-100 border border-gray-300' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        selectedAction.id === action.id
                          ? `${getColorClasses(action.color, 'bg')} text-white`
                          : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                      } transition-all`}
                    >
                      {action.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-bold text-gray-900">{action.label}</h5>
                        {action.badge && (
                          <span className="px-2 py-0.5 bg-gray-700 text-white text-xs font-bold rounded-full">
                            {action.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{action.description}</p>
                    </div>
                    {selectedAction.id === action.id && (
                      <svg className="w-6 h-6 text-gray-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
