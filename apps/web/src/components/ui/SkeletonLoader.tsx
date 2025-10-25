/**
 * Skeleton Loader Components
 *
 * Hospital-grade skeleton loaders with:
 * - Shimmer animation effect (Apple-inspired)
 * - Dark mode support
 * - Design token integration
 * - Multiple variants for different content types
 * - Accessibility support
 */

import { motion } from 'framer-motion';

/**
 * Base Skeleton component with shimmer effect
 */
interface SkeletonProps {
  className?: string;
  children?: React.ReactNode;
}

export function Skeleton({ className = '', children }: SkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden bg-neutral-200 dark:bg-neutral-800 rounded ${className}`}
      role="status"
      aria-label="Loading"
    >
      {/* Shimmer overlay */}
      <div
        className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent"
        aria-hidden="true"
      />
      {children}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="w-12 h-12 rounded-lg" />
        <Skeleton className="w-16 h-6" />
      </div>
      <div className="space-y-3">
        <Skeleton className="w-24 h-4" />
        <Skeleton className="w-32 h-8" />
        <Skeleton className="w-40 h-3" />
      </div>
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <tr>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="w-32 h-4" />
            <Skeleton className="w-24 h-3" />
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <Skeleton className="w-20 h-6 rounded-full" />
      </td>
      <td className="px-6 py-4">
        <Skeleton className="w-24 h-4" />
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <Skeleton className="w-16 h-8" />
          <Skeleton className="w-16 h-8" />
        </div>
      </td>
    </tr>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
            <tr>
              <th className="px-6 py-3 text-left">
                <Skeleton className="w-20 h-4" />
              </th>
              <th className="px-6 py-3 text-left">
                <Skeleton className="w-16 h-4" />
              </th>
              <th className="px-6 py-3 text-left">
                <Skeleton className="w-24 h-4" />
              </th>
              <th className="px-6 py-3 text-right">
                <Skeleton className="w-20 h-4 ml-auto" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {Array.from({ length: rows }).map((_, i) => (
              <TableRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="w-3/4 h-4" />
              <Skeleton className="w-1/2 h-3" />
            </div>
            <Skeleton className="w-20 h-8" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-6">
      <div className="space-y-4">
        <Skeleton className="w-32 h-5" />
        <Skeleton className="w-full h-10" />
      </div>
      <div className="space-y-4">
        <Skeleton className="w-32 h-5" />
        <Skeleton className="w-full h-10" />
      </div>
      <div className="space-y-4">
        <Skeleton className="w-32 h-5" />
        <Skeleton className="w-full h-24" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="w-24 h-10" />
        <Skeleton className="w-32 h-10" />
      </div>
    </div>
  );
}

export function PatientCardSkeleton() {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
      <div className="flex items-start gap-4 mb-4">
        <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="w-40 h-5" />
          <Skeleton className="w-32 h-4" />
          <Skeleton className="w-48 h-4" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
        <div className="space-y-2">
          <Skeleton className="w-16 h-3" />
          <Skeleton className="w-20 h-5" />
        </div>
        <div className="space-y-2">
          <Skeleton className="w-16 h-3" />
          <Skeleton className="w-20 h-5" />
        </div>
        <div className="space-y-2">
          <Skeleton className="w-16 h-3" />
          <Skeleton className="w-20 h-5" />
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      {/* Chart Area */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
        <Skeleton className="w-48 h-6 mb-4" />
        <Skeleton className="w-full h-64" />
      </div>

      {/* Table */}
      <TableSkeleton rows={5} />
    </div>
  );
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export function LoadingSpinner({ size = 'md', color = 'border-primary-600 dark:border-primary-400' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className={`animate-spin rounded-full ${sizeClasses[size]} border-t-transparent ${color}`} />
  );
}

export function FullPageLoader({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-50 to-purple-50 dark:from-neutral-950 dark:to-neutral-900">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <LoadingSpinner size="lg" />
        <p className="text-neutral-600 dark:text-neutral-400 mt-4 text-lg">{message}</p>
      </motion.div>
    </div>
  );
}

export function InlineLoader({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <LoadingSpinner size="md" />
        {message && <p className="text-neutral-600 dark:text-neutral-400 mt-2 text-sm">{message}</p>}
      </div>
    </div>
  );
}
