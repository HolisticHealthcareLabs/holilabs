/**
 * Portal Skeleton Loaders
 *
 * Specialized skeleton components for patient portal pages
 * Matches the portal's gradient-based design system
 */

'use client';

import { SkeletonBox, SkeletonText } from './SkeletonBase';

/**
 * Skeleton for portal dashboard stat cards
 */
export function PortalStatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        {/* Icon placeholder */}
        <SkeletonBox className="w-12 h-12 rounded-lg" />
        {/* Badge placeholder */}
        <SkeletonBox className="w-8 h-8 rounded-full" />
      </div>
      <SkeletonBox className="h-5 w-24 rounded mb-2" />
      <SkeletonBox className="h-8 w-16 rounded mb-3" />
      <SkeletonBox className="h-4 w-full rounded" />
    </div>
  );
}

/**
 * Skeleton for portal dashboard
 */
export function PortalDashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg p-8 animate-pulse">
        <SkeletonBox className="h-8 w-64 rounded bg-white/20 mb-2" />
        <SkeletonBox className="h-5 w-48 rounded bg-white/20" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <PortalStatCardSkeleton key={i} />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <SkeletonBox className="h-6 w-40 rounded mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBox key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for appointment card
 */
export function AppointmentCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
      <div className="flex items-start gap-4">
        {/* Date box */}
        <div className="flex-shrink-0">
          <SkeletonBox className="w-20 h-24 rounded-lg" />
        </div>

        {/* Content */}
        <div className="flex-1 space-y-3">
          <SkeletonBox className="h-6 w-3/4 rounded" />
          <SkeletonBox className="h-4 w-1/2 rounded" />
          <SkeletonBox className="h-4 w-2/3 rounded" />

          {/* Footer buttons */}
          <div className="flex items-center gap-3 pt-2">
            <SkeletonBox className="h-10 w-32 rounded-lg" />
            <SkeletonBox className="h-10 w-32 rounded-lg" />
          </div>
        </div>

        {/* Status badge */}
        <SkeletonBox className="w-24 h-6 rounded-full" />
      </div>
    </div>
  );
}

/**
 * Skeleton for appointments list
 */
export function AppointmentsListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <SkeletonBox className="h-8 w-48 rounded" />
        <SkeletonBox className="h-10 w-40 rounded-lg" />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex gap-4">
          <SkeletonBox className="h-10 flex-1 rounded-lg" />
          <SkeletonBox className="h-10 flex-1 rounded-lg" />
        </div>
      </div>

      {/* Appointment cards */}
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <AppointmentCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for medication card
 */
export function MedicationCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <SkeletonBox className="w-12 h-12 rounded-lg flex-shrink-0" />

        {/* Content */}
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <SkeletonBox className="h-6 w-3/4 rounded" />
              <SkeletonBox className="h-4 w-1/2 rounded" />
            </div>
            <SkeletonBox className="w-20 h-6 rounded-full ml-4" />
          </div>

          {/* Dosage info */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-2">
              <SkeletonBox className="h-3 w-16 rounded" />
              <SkeletonBox className="h-5 w-24 rounded" />
            </div>
            <div className="space-y-2">
              <SkeletonBox className="h-3 w-16 rounded" />
              <SkeletonBox className="h-5 w-24 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for medications list
 */
export function MedicationsListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <SkeletonBox className="h-8 w-48 rounded" />
        <SkeletonBox className="h-10 w-32 rounded-lg" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        <SkeletonBox className="h-10 w-24 rounded-lg" />
        <SkeletonBox className="h-10 w-24 rounded-lg" />
        <SkeletonBox className="h-10 w-24 rounded-lg" />
      </div>

      {/* Medication cards */}
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <MedicationCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for lab result card
 */
export function LabResultCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <SkeletonBox className="w-12 h-12 rounded-lg" />
          <div className="space-y-2">
            <SkeletonBox className="h-5 w-40 rounded" />
            <SkeletonBox className="h-4 w-32 rounded" />
          </div>
        </div>
        <SkeletonBox className="w-20 h-6 rounded-full" />
      </div>

      {/* Value */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2 mb-2">
          <SkeletonBox className="h-12 w-20 rounded" />
          <SkeletonBox className="h-6 w-16 rounded" />
        </div>
        {/* Range bar */}
        <SkeletonBox className="h-2 w-full rounded-full" />
      </div>

      {/* Doctor notes */}
      <SkeletonBox className="h-20 w-full rounded-lg" />
    </div>
  );
}

/**
 * Skeleton for lab results page
 */
export function LabResultsPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex gap-4">
          <SkeletonBox className="h-10 flex-1 rounded-lg" />
          <SkeletonBox className="h-10 flex-1 rounded-lg" />
        </div>
      </div>

      {/* Results grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <LabResultCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for risk score card
 */
export function RiskScoreCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <SkeletonBox className="w-20 h-20 rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonBox className="h-6 w-48 rounded" />
          <SkeletonBox className="h-4 w-64 rounded" />
        </div>
      </div>
      <SkeletonBox className="h-10 w-full rounded-lg" />
    </div>
  );
}

/**
 * Skeleton for prevention hub page
 */
export function PreventionPageSkeleton() {
  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBox key={i} className="h-12 w-40 rounded-lg flex-shrink-0" />
        ))}
      </div>

      {/* Risk scores grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <RiskScoreCardSkeleton key={i} />
        ))}
      </div>

      {/* Interventions list */}
      <div className="space-y-4">
        <SkeletonBox className="h-6 w-48 rounded" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                <SkeletonBox className="h-6 w-3/4 rounded" />
                <SkeletonBox className="h-4 w-1/2 rounded" />
                <SkeletonBox className="h-4 w-2/3 rounded" />
              </div>
              <SkeletonBox className="w-24 h-6 rounded-full ml-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for health record document
 */
export function HealthRecordSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
      <div className="flex items-start gap-4">
        <SkeletonBox className="w-12 h-12 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <SkeletonBox className="h-6 w-3/4 rounded" />
          <SkeletonBox className="h-4 w-1/2 rounded" />
          <div className="flex items-center gap-4 pt-2">
            <SkeletonBox className="h-4 w-24 rounded" />
            <SkeletonBox className="h-4 w-32 rounded" />
          </div>
        </div>
        <SkeletonBox className="w-10 h-10 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Skeleton for health records page
 */
export function HealthRecordsPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex gap-4">
          <SkeletonBox className="h-10 flex-1 rounded-lg" />
          <SkeletonBox className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* Documents list */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <HealthRecordSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
