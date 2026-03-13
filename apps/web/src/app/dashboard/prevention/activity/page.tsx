'use client';

/**
 * Prevention Activity Feed Page
 *
 * Shows recent prevention-related activities across the system
 */

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import ActivityFeed from '@/components/prevention/ActivityFeed';
import QuickActionsPanel from '@/components/prevention/QuickActionsPanel';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function ActivityPageContent() {
  const t = useTranslations('portal.preventionActivity');
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard/prevention"
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            {t('backToHub')}
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {t('title')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {t('subtitle')}
              </p>
            </div>

            <Link
              href="/dashboard/prevention/audit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('viewAuditLog')}
            </Link>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="mb-6">
          <QuickActionsPanel maxActions={6} />
        </div>

        {/* Activity Feed */}
        <div className="grid grid-cols-1 gap-6">
          {/* Main Activity Feed */}
          <div>
            <ActivityFeed
              showHeader={true}
              limit={50}
              maxHeight="calc(100vh - 400px)"
            />
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InfoCard
              title={t('activePlans')}
              description={t('activePlansDesc')}
              href="/dashboard/prevention/plans"
              icon="📋"
              color="blue"
            />
            <InfoCard
              title={t('templates')}
              description={t('templatesDesc')}
              href="/dashboard/prevention/templates"
              icon="📑"
              color="purple"
            />
            <InfoCard
              title={t('advancedSearch')}
              description={t('advancedSearchDesc')}
              href="/dashboard/prevention/search"
              icon="🔍"
              color="green"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface InfoCardProps {
  title: string;
  description: string;
  href: string;
  icon: string;
  color: 'blue' | 'purple' | 'green' | 'orange';
}

function InfoCard({ title, description, href, icon, color }: InfoCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:border-blue-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:border-purple-400',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:border-green-400',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 hover:border-orange-400',
  };

  return (
    <Link
      href={href}
      className={`${colorClasses[color]} p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-md group`}
    >
      <div className="flex items-start space-x-4">
        <div className="text-3xl">{icon}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:underline">
            {title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}

function ActivityLoading() {
  const t = useTranslations('portal.preventionActivity');
  return <div className="p-6">{t('loading')}</div>;
}

export default function ActivityPage() {
  return (
    <Suspense fallback={<ActivityLoading />}>
      <ActivityPageContent />
    </Suspense>
  );
}
