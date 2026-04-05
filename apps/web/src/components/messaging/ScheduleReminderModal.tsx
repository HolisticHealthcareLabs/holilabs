'use client';

/**
 * Schedule Reminder Modal
 * Select patients, date/time, channel, and recurrence pattern for scheduled reminders
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PatientSelectorModal, { type DeliveryChannel } from './PatientSelectorModal';

interface MessageTemplate {
  id?: string;
  name: string;
  category: string;
  subject?: string;
  message: string;
  variables: string[];
}

interface ScheduleReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (scheduleData: ScheduleData) => void;
  template: MessageTemplate | null;
}

export interface ScheduleData {
  patients: any[];
  channels: DeliveryChannel[];
  scheduledFor: Date;
  recurrence?: {
    pattern: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    interval: number;
    endDate?: Date;
    count?: number;
  };
}

export default function ScheduleReminderModal({
  isOpen,
  onClose,
  onConfirm,
  template,
}: ScheduleReminderModalProps) {
  const [showPatientSelector, setShowPatientSelector] = useState(false);

  // DateTime state
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');

  // Recurrence state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('WEEKLY');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceEndType, setRecurrenceEndType] = useState<'never' | 'date' | 'count'>('never');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [recurrenceCount, setRecurrenceCount] = useState(10);

  // Patient & Channel state
  const [selectedPatients, setSelectedPatients] = useState<any[]>([]);
  const [channels, setChannels] = useState<DeliveryChannel[]>(['SMS']);

  // Get minimum date (today)
  const getMinDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  // Get minimum time (if today is selected)
  const getMinTime = () => {
    if (scheduledDate === getMinDate()) {
      const now = new Date();
      return now.toTimeString().slice(0, 5);
    }
    return '00:00';
  };

  // Handle patient selection from modal
  const handlePatientSelection = (patients: any[], selectedChannels: DeliveryChannel[]) => {
    setSelectedPatients(patients);
    setChannels(selectedChannels);
    setShowPatientSelector(false);
  };

  // Handle confirm
  const handleConfirm = () => {
    if (!scheduledDate || !scheduledTime || selectedPatients.length === 0) {
      return;
    }

    const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`);

    const scheduleData: ScheduleData = {
      patients: selectedPatients,
      channels,
      scheduledFor,
    };

    // Add recurrence if enabled
    if (isRecurring) {
      scheduleData.recurrence = {
        pattern: recurrencePattern,
        interval: recurrenceInterval,
        ...(recurrenceEndType === 'date' && recurrenceEndDate
          ? { endDate: new Date(recurrenceEndDate) }
          : {}),
        ...(recurrenceEndType === 'count' ? { count: recurrenceCount } : {}),
      };
    }

    onConfirm(scheduleData);
    onClose();

    // Reset state
    setScheduledDate('');
    setScheduledTime('09:00');
    setIsRecurring(false);
    setSelectedPatients([]);
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative dark:bg-gray-900 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--surface-primary)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--token-shadow-xl)' }}
          >
            {/* Header */}
            <div className="px-6 py-4 dark:border-gray-700 bg-gradient-to-r from-purple-500 to-indigo-600" style={{ borderBottom: '1px solid var(--border-default)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Schedule Reminder</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              {/* Decorative - low contrast intentional for template name metadata */}
              {template && (
                <p className="text-purple-100/80 text-sm mt-2">
                  Template: {template.name}
                </p>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Date & Time */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold dark:text-white flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  When to send
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium dark:text-gray-300 mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Date
                    </label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={getMinDate()}
                      className="w-full px-4 py-2.5 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent" style={{ border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium dark:text-gray-300 mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Time
                    </label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      min={getMinTime()}
                      className="w-full px-4 py-2.5 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent" style={{ border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)' }}
                    />
                  </div>
                </div>
              </div>

              {/* Recurrence */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold dark:text-white flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Repeat
                  </h3>
                  <div className="inline-flex items-center dark:bg-gray-800 p-[2px] ring-1 ring-black/[0.04]" style={{ borderRadius: 'var(--radius-full)', backgroundColor: 'var(--surface-tertiary)' }}>
                    <button
                      type="button"
                      onClick={() => setIsRecurring(false)}
                      className={`relative rounded-full px-3 py-1 text-[11px] font-medium transition-all duration-200 ${
                        !isRecurring
                          ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/[0.04]'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Off
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRecurring(true)}
                      className={`relative rounded-full px-3 py-1 text-[11px] font-medium transition-all duration-200 ${
                        isRecurring
                          ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/[0.04]'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      On
                    </button>
                  </div>
                </div>

                {isRecurring && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 pl-7"
                  >
                    {/* Pattern */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium dark:text-gray-300 mb-2" style={{ color: 'var(--text-secondary)' }}>
                          Frequency
                        </label>
                        <select
                          value={recurrencePattern}
                          onChange={(e) => setRecurrencePattern(e.target.value as any)}
                          className="w-full px-4 py-2.5 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent" style={{ border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)' }}
                        >
                          <option value="DAILY">Daily</option>
                          <option value="WEEKLY">Weekly</option>
                          <option value="MONTHLY">Monthly</option>
                          <option value="YEARLY">Yearly</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium dark:text-gray-300 mb-2" style={{ color: 'var(--text-secondary)' }}>
                          Every
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={recurrenceInterval}
                          onChange={(e) => setRecurrenceInterval(parseInt(e.target.value))}
                          className="w-full px-4 py-2.5 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent" style={{ border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)' }}
                        />
                      </div>
                    </div>

                    {/* End condition */}
                    <div className="space-y-3">
                      <label className="block text-sm font-medium dark:text-gray-300" style={{ color: 'var(--text-secondary)' }}>
                        Ends
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="recurrence-end"
                            checked={recurrenceEndType === 'never'}
                            onChange={() => setRecurrenceEndType('never')}
                            className="text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-sm dark:text-gray-400" style={{ color: 'var(--text-secondary)' }}>Never</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="recurrence-end"
                            checked={recurrenceEndType === 'date'}
                            onChange={() => setRecurrenceEndType('date')}
                            className="text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-sm dark:text-gray-400" style={{ color: 'var(--text-secondary)' }}>On date</span>
                          {recurrenceEndType === 'date' && (
                            <input
                              type="date"
                              value={recurrenceEndDate}
                              onChange={(e) => setRecurrenceEndDate(e.target.value)}
                              min={scheduledDate || getMinDate()}
                              className="ml-2 px-3 py-1.5 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm" style={{ border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)' }}
                            />
                          )}
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="recurrence-end"
                            checked={recurrenceEndType === 'count'}
                            onChange={() => setRecurrenceEndType('count')}
                            className="text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-sm dark:text-gray-400" style={{ color: 'var(--text-secondary)' }}>After</span>
                          {recurrenceEndType === 'count' && (
                            <>
                              <input
                                type="number"
                                min="1"
                                value={recurrenceCount}
                                onChange={(e) => setRecurrenceCount(parseInt(e.target.value))}
                                className="ml-2 w-20 px-3 py-1.5 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm" style={{ border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)' }}
                              />
                              <span className="text-sm dark:text-gray-400" style={{ color: 'var(--text-secondary)' }}>occurrences</span>
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Patient Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold dark:text-white flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Recipients
                </h3>
                <button
                  onClick={() => setShowPatientSelector(true)}
                  className="w-full px-4 py-3 border-2 border-dashed dark:border-gray-600 hover:border-purple-500 hover:bg-purple-50 transition-colors dark:text-gray-400 hover:text-purple-700 font-medium" style={{ borderColor: 'var(--border-strong)', borderRadius: 'var(--radius-lg)', color: 'var(--text-secondary)' }}
                >
                  {selectedPatients.length === 0
                    ? 'Select patients'
                    : `${selectedPatients.length} patient${selectedPatients.length !== 1 ? 's' : ''} selected via ${channels.join(', ')}`}
                </button>
              </div>

              {/* Preview */}
              {scheduledDate && scheduledTime && selectedPatients.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-purple-50 border border-purple-200" style={{ borderRadius: 'var(--radius-lg)' }}
                >
                  <p className="text-sm font-medium text-purple-900 mb-1">
                    Summary
                  </p>
                  <p className="text-sm text-purple-700">
                    Send to {selectedPatients.length} patient{selectedPatients.length !== 1 ? 's' : ''} via {channels.join(', ')}
                    {' '}on {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    {' '}at {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {isRecurring && (
                      <>
                        {', then repeat '}
                        {recurrenceInterval > 1 ? `every ${recurrenceInterval} ` : ''}
                        {recurrencePattern.toLowerCase()}
                        {recurrenceEndType === 'date'
                          ? ` until ${new Date(recurrenceEndDate).toLocaleDateString()}`
                          : recurrenceEndType === 'count'
                            ? ` for ${recurrenceCount} times`
                            : ' indefinitely'}
                      </>
                    )}
                  </p>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 dark:border-gray-700 dark:bg-gray-800 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-default)', backgroundColor: 'var(--surface-secondary)' }}>
              <button
                onClick={onClose}
                className="px-6 py-2.5 dark:text-gray-300 font-medium hover:bg-gray-200 transition-colors" style={{ color: 'var(--text-secondary)', borderRadius: 'var(--radius-lg)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!scheduledDate || !scheduledTime || selectedPatients.length === 0}
                className={`px-8 py-2.5 font-semibold transition-all ${
                  !scheduledDate || !scheduledTime || selectedPatients.length === 0
                    ? 'dark:text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 hover:shadow-xl'
                }`}
                style={{ borderRadius: 'var(--radius-lg)', ...(!scheduledDate || !scheduledTime || selectedPatients.length === 0 ? { backgroundColor: 'var(--border-strong)', color: 'var(--text-tertiary)' } : { boxShadow: 'var(--token-shadow-lg)' }) }}
              >
                Schedule Reminder
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Patient Selector Modal */}
      <PatientSelectorModal
        isOpen={showPatientSelector}
        onClose={() => setShowPatientSelector(false)}
        onConfirm={handlePatientSelection}
      />
    </>
  );
}
