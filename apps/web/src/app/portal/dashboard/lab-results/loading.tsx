/**
 * Lab Results Loading State
 *
 * Displays skeleton loaders while lab results data is being fetched
 */

import { LabResultsPageSkeleton } from '@/components/skeletons/PortalSkeletons';

export default function LabResultsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="h-10 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3" />
          <div className="h-5 w-full max-w-2xl bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>

        <LabResultsPageSkeleton />
      </div>
    </div>
  );
}
