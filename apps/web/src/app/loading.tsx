/**
 * Root Loading State
 *
 * Displayed while the root layout is loading.
 * Provides a professional loading experience with skeleton UI.
 */

export default function RootLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="text-center">
        {/* Logo Skeleton */}
        <div className="mb-8 flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl animate-pulse" />
        </div>

        {/* Loading Spinner */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-700 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
        </div>

        {/* Loading Text */}
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Cargando HoliLabs
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Preparando tu experiencia...
        </p>
      </div>
    </div>
  );
}
