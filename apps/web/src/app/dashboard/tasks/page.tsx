'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import TaskManagementPanel from '@/components/tasks/TaskManagementPanel';

interface TaskStats {
  totalPending: number;
  urgent: number;
  dueToday: number;
  overdue: number;
}

export default function TasksPage() {
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tasks/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch task stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Task Management</h1>
          <p className="text-gray-600">Manage your daily tasks and priorities</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-100 h-32 rounded-xl animate-pulse" />
            ))
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0 }}
                className="bg-white rounded-xl shadow-lg p-6 border border-blue-100"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">Total Pending</h3>
                  <span className="text-2xl">📋</span>
                </div>
                <p className="text-3xl font-bold text-blue-600">{stats?.totalPending || 0}</p>
                <p className="text-xs text-gray-500 mt-2">Active tasks</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl shadow-lg p-6 border border-red-100"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">Urgent</h3>
                  <span className="text-2xl">🔴</span>
                </div>
                <p className="text-3xl font-bold text-red-600">{stats?.urgent || 0}</p>
                <p className="text-xs text-gray-500 mt-2">Requires immediate attention</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl shadow-lg p-6 border border-green-100"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">Due Today</h3>
                  <span className="text-2xl">📅</span>
                </div>
                <p className="text-3xl font-bold text-green-600">{stats?.dueToday || 0}</p>
                <p className="text-xs text-gray-500 mt-2">Tasks due today</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl shadow-lg p-6 border border-orange-100"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">Overdue</h3>
                  <span className="text-2xl">⚠️</span>
                </div>
                <p className="text-3xl font-bold text-orange-600">{stats?.overdue || 0}</p>
                <p className="text-xs text-gray-500 mt-2">Past due date</p>
              </motion.div>
            </>
          )}
        </div>

        {/* Task Management Panel */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <TaskManagementPanel userId="system" compact={false} />
        </div>

        {/* Quick Tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 Quick Tips</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span><strong>Priority Colors:</strong> Red (Urgent), Orange (High), Blue (Normal), Gray (Low)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span><strong>Start:</strong> Mark a task as "In Progress" to track active work</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span><strong>Complete:</strong> Mark tasks as done when finished</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span><strong>Dismiss:</strong> Remove tasks that are no longer relevant</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span><strong>Auto-generated:</strong> Some tasks are automatically created by the system based on patient activity</span>
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
