/**
 * Analytics Page Skeleton
 */

import { SkeletonBox, SkeletonCard } from './SkeletonBase';

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <SkeletonBox className="h-8 w-48 rounded mb-2" />
          <SkeletonBox className="h-5 w-64 rounded" />
        </div>
        <div className="flex gap-2">
          <SkeletonBox className="h-10 w-32 rounded-lg" />
          <SkeletonBox className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <SkeletonBox className="h-5 w-24 rounded" />
              <SkeletonBox className="w-10 h-10 rounded-lg" />
            </div>
            <SkeletonBox className="h-8 w-20 rounded mb-2" />
            <div className="flex items-center gap-2">
              <SkeletonBox className="h-4 w-12 rounded" />
              <SkeletonBox className="h-4 w-24 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <SkeletonBox className="h-6 w-40 rounded" />
            <SkeletonBox className="h-8 w-32 rounded" />
          </div>
          <SkeletonBox className="h-64 w-full rounded" />
        </div>

        {/* Bar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <SkeletonBox className="h-6 w-40 rounded" />
            <SkeletonBox className="h-8 w-32 rounded" />
          </div>
          <SkeletonBox className="h-64 w-full rounded" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <SkeletonBox className="h-6 w-48 rounded" />
            <SkeletonBox className="h-8 w-32 rounded" />
          </div>
        </div>
        <div className="p-4">
          {/* Table Header */}
          <div className="grid grid-cols-5 gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBox key={i} className="h-5 w-full rounded" />
            ))}
          </div>
          {/* Table Rows */}
          {Array.from({ length: 6 }).map((_, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-5 gap-4 py-4 border-b border-gray-100 dark:border-gray-800">
              {Array.from({ length: 5 }).map((_, colIndex) => (
                <SkeletonBox key={colIndex} className="h-5 w-full rounded" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
