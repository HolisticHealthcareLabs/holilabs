/**
 * Card Component
 *
 * Hospital-grade card component for:
 * - Content containers
 * - Patient cards
 * - Dashboard widgets
 * - Interactive panels
 *
 * Features:
 * - Multiple variants (flat, elevated, outlined, interactive)
 * - Hover states
 * - Click handlers
 * - Header/Footer sections
 * - Full WCAG AAA accessibility
 */

import React from 'react';

export type CardVariant = 'flat' | 'elevated' | 'outlined' | 'interactive';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

export interface CardProps {
  variant?: CardVariant;
  padding?: CardPadding;
  hover?: boolean;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}

const baseStyles =
  'bg-white dark:bg-neutral-900 rounded-xl transition-all';

const variantStyles: Record<CardVariant, string> = {
  flat: 'border-0',
  elevated: 'shadow-lg hover:shadow-xl',
  outlined: 'border border-neutral-200 dark:border-neutral-800',
  interactive:
    'border border-neutral-200 dark:border-neutral-800 cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md active:scale-[0.98]',
};

const paddingStyles: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-10',
};

/**
 * Card Component
 */
export function Card({
  variant = 'elevated',
  padding = 'md',
  hover = false,
  onClick,
  className = '',
  children,
}: CardProps) {
  const cardClasses = [
    baseStyles,
    variantStyles[variant],
    paddingStyles[padding],
    hover ? 'hover:shadow-xl hover:-translate-y-0.5' : '',
    onClick ? 'cursor-pointer' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={cardClasses}
      onClick={onClick}
      {...(onClick && {
        type: 'button',
        role: 'button',
        tabIndex: 0,
      })}
    >
      {children}
    </Component>
  );
}

/**
 * Card Header
 */
export interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  className = '',
}: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between mb-4 ${className}`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        {icon && (
          <div className="flex-shrink-0 mt-1 text-primary-600 dark:text-primary-400">
            {icon}
          </div>
        )}

        {/* Title and subtitle */}
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Action button */}
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

/**
 * Card Content
 */
export interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={`text-neutral-700 dark:text-neutral-300 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Card Footer
 */
export interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
  divider?: boolean;
}

export function CardFooter({
  children,
  className = '',
  divider = true,
}: CardFooterProps) {
  return (
    <div
      className={`${
        divider
          ? 'mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800'
          : 'mt-4'
      } ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Stat Card - For dashboard statistics
 */
export interface StatCardProps {
  label: string;
  value: string | number;
  change?: {
    value: number;
    trend: 'up' | 'down' | 'neutral';
  };
  icon?: React.ReactNode;
  iconBackground?: string;
  variant?: CardVariant;
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  label,
  value,
  change,
  icon,
  iconBackground = 'bg-primary-100 dark:bg-primary-900/30',
  variant = 'elevated',
  onClick,
  className = '',
}: StatCardProps) {
  const trendColors = {
    up: 'text-success-600 dark:text-success-400',
    down: 'text-error-600 dark:text-error-400',
    neutral: 'text-neutral-600 dark:text-neutral-400',
  };

  const trendIcons = {
    up: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    ),
    down: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    ),
    neutral: null,
  };

  return (
    <Card variant={variant} padding="lg" hover={!!onClick} onClick={onClick} className={className}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            {label}
          </p>
          <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            {value}
          </p>

          {/* Change indicator */}
          {change && (
            <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${trendColors[change.trend]}`}>
              {trendIcons[change.trend]}
              <span>{Math.abs(change.value)}%</span>
              <span className="text-neutral-500 dark:text-neutral-500 font-normal">
                {change.trend === 'up' ? 'increase' : change.trend === 'down' ? 'decrease' : 'no change'}
              </span>
            </div>
          )}
        </div>

        {/* Icon */}
        {icon && (
          <div className={`p-3 rounded-lg ${iconBackground}`}>
            <div className="w-6 h-6 text-primary-600 dark:text-primary-400">
              {icon}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Patient Card - For patient lists
 */
export interface PatientCardProps {
  name: string;
  id: string;
  avatar?: string;
  status?: 'active' | 'inactive';
  lastVisit?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  upcomingAppointment?: string;
  onClick?: () => void;
  className?: string;
}

export function PatientCard({
  name,
  id,
  avatar,
  status = 'active',
  lastVisit,
  riskLevel,
  upcomingAppointment,
  onClick,
  className = '',
}: PatientCardProps) {
  const riskColors = {
    low: 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-300',
    medium: 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-300',
    high: 'bg-error-100 text-error-800 dark:bg-error-900/30 dark:text-error-300',
    critical: 'bg-error-600 text-white animate-pulse',
  };

  return (
    <Card
      variant="interactive"
      padding="md"
      hover
      onClick={onClick}
      className={className}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {avatar ? (
            <img
              src={avatar}
              alt={name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <span className="text-lg font-semibold text-primary-700 dark:text-primary-300">
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Patient info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 truncate">
              {name}
            </h4>
            {status === 'active' && (
              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-success-500" />
            )}
          </div>

          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
            ID: {id}
          </p>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {lastVisit && (
              <span className="text-neutral-500 dark:text-neutral-500">
                Last visit: {lastVisit}
              </span>
            )}

            {riskLevel && (
              <span
                className={`px-2 py-0.5 rounded-full font-medium ${riskColors[riskLevel]}`}
              >
                {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk
              </span>
            )}

            {upcomingAppointment && (
              <span className="text-primary-600 dark:text-primary-400 font-medium">
                Next: {upcomingAppointment}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
