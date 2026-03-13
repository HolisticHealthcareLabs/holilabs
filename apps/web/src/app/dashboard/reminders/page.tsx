'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import {
  Calendar, Send, AlertTriangle, Clock,
  FileText, CheckCircle2, XCircle,
} from 'lucide-react';

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
  const t = useTranslations('reminders');
  const [activeTab, setActiveTab] = useState<Tab>('templates');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const TAB_CONFIG: Array<{ id: Tab; label: string; Icon: typeof FileText }> = [
    { id: 'templates', label: t('tabs.templates'), Icon: FileText },
    { id: 'scheduled', label: t('tabs.scheduled'), Icon: Calendar },
    { id: 'sent', label: t('tabs.sent'), Icon: CheckCircle2 },
    { id: 'failed', label: t('tabs.failed'), Icon: AlertTriangle },
  ];

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
    } catch {
      // Stats unavailable -- show zeros
    } finally {
      setLoadingStats(false);
    }
  };

  const formatTimeUntil = (date: Date) => {
    const now = new Date();
    const diff = new Date(date).getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {t('subtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-blue-200/60 dark:border-blue-500/20 bg-white dark:bg-gray-900 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('stats.scheduled')}</span>
          </div>
          {loadingStats ? (
            <div className="h-8 w-12 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          ) : (
            <p className="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
              {stats?.totalScheduled ?? 0}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-emerald-200/60 dark:border-emerald-500/20 bg-white dark:bg-gray-900 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('stats.sentToday')}</span>
          </div>
          {loadingStats ? (
            <div className="h-8 w-12 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          ) : (
            <>
              <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {stats?.sentToday ?? 0}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                {stats?.successRate ?? 100}% {t('stats.successRate')}
              </p>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-red-200/60 dark:border-red-500/20 bg-white dark:bg-gray-900 p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('stats.failed')}</span>
          </div>
          {loadingStats ? (
            <div className="h-8 w-12 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          ) : (
            <p className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">
              {stats?.failedThisWeek ?? 0}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-violet-200/60 dark:border-violet-500/20 bg-white dark:bg-gray-900 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('stats.next')}</span>
          </div>
          {loadingStats ? (
            <div className="h-8 w-12 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          ) : stats?.nextScheduled ? (
            <>
              <p className="text-2xl font-bold tabular-nums text-violet-600 dark:text-violet-400">
                {formatTimeUntil(stats.nextScheduled.scheduledFor)}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 truncate">
                {stats.nextScheduled.templateName}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">{t('stats.noneScheduled')}</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="flex items-center gap-1.5 px-5 py-3 border-b border-gray-100 dark:border-gray-800">
          {TAB_CONFIG.map((tab) => {
            const isActive = activeTab === tab.id;
            const TabIcon = tab.Icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                  ${isActive
                    ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }
                `}
              >
                <TabIcon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-5">
          {activeTab === 'templates' && <MessageTemplateEditor />}
          {activeTab === 'scheduled' && <ScheduledRemindersTable onUpdate={fetchStats} />}
          {activeTab === 'sent' && <SentRemindersTable />}
          {activeTab === 'failed' && <FailedRemindersTable onUpdate={fetchStats} />}
        </div>
      </div>
    </div>
  );
}
