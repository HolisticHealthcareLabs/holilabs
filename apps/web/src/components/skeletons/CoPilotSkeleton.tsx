/**
 * Co-Pilot Page Skeleton
 */

import { SkeletonBox, SkeletonText } from './SkeletonBase';

export function CoPilotSkeleton() {
  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50/50 via-gray-50 to-purple-50/50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Left Sidebar - Patient List */}
      <div className="w-80 bg-white/80 dark:bg-gray-800/80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <SkeletonBox className="h-6 w-32 rounded mb-3" />
          <SkeletonBox className="h-10 w-full rounded-lg" />
        </div>

        {/* Patient List */}
        <div className="flex-1 overflow-hidden p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
            >
              <SkeletonBox className="w-10 h-10 rounded-full flex-shrink-0" />
              <div className="flex-1">
                <SkeletonBox className="h-4 w-3/4 rounded mb-2" />
                <SkeletonBox className="h-3 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <div className="h-16 bg-white/80 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <SkeletonBox className="w-10 h-10 rounded-full" />
            <div>
              <SkeletonBox className="h-5 w-40 rounded mb-1" />
              <SkeletonBox className="h-4 w-24 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SkeletonBox className="h-10 w-32 rounded-lg" />
            <SkeletonBox className="h-10 w-32 rounded-lg" />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 grid grid-cols-2 gap-6">
          {/* Left Column - Transcript/Audio */}
          <div className="space-y-6">
            {/* Audio Controls */}
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <SkeletonBox className="h-6 w-32 rounded" />
                <SkeletonBox className="h-8 w-24 rounded" />
              </div>
              <SkeletonBox className="h-24 w-full rounded-xl mb-4" />
              <div className="flex items-center justify-center gap-4">
                <SkeletonBox className="w-16 h-16 rounded-full" />
              </div>
            </div>

            {/* Transcript */}
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg flex-1">
              <SkeletonBox className="h-6 w-24 rounded mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i}>
                    <SkeletonBox className="h-3 w-16 rounded mb-1" />
                    <SkeletonText lines={2} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - SOAP/Tools */}
          <div className="space-y-6">
            {/* SOAP Note */}
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <SkeletonBox className="h-6 w-32 rounded" />
                <SkeletonBox className="h-8 w-20 rounded" />
              </div>

              {/* SOAP Tabs */}
              <div className="flex gap-2 mb-4">
                {['S', 'O', 'A', 'P'].map((letter, i) => (
                  <SkeletonBox key={i} className="h-10 w-16 rounded-lg" />
                ))}
              </div>

              {/* Note Content */}
              <div className="space-y-3">
                <SkeletonText lines={4} />
              </div>
            </div>

            {/* Diagnosis Assistant */}
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
              <SkeletonBox className="h-6 w-40 rounded mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <SkeletonBox className="h-5 w-3/4 rounded mb-2" />
                    <SkeletonBox className="h-4 w-1/2 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
