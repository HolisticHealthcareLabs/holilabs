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

export function Skeleton({ className = '', children, style }: SkeletonProps & { style?: React.CSSProperties }) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)', ...style }}
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
    <div
      className="p-6"
      style={{ backgroundColor: 'var(--surface-primary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="w-12 h-12" style={{ borderRadius: 'var(--radius-lg)' }} />
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
          <Skeleton className="w-10 h-10" style={{ borderRadius: 'var(--radius-full)' }} />
          <div className="space-y-2">
            <Skeleton className="w-32 h-4" />
            <Skeleton className="w-24 h-3" />
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <Skeleton className="w-20 h-6" style={{ borderRadius: 'var(--radius-full)' }} />
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
    <div
      className="overflow-hidden"
      style={{ backgroundColor: 'var(--surface-primary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)' }}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead
            style={{ backgroundColor: 'var(--surface-secondary)', borderBottom: '1px solid var(--border-default)' }}
          >
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
          <tbody style={{ borderColor: 'var(--border-default)' }} className="divide-y">
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
        <div
          key={i}
          className="p-4"
          style={{ backgroundColor: 'var(--surface-primary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)' }}
        >
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 flex-shrink-0" style={{ borderRadius: 'var(--radius-lg)' }} />
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
    <div
      className="p-6 space-y-6"
      style={{ backgroundColor: 'var(--surface-primary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)' }}
    >
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
    <div
      className="p-6"
      style={{ backgroundColor: 'var(--surface-primary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)' }}
    >
      <div className="flex items-start gap-4 mb-4">
        <Skeleton className="w-16 h-16 flex-shrink-0" style={{ borderRadius: 'var(--radius-full)' }} />
        <div className="flex-1 space-y-2">
          <Skeleton className="w-40 h-5" />
          <Skeleton className="w-32 h-4" />
          <Skeleton className="w-48 h-4" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 pt-4" style={{ borderTop: '1px solid var(--border-default)' }}>
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
      <div
        className="p-6"
        style={{ backgroundColor: 'var(--surface-primary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)' }}
      >
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

export function LoadingSpinner({ size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-16 space-y-1.5',
    md: 'w-32 space-y-2',
    lg: 'w-48 space-y-2.5',
  };
  const barHeight = { sm: 'h-2', md: 'h-3', lg: 'h-3.5' };

  return (
    <div className={`animate-pulse ${sizeClasses[size]}`} role="status" aria-label="Loading">
      <div className={`${barHeight[size]} w-full`} style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }} />
      <div className={`${barHeight[size]} w-3/4`} style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }} />
      <div className={`${barHeight[size]} w-1/2`} style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }} />
    </div>
  );
}

export function FullPageLoader({ message }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-50 to-purple-50 dark:from-neutral-950 dark:to-neutral-900">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md px-8 animate-pulse space-y-4"
      >
        <div className="h-6 w-40 mx-auto" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }} />
        <div className="h-4 w-56 mx-auto" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }} />
        <div className="space-y-3 mt-6">
          <div className="h-12" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-xl)' }} />
          <div className="h-12" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-xl)' }} />
          <div className="h-12 w-3/4" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-xl)' }} />
        </div>
        {message && <p className="mt-4 text-sm text-center" style={{ color: 'var(--text-muted)' }}>{message}</p>}
      </motion.div>
    </div>
  );
}

export function InlineLoader({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-pulse space-y-2 w-48">
        <div className="h-3 w-full" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }} />
        <div className="h-3 w-2/3" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }} />
        {message && <p className="mt-3 text-sm text-center" style={{ color: 'var(--text-muted)' }}>{message}</p>}
      </div>
    </div>
  );
}
