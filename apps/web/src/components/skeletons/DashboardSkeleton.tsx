/**
 * Dashboard Home Page Skeleton
 */

import { SkeletonBox, SkeletonCard, SkeletonText } from './SkeletonBase';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <SkeletonBox className="h-10 w-64 rounded mb-2" />
        <SkeletonBox className="h-5 w-48 rounded" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
          >
            <SkeletonBox className="h-5 w-32 rounded mb-3" />
            <SkeletonBox className="h-8 w-20 rounded mb-2" />
            <SkeletonBox className="h-4 w-24 rounded" />
          </div>
        ))}
      </div>

      {/* Main Content - Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <SkeletonBox className="h-6 w-48 rounded mb-6" />
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <SkeletonBox className="w-12 h-12 rounded-full flex-shrink-0" />
                  <div className="flex-1">
                    <SkeletonBox className="h-5 w-3/4 rounded mb-2" />
                    <SkeletonBox className="h-4 w-1/2 rounded" />
                  </div>
                  <SkeletonBox className="w-20 h-4 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar - Quick Actions */}
        <div className="space-y-6">
          {/* Today's Schedule */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <SkeletonBox className="h-6 w-40 rounded mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <SkeletonBox className="h-5 w-32 rounded mb-2" />
                  <SkeletonBox className="h-4 w-24 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <SkeletonBox className="h-6 w-32 rounded mb-4" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBox key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
