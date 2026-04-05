'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FailedReminder {
  id: string;
  templateName: string;
  patientIds: string[];
  channel: 'SMS' | 'EMAIL' | 'WHATSAPP';
  scheduledFor: string;
  status: 'FAILED';
  lastExecutionResults: {
    success: boolean;
    sent: number;
    failed: number;
    errors: string[];
  } | null;
  updatedAt: string;
}

interface FailedRemindersTableProps {
  onUpdate?: () => void;
}

export default function FailedRemindersTable({ onUpdate }: FailedRemindersTableProps) {
  const [reminders, setReminders] = useState<FailedReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    fetchFailedReminders();
  }, []);

  const fetchFailedReminders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reminders/schedule?status=FAILED');
      const data = await response.json();
      if (data.success) {
        setReminders(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch failed reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (id: string) => {
    try {
      setRetrying(id);
      const response = await fetch(`/api/reminders/${id}/retry`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        await fetchFailedReminders();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Failed to retry:', error);
    } finally {
      setRetrying(null);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-100 dark:bg-gray-800 h-20 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (reminders.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No failed reminders
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Great job! All your reminders are being delivered successfully
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">{reminders.length} failed reminders need attention</p>
      </div>

      {/* Table */}
      <div className="space-y-4">
        <AnimatePresence>
          {reminders.map((reminder, index) => (
            <motion.div
              key={reminder.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white dark:bg-gray-900 border border-red-200/60 dark:border-red-500/20 rounded-xl p-5 hover:shadow-lg dark:hover:shadow-red-900/10 transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">{reminder.templateName}</h3>
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                      FAILED
                    </span>
                    <span className="shrink-0 px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      {reminder.channel}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-[13px] text-gray-500 dark:text-gray-400 mb-3">
                    <span>{reminder.patientIds.length} recipients</span>
                    <span>·</span>
                    <span>Scheduled {formatDate(reminder.scheduledFor)}</span>
                    <span>·</span>
                    <span>Failed {formatDate(reminder.updatedAt)}</span>
                  </div>

                  {/* Inline failure reason */}
                  {reminder.lastExecutionResults && reminder.lastExecutionResults.errors.length > 0 && (
                    <div className="group relative inline-flex items-center gap-1.5 text-[12px] text-red-600 dark:text-red-400">
                      <span className="underline decoration-dotted cursor-help">
                        {reminder.lastExecutionResults.errors[0].slice(0, 80)}
                        {reminder.lastExecutionResults.errors[0].length > 80 ? '...' : ''}
                      </span>
                      {(reminder.lastExecutionResults.errors.length > 1 || reminder.lastExecutionResults.errors[0].length > 80) && (
                        <div className="invisible group-hover:visible absolute left-0 bottom-full mb-2 z-50 max-w-sm p-3 rounded-xl bg-gray-900 dark:bg-gray-700 text-white text-[12px] shadow-xl">
                          <p className="font-semibold mb-1">Sent: {reminder.lastExecutionResults.sent} · Failed: {reminder.lastExecutionResults.failed}</p>
                          <ul className="space-y-0.5">
                            {reminder.lastExecutionResults.errors.map((error, i) => (
                              <li key={i}>• {error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Retry button */}
                <button
                  onClick={() => handleRetry(reminder.id)}
                  disabled={retrying === reminder.id}
                  className="shrink-0 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 text-[13px] font-semibold flex items-center gap-2 transition-colors"
                >
                  {retrying === reminder.id ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Retrying
                    </>
                  ) : (
                    'Retry'
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
