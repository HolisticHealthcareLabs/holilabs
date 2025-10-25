/**
 * Badge Component
 *
 * Hospital-grade badge component for:
 * - Status indicators (patient risk, medication status, etc.)
 * - Labels and tags
 * - Notification counts
 * - Medical semantic colors
 */

import React from 'react';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  // Medical-specific variants
  | 'risk-low'
  | 'risk-medium'
  | 'risk-high'
  | 'risk-critical'
  | 'vitals-normal'
  | 'vitals-elevated'
  | 'vitals-critical'
  | 'prescription-active'
  | 'prescription-completed'
  | 'prescription-pending';

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const baseStyles =
  'inline-flex items-center font-medium rounded-full transition-all';

const variantStyles: Record<BadgeVariant, string> = {
  default:
    'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200',
  primary:
    'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300',
  success:
    'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-300',
  warning:
    'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-300',
  error:
    'bg-error-100 text-error-800 dark:bg-error-900/30 dark:text-error-300',
  info:
    'bg-info-100 text-info-800 dark:bg-info-900/30 dark:text-info-300',
  neutral:
    'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300',

  // Medical semantic variants
  'risk-low':
    'bg-success-100 text-success-800 border border-success-300 dark:bg-success-900/30 dark:text-success-300 dark:border-success-800',
  'risk-medium':
    'bg-warning-100 text-warning-800 border border-warning-300 dark:bg-warning-900/30 dark:text-warning-300 dark:border-warning-800',
  'risk-high':
    'bg-error-100 text-error-800 border border-error-300 dark:bg-error-900/30 dark:text-error-300 dark:border-error-800',
  'risk-critical':
    'bg-error-600 text-white border border-error-700 animate-pulse',

  'vitals-normal':
    'bg-success-50 text-success-700 border border-success-200 dark:bg-success-900/20 dark:text-success-400 dark:border-success-800',
  'vitals-elevated':
    'bg-warning-50 text-warning-700 border border-warning-200 dark:bg-warning-900/20 dark:text-warning-400 dark:border-warning-800',
  'vitals-critical':
    'bg-error-50 text-error-700 border border-error-200 dark:bg-error-900/20 dark:text-error-400 dark:border-error-800',

  'prescription-active':
    'bg-primary-50 text-primary-700 border border-primary-200 dark:bg-primary-900/20 dark:text-primary-400 dark:border-primary-800',
  'prescription-completed':
    'bg-neutral-100 text-neutral-600 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700',
  'prescription-pending':
    'bg-warning-50 text-warning-700 border border-warning-200 dark:bg-warning-900/20 dark:text-warning-400 dark:border-warning-800',
};

const sizeStyles: Record<BadgeSize, string> = {
  xs: 'text-xs px-1.5 py-0.5 gap-1',
  sm: 'text-xs px-2 py-1 gap-1',
  md: 'text-sm px-2.5 py-1 gap-1.5',
  lg: 'text-base px-3 py-1.5 gap-2',
};

const dotSizeStyles: Record<BadgeSize, string> = {
  xs: 'w-1 h-1',
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
};

/**
 * Badge Component
 */
export function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  removable = false,
  onRemove,
  icon,
  children,
  className = '',
}: BadgeProps) {
  const badgeClasses = [
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={badgeClasses}>
      {/* Status dot */}
      {dot && (
        <span
          className={`${dotSizeStyles[size]} rounded-full bg-current`}
          aria-hidden="true"
        />
      )}

      {/* Icon */}
      {icon && (
        <span className="inline-flex items-center" aria-hidden="true">
          {icon}
        </span>
      )}

      {/* Badge text */}
      <span>{children}</span>

      {/* Remove button */}
      {removable && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center hover:opacity-70 transition-opacity focus:outline-none"
          aria-label="Remove badge"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </span>
  );
}

/**
 * Notification Badge - For notification counts
 */
export interface NotificationBadgeProps {
  count: number;
  max?: number;
  variant?: 'primary' | 'error';
  size?: 'sm' | 'md';
  className?: string;
}

export function NotificationBadge({
  count,
  max = 99,
  variant = 'error',
  size = 'md',
  className = '',
}: NotificationBadgeProps) {
  const displayCount = count > max ? `${max}+` : count.toString();

  const sizeClasses = size === 'sm' ? 'text-xs min-w-[16px] h-4' : 'text-xs min-w-[20px] h-5';

  const variantClasses =
    variant === 'primary'
      ? 'bg-primary-500 text-white'
      : 'bg-error-500 text-white';

  if (count === 0) return null;

  return (
    <span
      className={`${sizeClasses} ${variantClasses} inline-flex items-center justify-center px-1.5 rounded-full font-semibold ${className}`}
      aria-label={`${count} notifications`}
    >
      {displayCount}
    </span>
  );
}

/**
 * Status Badge - Pre-configured badges for common statuses
 */
export type StatusType =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'completed'
  | 'cancelled'
  | 'scheduled'
  | 'in-progress'
  | 'approved'
  | 'rejected';

export interface StatusBadgeProps {
  status: StatusType;
  size?: BadgeSize;
  className?: string;
}

const statusConfig: Record<StatusType, { variant: BadgeVariant; label: string; dot: boolean }> = {
  active: { variant: 'success', label: 'Active', dot: true },
  inactive: { variant: 'neutral', label: 'Inactive', dot: true },
  pending: { variant: 'warning', label: 'Pending', dot: true },
  completed: { variant: 'success', label: 'Completed', dot: false },
  cancelled: { variant: 'error', label: 'Cancelled', dot: false },
  scheduled: { variant: 'info', label: 'Scheduled', dot: true },
  'in-progress': { variant: 'primary', label: 'In Progress', dot: true },
  approved: { variant: 'success', label: 'Approved', dot: false },
  rejected: { variant: 'error', label: 'Rejected', dot: false },
};

export function StatusBadge({ status, size = 'sm', className = '' }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant={config.variant}
      size={size}
      dot={config.dot}
      className={className}
    >
      {config.label}
    </Badge>
  );
}
