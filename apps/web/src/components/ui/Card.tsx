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
  'transition-all';

const variantStyles: Record<CardVariant, string> = {
  flat: 'border-0',
  elevated: 'hover:shadow-xl',
  outlined: '',
  interactive:
    'cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md active:scale-[0.98]',
};

const variantInlineStyles: Record<CardVariant, React.CSSProperties> = {
  flat: {},
  elevated: { boxShadow: 'var(--token-shadow-lg)' },
  outlined: { border: '1px solid var(--border-default)' },
  interactive: { border: '1px solid var(--border-default)' },
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
      style={{
        backgroundColor: 'var(--surface-primary)',
        borderRadius: 'var(--radius-xl)',
        ...variantInlineStyles[variant],
      }}
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
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
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
    <div className={className} style={{ color: 'var(--text-secondary)' }}>
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
          ? 'mt-6 pt-4'
          : 'mt-4'
      } ${className}`}
      style={divider ? { borderTop: '1px solid var(--border-default)' } : undefined}
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
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            {label}
          </p>
          <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {value}
          </p>

          {/* Change indicator */}
          {change && (
            <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${trendColors[change.trend]}`}>
              {trendIcons[change.trend]}
              <span>{Math.abs(change.value)}%</span>
              <span className="font-normal" style={{ color: 'var(--text-tertiary)' }}>
                {change.trend === 'up' ? 'increase' : change.trend === 'down' ? 'decrease' : 'no change'}
              </span>
            </div>
          )}
        </div>

        {/* Icon */}
        {icon && (
          <div className={`p-3 ${iconBackground}`} style={{ borderRadius: 'var(--radius-lg)' }}>
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
              className="w-12 h-12 object-cover"
              style={{ borderRadius: 'var(--radius-full)' }}
            />
          ) : (
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center" style={{ borderRadius: 'var(--radius-full)' }}>
              <span className="text-lg font-semibold text-primary-700 dark:text-primary-300">
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Patient info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-base font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {name}
            </h4>
            {status === 'active' && (
              <span className="flex-shrink-0 w-2 h-2 bg-success-500" style={{ borderRadius: 'var(--radius-full)' }} />
            )}
          </div>

          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
            ID: {id}
          </p>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {lastVisit && (
              <span style={{ color: 'var(--text-tertiary)' }}>
                Last visit: {lastVisit}
              </span>
            )}

            {riskLevel && (
              <span
                className={`px-2 py-0.5 font-medium ${riskColors[riskLevel]}`}
                style={{ borderRadius: 'var(--radius-full)' }}
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
