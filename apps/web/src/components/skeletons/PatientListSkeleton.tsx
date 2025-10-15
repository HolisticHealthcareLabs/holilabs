/**
 * Patient List Page Skeleton
 */

import { SkeletonBox, SkeletonTable } from './SkeletonBase';

export function PatientListSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <SkeletonBox className="h-10 w-48 rounded mb-2" />
          <SkeletonBox className="h-5 w-64 rounded" />
        </div>
        <SkeletonBox className="h-10 w-40 rounded-lg" />
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <SkeletonBox className="h-10 flex-1 rounded-lg" />
          <SkeletonBox className="h-10 w-32 rounded-lg" />
          <SkeletonBox className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* Patient Table */}
      <SkeletonTable rows={10} columns={6} />

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <SkeletonBox className="h-5 w-40 rounded" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBox key={i} className="h-10 w-10 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
