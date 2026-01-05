/**
 * Portal Loading State
 *
 * Displayed while portal pages are loading.
 * Provides a skeleton UI that matches the portal layout.
 */

export default function PortalLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header Skeleton */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-32 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="w-24 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="w-48 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="w-96 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>

        {/* Cards Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-4" />
              <div className="w-32 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
              <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
              <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
