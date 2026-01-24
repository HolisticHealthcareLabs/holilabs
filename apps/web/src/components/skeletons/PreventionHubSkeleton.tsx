/**
 * Prevention Hub Page Skeleton
 */

import { SkeletonBox, SkeletonCard, SkeletonText } from './SkeletonBase';

export function PreventionHubSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header with patient info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <SkeletonBox className="w-12 h-12 rounded-full" />
            <div>
              <SkeletonBox className="h-7 w-48 rounded mb-2" />
              <SkeletonBox className="h-5 w-32 rounded" />
            </div>
          </div>
          <div className="flex gap-2">
            <SkeletonBox className="h-10 w-32 rounded-lg" />
            <SkeletonBox className="h-10 w-32 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Risk Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <SkeletonBox className="h-5 w-24 rounded" />
              <SkeletonBox className="h-8 w-16 rounded" />
            </div>
            <SkeletonBox className="h-3 w-full rounded-full mb-2" />
            <SkeletonBox className="h-4 w-32 rounded" />
          </div>
        ))}
      </div>

      {/* Health Domains Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <SkeletonBox className="h-6 w-48 rounded mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
              <SkeletonBox className="w-12 h-12 rounded-full mx-auto mb-2" />
              <SkeletonBox className="h-4 w-20 mx-auto rounded mb-1" />
              <SkeletonBox className="h-3 w-16 mx-auto rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interventions List */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <SkeletonBox className="h-6 w-48 rounded" />
            <SkeletonBox className="h-8 w-32 rounded" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <SkeletonBox className="w-10 h-10 rounded" />
                    <div>
                      <SkeletonBox className="h-5 w-48 rounded mb-1" />
                      <SkeletonBox className="h-4 w-32 rounded" />
                    </div>
                  </div>
                  <SkeletonBox className="h-6 w-20 rounded-full" />
                </div>
                <div className="flex gap-2 mt-3">
                  <SkeletonBox className="h-8 w-24 rounded" />
                  <SkeletonBox className="h-8 w-24 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Sidebar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <SkeletonBox className="h-6 w-32 rounded mb-4" />
          <div className="space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <SkeletonBox className="w-3 h-3 rounded-full" />
                  {i < 3 && <SkeletonBox className="w-0.5 h-20 rounded" />}
                </div>
                <div className="flex-1">
                  <SkeletonBox className="h-4 w-24 rounded mb-2" />
                  <SkeletonBox className="h-5 w-full rounded mb-1" />
                  <SkeletonText lines={2} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
