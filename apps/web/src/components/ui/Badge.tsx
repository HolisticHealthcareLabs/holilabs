'use client';

import { motion } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full font-bold text-xs px-2 py-0.5 transition-all',
  {
    variants: {
      variant: {
        success: 'bg-green-500/10 text-green-600 dark:text-green-400',
        warning: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
        error: 'bg-red-500/10 text-red-600 dark:text-red-400',
        info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        neutral: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
        // Extended variants for patient detail views
        'risk-critical': 'bg-red-500/10 text-red-600 dark:text-red-400',
        'risk-high': 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
        'risk-medium': 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
        'risk-low': 'bg-green-500/10 text-green-600 dark:text-green-400',
        'vitals-critical': 'bg-red-500/10 text-red-600 dark:text-red-400',
        'vitals-elevated': 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
        'vitals-normal': 'bg-green-500/10 text-green-600 dark:text-green-400',
        'prescription-active': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        default: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
      },
      size: {
        sm: 'text-[10px] px-1.5 py-0.5',
        md: 'text-xs px-2 py-0.5',
        lg: 'text-sm px-3 py-1',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'md',
    },
  }
);

// Export types for external use
export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;
export type BadgeSize = NonNullable<VariantProps<typeof badgeVariants>['size']>;

export interface BadgeProps extends VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
}

export function Badge({ children, variant, size, className, animate = false }: BadgeProps) {
  return (
    <motion.span
      className={cn(badgeVariants({ variant, size }), className)}
      initial={animate ? { scale: 0, opacity: 0 } : undefined}
      animate={animate ? { scale: 1, opacity: 1 } : undefined}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.span>
  );
}

// Notification Badge (with count)
export interface NotificationBadgeProps {
  count: number;
  max?: number;
  variant?: BadgeVariant;
  className?: string;
}

export function NotificationBadge({ count, max = 99, variant = 'error', className }: NotificationBadgeProps) {
  const displayCount = count > max ? `${max}+` : count.toString();

  return (
    <Badge variant={variant} size="sm" className={cn('min-w-[18px] h-[18px]', className)}>
      {displayCount}
    </Badge>
  );
}

// Status Badge (with predefined status types)
export type StatusType =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'PENDING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'SCHEDULED'
  | 'OVERDUE'
  | 'HIGH_RISK'
  | 'MEDIUM_RISK'
  | 'LOW_RISK';

const statusConfig: Record<StatusType, { label: string; variant: BadgeVariant }> = {
  ACTIVE: { label: 'Active', variant: 'success' },
  INACTIVE: { label: 'Inactive', variant: 'neutral' },
  PENDING: { label: 'Pending', variant: 'warning' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'error' },
  SCHEDULED: { label: 'Scheduled', variant: 'info' },
  OVERDUE: { label: 'Overdue', variant: 'error' },
  HIGH_RISK: { label: 'High Risk', variant: 'risk-high' },
  MEDIUM_RISK: { label: 'Medium Risk', variant: 'risk-medium' },
  LOW_RISK: { label: 'Low Risk', variant: 'risk-low' },
};

export interface StatusBadgeProps {
  status: StatusType;
  className?: string;
  size?: BadgeSize;
}

export function StatusBadge({ status, className, size }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} size={size} className={className}>
      {config.label}
    </Badge>
  );
}
