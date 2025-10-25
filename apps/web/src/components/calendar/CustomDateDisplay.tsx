'use client';

/**
 * Custom Date Display Component
 *
 * Displays date in the format requested:
 * - Large bold day number at top (48px)
 * - Smaller month and year below (16px)
 *
 * Example:
 *   ┌─────────────┐
 *   │     24      │ ← Large, bold
 *   │ Octubre 2025│ ← Smaller
 *   └─────────────┘
 */

import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CustomDateDisplayProps {
  date: Date;
  className?: string;
  variant?: 'default' | 'compact' | 'large';
}

export function CustomDateDisplay({
  date,
  className = '',
  variant = 'default',
}: CustomDateDisplayProps) {
  const dayNumber = format(date, 'd', { locale: es });
  const monthYear = format(date, 'MMMM yyyy', { locale: es });

  // Variant styles
  const variantStyles = {
    default: {
      container: 'flex flex-col items-center justify-center',
      dayNumber: 'text-5xl font-bold text-gray-900 dark:text-white leading-none',
      monthYear: 'text-sm font-normal text-gray-600 dark:text-gray-400 mt-1',
    },
    compact: {
      container: 'flex flex-col items-center justify-center',
      dayNumber: 'text-3xl font-bold text-gray-900 dark:text-white leading-none',
      monthYear: 'text-xs font-normal text-gray-600 dark:text-gray-400 mt-0.5',
    },
    large: {
      container: 'flex flex-col items-center justify-center',
      dayNumber: 'text-7xl font-bold text-gray-900 dark:text-white leading-none',
      monthYear: 'text-lg font-normal text-gray-600 dark:text-gray-400 mt-2',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.dayNumber}>
        {dayNumber}
      </div>
      <div className={styles.monthYear}>
        {monthYear}
      </div>
    </div>
  );
}

/**
 * Date Display Card Variant
 * Adds a card background with shadow for standalone use
 */
export function CustomDateDisplayCard({
  date,
  className = '',
  variant = 'default',
  interactive = false,
  onClick,
}: CustomDateDisplayProps & { interactive?: boolean; onClick?: () => void }) {
  const baseStyles = 'bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4';
  const interactiveStyles = interactive
    ? 'cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-500'
    : '';

  return (
    <button
      onClick={onClick}
      disabled={!interactive}
      className={`${baseStyles} ${interactiveStyles} ${className}`}
      type="button"
    >
      <CustomDateDisplay date={date} variant={variant} />
    </button>
  );
}

/**
 * Date Range Display
 * Shows a date range with "from" and "to" dates
 */
export function DateRangeDisplay({
  startDate,
  endDate,
  className = '',
}: {
  startDate: Date;
  endDate: Date;
  className?: string;
}) {
  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      <CustomDateDisplay date={startDate} variant="compact" />
      <div className="flex-shrink-0 text-gray-400 dark:text-gray-600">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </div>
      <CustomDateDisplay date={endDate} variant="compact" />
    </div>
  );
}
