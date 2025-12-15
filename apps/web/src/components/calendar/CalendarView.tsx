'use client';

/**
 * Main Calendar View Component
 *
 * Container for the enhanced agenda system with three view modes:
 * - Daily: Detailed time-slotted view with full appointment details
 * - Weekly: Week view with customizable day selection
 * - Monthly: Month overview with color-coded appointments
 *
 * Features:
 * - Clean, futuristic design
 * - Interactive appointment cards
 * - Situation badges (color-coded)
 * - Status management
 * - Real-time updates
 */

import { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { CustomDateDisplay } from './CustomDateDisplay';

export type CalendarViewMode = 'daily' | 'weekly' | 'monthly';

interface CalendarViewProps {
  initialDate?: Date;
  initialView?: CalendarViewMode;
  onDateChange?: (date: Date) => void;
  onViewChange?: (view: CalendarViewMode) => void;
  appointments?: any[];
  availableSituations?: any[];
  onDateRangeChange?: (start: Date, end: Date) => void;
  onAppointmentClick?: (appointmentId: string) => void;
  onStatusChange?: (appointmentId: string, newStatus: any) => Promise<void>;
  onNotificationSend?: (appointmentId: string, channel: 'whatsapp' | 'email' | 'all', type: 'notify' | 'followup-1' | 'followup-2') => Promise<void>;
  onSituationsChange?: (appointmentId: string, situationIds: string[]) => Promise<void>;
  onPaymentNotificationSend?: (appointmentId: string, channel: 'whatsapp' | 'email' | 'in-app' | 'all') => Promise<void>;
}

export function CalendarView({
  initialDate = new Date(),
  initialView = 'daily',
  onDateChange,
  onViewChange,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [viewMode, setViewMode] = useState<CalendarViewMode>(initialView);
  const [isLoading, setIsLoading] = useState(false);

  // Navigation handlers
  const navigatePrevious = () => {
    let newDate: Date;
    switch (viewMode) {
      case 'daily':
        newDate = addDays(currentDate, -1);
        break;
      case 'weekly':
        newDate = addDays(currentDate, -7);
        break;
      case 'monthly':
        newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        break;
    }
    setCurrentDate(newDate);
    onDateChange?.(newDate);
  };

  const navigateNext = () => {
    let newDate: Date;
    switch (viewMode) {
      case 'daily':
        newDate = addDays(currentDate, 1);
        break;
      case 'weekly':
        newDate = addDays(currentDate, 7);
        break;
      case 'monthly':
        newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        break;
    }
    setCurrentDate(newDate);
    onDateChange?.(newDate);
  };

  const navigateToday = () => {
    const today = new Date();
    setCurrentDate(today);
    onDateChange?.(today);
  };

  const handleViewChange = (view: CalendarViewMode) => {
    setViewMode(view);
    onViewChange?.(view);
  };

  // Date range display
  const dateRangeText = useMemo(() => {
    switch (viewMode) {
      case 'daily':
        return format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: es });
      case 'weekly': {
        const start = startOfWeek(currentDate, { locale: es });
        const end = endOfWeek(currentDate, { locale: es });
        return `${format(start, 'd MMM', { locale: es })} - ${format(end, 'd MMM yyyy', { locale: es })}`;
      }
      case 'monthly':
        return format(currentDate, 'MMMM yyyy', { locale: es });
    }
  }, [currentDate, viewMode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          {/* Top Row: Title + Quick Actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                📅 Agenda
              </h1>
              <button
                onClick={navigateToday}
                className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                Hoy
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-3">
              <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200">
                + Nueva Cita
              </button>
            </div>
          </div>

          {/* Second Row: Navigation + View Selector */}
          <div className="flex items-center justify-between">
            {/* Date Navigation */}
            <div className="flex items-center space-x-4">
              <button
                onClick={navigatePrevious}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Anterior"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Date Display */}
              <div className="flex items-center space-x-3">
                <CustomDateDisplay date={currentDate} variant="compact" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {dateRangeText}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Semana {format(currentDate, 'w', { locale: es })} del año
                  </p>
                </div>
              </div>

              <button
                onClick={navigateNext}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Siguiente"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* View Mode Selector */}
            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {(['daily', 'weekly', 'monthly'] as CalendarViewMode[]).map((mode) => {
                const isActive = viewMode === mode;
                const labels = {
                  daily: 'Día',
                  weekly: 'Semana',
                  monthly: 'Mes',
                };
                return (
                  <button
                    key={mode}
                    onClick={() => handleViewChange(mode)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                      isActive
                        ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {labels[mode]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Placeholder for view content - will be replaced with actual views */}
            <div className="p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                {viewMode === 'daily' && 'Vista Diaria - En construcción'}
                {viewMode === 'weekly' && 'Vista Semanal - En construcción'}
                {viewMode === 'monthly' && 'Vista Mensual - En construcción'}
              </p>
              {/* Helper text - low contrast intentional for construction notice */}
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Los componentes de vista se integrarán aquí
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
