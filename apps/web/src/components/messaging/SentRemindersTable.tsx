'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SentReminder {
  id: string;
  templateName: string;
  recipient: {
    id: string;
    name: string;
    contact: string;
  } | null;
  channel: 'SMS' | 'EMAIL';
  message: string;
  sentAt: string;
  status: string;
}

export default function SentRemindersTable() {
  const [reminders, setReminders] = useState<SentReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchSentReminders();
  }, [dateRange]);

  const fetchSentReminders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ dateRange });
      const response = await fetch(`/api/reminders/sent?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setReminders(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch sent reminders:', error);
    } finally {
      setLoading(false);
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
        <div className="text-6xl mb-4">✅</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No sent reminders yet
        </h3>
        <p className="text-gray-600">
          Sent reminders will appear here once you send or schedule them
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-700">Filter by date:</label>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
        </select>
        <div className="flex-1"></div>
        <p className="text-sm text-gray-600">{reminders.length} reminders sent</p>
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
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{reminder.templateName}</h3>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                      ✓ SENT
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 mb-1">Recipient</p>
                      <p className="font-medium">{reminder.recipient?.name || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 mb-1">Contact</p>
                      <p className="font-medium">{reminder.recipient?.contact || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 mb-1">Channel</p>
                      <p className="font-medium">{reminder.channel}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 mb-1">Sent At</p>
                      <p className="font-medium">{formatDate(reminder.sentAt)}</p>
                    </div>
                  </div>

                  {/* View Message Toggle */}
                  {expandedId === reminder.id ? (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-700">Message Content:</p>
                        <button
                          onClick={() => setExpandedId(null)}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          Hide
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{reminder.message}</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => setExpandedId(reminder.id)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View message →
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
