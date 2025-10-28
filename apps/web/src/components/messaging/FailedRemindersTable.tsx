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
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
          <div key={i} className="bg-gray-100 h-20 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (reminders.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No failed reminders
        </h3>
        <p className="text-gray-600">
          Great job! All your reminders are being delivered successfully
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-gray-600">{reminders.length} failed reminders need attention</p>
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
              className="bg-white border-2 border-red-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{reminder.templateName}</h3>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-300">
                      ⚠ FAILED
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-gray-500 mb-1">Recipients</p>
                      <p className="font-medium">{reminder.patientIds.length} patients</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Channel</p>
                      <p className="font-medium">{reminder.channel}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Scheduled For</p>
                      <p className="font-medium">{formatDate(reminder.scheduledFor)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Failed At</p>
                      <p className="font-medium">{formatDate(reminder.updatedAt)}</p>
                    </div>
                  </div>

                  {/* Error Details */}
                  {reminder.lastExecutionResults && expandedId === reminder.id && (
                    <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-red-900">Error Details:</p>
                        <button
                          onClick={() => setExpandedId(null)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Hide
                        </button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="text-gray-600">Sent: {reminder.lastExecutionResults.sent}</span>
                          <span className="text-gray-600">Failed: {reminder.lastExecutionResults.failed}</span>
                        </div>
                        {reminder.lastExecutionResults.errors.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium text-gray-700 mb-2">Errors:</p>
                            <ul className="space-y-1">
                              {reminder.lastExecutionResults.errors.map((error, i) => (
                                <li key={i} className="text-sm text-red-700">• {error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {reminder.lastExecutionResults && expandedId !== reminder.id && (
                    <button
                      onClick={() => setExpandedId(reminder.id)}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      View error details →
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div className="ml-4">
                  <button
                    onClick={() => handleRetry(reminder.id)}
                    disabled={retrying === reminder.id}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm font-medium flex items-center space-x-2"
                  >
                    {retrying === reminder.id ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Retrying...</span>
                      </>
                    ) : (
                      <>
                        <span>🔄</span>
                        <span>Retry</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
