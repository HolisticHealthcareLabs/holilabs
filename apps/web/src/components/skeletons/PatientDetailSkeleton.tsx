/**
 * Patient Detail Page Skeleton
 */

import { SkeletonBox, SkeletonCard, SkeletonText, SkeletonAvatar } from './SkeletonBase';

export function PatientDetailSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Patient Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-start gap-6">
          <SkeletonAvatar size="lg" />
          <div className="flex-1">
            <SkeletonBox className="h-8 w-64 rounded mb-2" />
            <div className="flex gap-4 mb-4">
              <SkeletonBox className="h-5 w-32 rounded" />
              <SkeletonBox className="h-5 w-32 rounded" />
              <SkeletonBox className="h-5 w-32 rounded" />
            </div>
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonBox key={i} className="h-8 w-24 rounded-full" />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <SkeletonBox key={i} className="h-10 w-10 rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-8 px-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBox key={i} className="h-12 w-24 rounded-t" />
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <SkeletonBox className="h-5 w-32 rounded mb-2" />
                <SkeletonBox className="h-8 w-20 rounded" />
              </div>
            ))}
          </div>

          {/* Content Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Demographics */}
            <div>
              <SkeletonBox className="h-6 w-48 rounded mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <SkeletonBox className="h-5 w-32 rounded" />
                    <SkeletonBox className="h-5 w-40 rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <SkeletonBox className="h-6 w-48 rounded mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <SkeletonBox className="w-8 h-8 rounded flex-shrink-0" />
                    <div className="flex-1">
                      <SkeletonBox className="h-5 w-3/4 rounded mb-2" />
                      <SkeletonBox className="h-4 w-1/2 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="mt-6">
            <SkeletonBox className="h-6 w-48 rounded mb-4" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <SkeletonBox className="w-3 h-3 rounded-full" />
                    {i < 3 && <SkeletonBox className="w-0.5 h-16 rounded" />}
                  </div>
                  <div className="flex-1 pb-8">
                    <SkeletonBox className="h-5 w-48 rounded mb-2" />
                    <SkeletonBox className="h-4 w-32 rounded mb-3" />
                    <SkeletonText lines={2} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
