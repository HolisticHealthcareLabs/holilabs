'use client';

/**
 * Reminders Management Dashboard
 *
 * Tabs: Templates | Scheduled | Sent | Failed
 * Features: Statistics cards, table views, actions (cancel/pause/resume/retry)
 *
 * Note: Configured as dynamic route to prevent SSR issues with react-pdf in child components
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

// Dynamically import components that may use react-pdf (SSR-incompatible)
const MessageTemplateEditor = dynamic(() => import('@/components/messaging/MessageTemplateEditor'), { ssr: false });
const ScheduledRemindersTable = dynamic(() => import('@/components/messaging/ScheduledRemindersTable'), { ssr: false });
const SentRemindersTable = dynamic(() => import('@/components/messaging/SentRemindersTable'), { ssr: false });
const FailedRemindersTable = dynamic(() => import('@/components/messaging/FailedRemindersTable'), { ssr: false });

type Tab = 'templates' | 'scheduled' | 'sent' | 'failed';

interface Stats {
  totalScheduled: number;
  sentToday: number;
  successRate: number;
  failedThisWeek: number;
  nextScheduled: {
    id: string;
    templateName: string;
    scheduledFor: Date;
  } | null;
}

export default function RemindersPage() {
  const [activeTab, setActiveTab] = useState<Tab>('templates');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Fetch statistics
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const response = await fetch('/api/reminders/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const formatTimeUntil = (date: Date) => {
    const now = new Date();
    const diff = new Date(date).getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'templates', label: 'Templates', icon: '📝' },
    { id: 'scheduled', label: 'Scheduled', icon: '📅' },
    { id: 'sent', label: 'Sent', icon: '✅' },
    { id: 'failed', label: 'Failed', icon: '⚠️' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Reminder Management
        </h1>
        <p className="text-gray-600">
          Create templates, schedule reminders, and track delivery
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Scheduled */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6 border border-blue-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Scheduled</p>
              {loadingStats ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <h3 className="text-3xl font-bold text-blue-600">
                  {stats?.totalScheduled || 0}
                </h3>
              )}
            </div>
            <div className="text-4xl">📅</div>
          </div>
        </motion.div>

        {/* Sent Today */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-lg p-6 border border-green-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Sent Today</p>
              {loadingStats ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <>
                  <h3 className="text-3xl font-bold text-green-600">
                    {stats?.sentToday || 0}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats?.successRate || 100}% success rate
                  </p>
                </>
              )}
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </motion.div>

        {/* Failed This Week */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg p-6 border border-red-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Failed This Week</p>
              {loadingStats ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <h3 className="text-3xl font-bold text-red-600">
                  {stats?.failedThisWeek || 0}
                </h3>
              )}
            </div>
            <div className="text-4xl">⚠️</div>
          </div>
        </motion.div>

        {/* Next Scheduled */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-lg p-6 border border-purple-100"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-1">Next Scheduled</p>
              {loadingStats ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : stats?.nextScheduled ? (
                <>
                  <h3 className="text-2xl font-bold text-purple-600">
                    {formatTimeUntil(stats.nextScheduled.scheduledFor)}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {stats.nextScheduled.templateName}
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-400">None scheduled</p>
              )}
            </div>
            <div className="text-4xl">⏰</div>
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'templates' && (
              <motion.div
                key="templates"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <MessageTemplateEditor />
              </motion.div>
            )}

            {activeTab === 'scheduled' && (
              <motion.div
                key="scheduled"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <ScheduledRemindersTable onUpdate={fetchStats} />
              </motion.div>
            )}

            {activeTab === 'sent' && (
              <motion.div
                key="sent"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <SentRemindersTable />
              </motion.div>
            )}

            {activeTab === 'failed' && (
              <motion.div
                key="failed"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <FailedRemindersTable onUpdate={fetchStats} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
