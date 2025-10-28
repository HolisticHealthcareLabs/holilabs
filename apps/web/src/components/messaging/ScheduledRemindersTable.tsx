'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScheduledReminder {
  id: string;
  templateName: string;
  patientIds: string[];
  channel: 'SMS' | 'EMAIL' | 'WHATSAPP';
  scheduledFor: string;
  nextExecution: string | null;
  status: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  recurrencePattern: string | null;
  recurrenceInterval: number | null;
  executionCount: number;
}

interface ScheduledRemindersTableProps {
  onUpdate?: () => void;
}

export default function ScheduledRemindersTable({ onUpdate }: ScheduledRemindersTableProps) {
  const [reminders, setReminders] = useState<ScheduledReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<{ id: string; action: string } | null>(null);

  useEffect(() => {
    fetchReminders();
  }, [statusFilter]);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter.toUpperCase());
      }
      const response = await fetch(`/api/reminders/schedule?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setReminders(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (id: string, action: string) => {
    try {
      setActionLoading(id);
      const response = await fetch(`/api/reminders/${id}/${action}`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        await fetchReminders();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error(`Failed to ${action}:`, error);
    } finally {
      setActionLoading(null);
      setShowConfirm(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; border: string }> = {
      PENDING: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      ACTIVE: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
      PAUSED: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
      COMPLETED: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
      CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    };
    const badge = badges[status] || badges.PENDING;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${badge.bg} ${badge.text} ${badge.border}`}>
        {status}
      </span>
    );
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
        <div className="text-6xl mb-4">📅</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No scheduled reminders yet
        </h3>
        <p className="text-gray-600">
          Schedule a reminder from the Templates tab to get started
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-700">Filter by status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
        </select>
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
                    {getStatusBadge(reminder.status)}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 mb-1">Recipients</p>
                      <p className="font-medium">{reminder.patientIds.length} patients</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Channel</p>
                      <p className="font-medium">{reminder.channel}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Next Execution</p>
                      <p className="font-medium">
                        {reminder.nextExecution ? formatDate(reminder.nextExecution) : formatDate(reminder.scheduledFor)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Recurrence</p>
                      <p className="font-medium">
                        {reminder.recurrencePattern ? `${reminder.recurrencePattern} (${reminder.executionCount}x)` : 'One-time'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 ml-4">
                  {reminder.status === 'ACTIVE' && (
                    <button
                      onClick={() => setShowConfirm({ id: reminder.id, action: 'pause' })}
                      disabled={actionLoading === reminder.id}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 text-sm font-medium"
                    >
                      ⏸ Pause
                    </button>
                  )}
                  {reminder.status === 'PAUSED' && (
                    <button
                      onClick={() => performAction(reminder.id, 'resume')}
                      disabled={actionLoading === reminder.id}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 text-sm font-medium"
                    >
                      ▶ Resume
                    </button>
                  )}
                  {(reminder.status === 'PENDING' || reminder.status === 'ACTIVE') && (
                    <button
                      onClick={() => setShowConfirm({ id: reminder.id, action: 'cancel' })}
                      disabled={actionLoading === reminder.id}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 text-sm font-medium"
                    >
                      ✕ Cancel
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-2xl"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Confirm {showConfirm.action}
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to {showConfirm.action} this reminder?
                {showConfirm.action === 'cancel' && ' This action cannot be undone.'}
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowConfirm(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => performAction(showConfirm.id, showConfirm.action)}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
