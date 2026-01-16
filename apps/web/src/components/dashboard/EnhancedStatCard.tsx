/**
 * Enhanced Stat Card Component
 *
 * Hospital-grade statistics card with:
 * - Mini trend charts (sparklines)
 * - Interactive hover states with tooltips
 * - Real-time data updates with animations
 * - Click-to-drill-down functionality
 * - Change indicators with context
 * - Medical semantic colors
 *
 * Part of Phase 1: Clinician Dashboard Redesign
 * Command center 100x improvement
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';

/**
 * Sparkline Component - Lightweight SVG trend chart
 */
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
  showDots?: boolean;
  animate?: boolean;
}

function Sparkline({
  data,
  width = 120,
  height = 40,
  color = 'currentColor',
  fillColor = 'url(#sparklineGradient)',
  showDots = false,
  animate = true,
}: SparklineProps) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center" style={{ width, height }}>
        <span className="text-xs text-neutral-400 dark:text-neutral-600">No data</span>
      </div>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padding = 4;

  // Create points for the line
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * (width - padding * 2) + padding;
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return { x, y };
  });

  // Create SVG path
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');

  // Create area path (for gradient fill)
  const areaPath = `${linePath} L ${width - padding},${height} L ${padding},${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="sparklineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <motion.path
        d={areaPath}
        fill={fillColor}
        initial={animate ? { opacity: 0 } : undefined}
        animate={animate ? { opacity: 1 } : undefined}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />

      {/* Line */}
      <motion.path
        d={linePath}
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={animate ? { pathLength: 0, opacity: 0 } : undefined}
        animate={animate ? { pathLength: 1, opacity: 1 } : undefined}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />

      {/* Dots at data points */}
      {showDots &&
        points.map((point, index) => (
          <motion.circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="2"
            fill={color}
            initial={animate ? { scale: 0, opacity: 0 } : undefined}
            animate={animate ? { scale: 1, opacity: 1 } : undefined}
            transition={{ duration: 0.3, delay: 0.8 + index * 0.05 }}
          />
        ))}
    </svg>
  );
}

/**
 * Enhanced Stat Card Props
 */
export interface EnhancedStatCardProps {
  label: string;
  value: string | number;
  change?: {
    value: number;
    trend: 'up' | 'down' | 'neutral';
    period?: string; // e.g., "vs last week", "vs last month"
  };
  trendData?: number[]; // Historical data for sparkline (last 7-30 days)
  icon?: React.ReactNode;
  iconBackground?: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'primary';
  onClick?: () => void;
  className?: string;
  loading?: boolean;
  tooltip?: {
    title: string;
    details: Array<{ label: string; value: string | number }>;
  };
  badge?: {
    text: string;
    variant: 'success' | 'warning' | 'error' | 'info';
  };
}

/**
 * Enhanced Stat Card Component
 */
export function EnhancedStatCard({
  label,
  value,
  change,
  trendData,
  icon,
  iconBackground = 'bg-primary-100 dark:bg-primary-900/30',
  variant = 'default',
  onClick,
  className = '',
  loading = false,
  tooltip,
  badge,
}: EnhancedStatCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Variant colors for sparklines and trends
  const variantColors = {
    default: {
      sparkline: 'text-primary-500 dark:text-primary-400',
      iconBg: 'bg-primary-100 dark:bg-primary-900/30',
      iconColor: 'text-primary-600 dark:text-primary-400',
    },
    success: {
      sparkline: 'text-success-500 dark:text-success-400',
      iconBg: 'bg-success-100 dark:bg-success-900/30',
      iconColor: 'text-success-600 dark:text-success-400',
    },
    warning: {
      sparkline: 'text-warning-500 dark:text-warning-400',
      iconBg: 'bg-warning-100 dark:bg-warning-900/30',
      iconColor: 'text-warning-600 dark:text-warning-400',
    },
    error: {
      sparkline: 'text-error-500 dark:text-error-400',
      iconBg: 'bg-error-100 dark:bg-error-900/30',
      iconColor: 'text-error-600 dark:text-error-400',
    },
    primary: {
      sparkline: 'text-primary-500 dark:text-primary-400',
      iconBg: 'bg-primary-100 dark:bg-primary-900/30',
      iconColor: 'text-primary-600 dark:text-primary-400',
    },
  };

  const colors = variantColors[variant];

  // Trend colors based on direction
  const trendColors = {
    up: 'text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-900/20',
    down: 'text-error-600 dark:text-error-400 bg-error-50 dark:bg-error-900/20',
    neutral: 'text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900/20',
  };

  const trendIcons = {
    up: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
        />
      </svg>
    ),
    down: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
        />
      </svg>
    ),
    neutral: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    ),
  };

  const badgeStyles = {
    success: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300',
    warning: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300',
    error: 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300',
    info: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Card
        variant="elevated"
        padding="lg"
        hover={!!onClick}
        onClick={onClick}
        className={`relative overflow-visible transition-all duration-300 ${
          onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''
        } ${className}`}
      >
        {/* Badge */}
        {badge && (
          <div className="absolute top-4 right-4">
            <span
              className={`text-xs font-semibold px-2 py-1 rounded-full ${badgeStyles[badge.variant]}`}
            >
              {badge.text}
            </span>
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Title row (icon + label like modern analytics tiles) */}
            <div className="flex items-center gap-3 mb-2">
              {icon ? (
                <div
                  className={`flex-shrink-0 p-2 rounded-xl ${iconBackground || colors.iconBg}`}
                  aria-hidden="true"
                >
                  <div className={`${colors.iconColor} opacity-90 scale-75 origin-left`}>{icon}</div>
                </div>
              ) : null}
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                {label}
              </p>
            </div>

            {/* Value */}
            {loading ? (
              <div className="h-10 w-32 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
            ) : (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-3"
              >
                {value}
              </motion.p>
            )}

            {/* Change indicator */}
            {change && !loading && (
              <div className="flex items-center gap-2 mb-3">
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-semibold ${
                    trendColors[change.trend]
                  }`}
                >
                  {trendIcons[change.trend]}
                  <span>
                    {change.trend === 'up' ? '+' : change.trend === 'down' ? '-' : ''}
                    {Math.abs(change.value)}%
                  </span>
                </div>
                {change.period && (
                  <span className="text-xs text-neutral-500 dark:text-neutral-500 font-medium">
                    {change.period}
                  </span>
                )}
              </div>
            )}

            {/* Sparkline chart */}
            {trendData && trendData.length > 0 && !loading && (
              <div className={`mt-4 ${colors.sparkline}`}>
                <Sparkline
                  data={trendData}
                  width={180}
                  height={50}
                  showDots={false}
                  animate={true}
                />
              </div>
            )}
          </div>

          {/* Icon is rendered inline with the label for better scanability */}
        </div>

        {/* Click indicator */}
        {onClick && (
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg
              className="w-5 h-5 text-neutral-400 dark:text-neutral-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        )}
      </Card>

      {/* Tooltip on hover */}
      <AnimatePresence>
        {showTooltip && tooltip && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-2 left-0 z-50 w-full min-w-[280px] bg-neutral-900 dark:bg-neutral-800 text-white rounded-xl shadow-2xl p-4 pointer-events-none"
          >
            {/* Arrow */}
            <div className="absolute -top-2 left-8 w-4 h-4 bg-neutral-900 dark:bg-neutral-800 transform rotate-45" />

            {/* Tooltip content */}
            <div className="relative">
              <h4 className="text-sm font-bold mb-3">{tooltip.title}</h4>
              <div className="space-y-2">
                {tooltip.details.map((detail, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-300">{detail.label}</span>
                    <span className="font-semibold">{detail.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Loading Skeleton for Enhanced Stat Card
 */
export function EnhancedStatCardSkeleton() {
  return (
    <Card variant="elevated" padding="lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-800 rounded mb-2 animate-pulse" />
          <div className="h-10 w-32 bg-neutral-200 dark:bg-neutral-800 rounded mb-3 animate-pulse" />
          <div className="h-6 w-20 bg-neutral-200 dark:bg-neutral-800 rounded mb-3 animate-pulse" />
          <div className="h-12 w-full bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
        </div>
        <div className="w-16 h-16 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
      </div>
    </Card>
  );
}

/**
 * Grid Layout for Enhanced Stat Cards
 */
interface EnhancedStatCardGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function EnhancedStatCardGrid({
  children,
  columns = 4,
  className = '',
}: EnhancedStatCardGridProps) {
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-6 ${className}`}>
      {children}
    </div>
  );
}
