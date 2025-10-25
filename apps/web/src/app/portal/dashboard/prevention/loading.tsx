/**
 * Prevention Hub Loading State
 *
 * Displays skeleton loaders while prevention data is being fetched
 */

import { PreventionPageSkeleton } from '@/components/skeletons/PortalSkeletons';

export default function PreventionLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-5xl">🛡️</span>
            <div className="flex-1">
              <div className="h-9 w-80 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
              <div className="h-5 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        </div>

        <PreventionPageSkeleton />
      </div>
    </div>
  );
}
