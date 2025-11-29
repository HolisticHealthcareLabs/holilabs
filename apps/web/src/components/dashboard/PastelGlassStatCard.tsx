'use client';

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/Badge';
import React from 'react';
// Sparkline component (inline for now)
function Sparkline({
  data,
  width = 120,
  height = 40,
  color = 'currentColor',
  animate = true,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  animate?: boolean;
}) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center" style={{ width, height }}>
        <span className="text-xs text-slate-400 dark:text-slate-600">No data</span>
      </div>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padding = 4;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * (width - padding * 2) + padding;
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
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
    </svg>
  );
}

interface PastelGlassStatCardProps {
  label: string;
  value: string | number;
  change?: {
    value: number;
    trend: 'up' | 'down' | 'neutral';
    period?: string;
  };
  trendData?: number[];
  icon?: React.ReactNode;
  gradient?: 'mint' | 'lavender' | 'cyan';
  onClick?: () => void;
  className?: string;
}

const gradientStyles = {
  mint: {
    bg: 'bg-[oklch(0.95_0.02_160)]/10 dark:bg-[oklch(0.15_0.02_160)]/10',
    border: 'border-[oklch(0.85_0.05_160)]/20 dark:border-[oklch(0.35_0.05_160)]/20',
    text: 'text-slate-900 dark:text-slate-100',
  },
  lavender: {
    bg: 'bg-[oklch(0.95_0.02_280)]/10 dark:bg-[oklch(0.15_0.02_280)]/10',
    border: 'border-[oklch(0.85_0.05_280)]/20 dark:border-[oklch(0.35_0.05_280)]/20',
    text: 'text-slate-900 dark:text-slate-100',
  },
  cyan: {
    bg: 'bg-[oklch(0.95_0.02_200)]/10 dark:bg-[oklch(0.15_0.02_200)]/10',
    border: 'border-[oklch(0.85_0.05_200)]/20 dark:border-[oklch(0.35_0.05_200)]/20',
    text: 'text-slate-900 dark:text-slate-100',
  },
};

export function PastelGlassStatCard({
  label,
  value,
  change,
  trendData,
  icon,
  gradient = 'mint',
  onClick,
  className = '',
}: PastelGlassStatCardProps) {
  const styles = gradientStyles[gradient];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl p-6
        backdrop-blur-xl
        ${styles.bg}
        border ${styles.border}
        ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''}
        transition-all duration-300
        ${className}
      `}
    >
      {/* Glass effect overlay */}
      <div className="absolute inset-0 bg-white/5 dark:bg-black/5 pointer-events-none" />

      <div className="relative flex flex-col items-center justify-center h-full">
        {/* Label */}
        <p className={`text-sm font-medium mb-2 ${styles.text} opacity-70`}>
          {label}
        </p>

        {/* Hero Number */}
        <motion.p
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className={`text-5xl font-bold mb-3 ${styles.text}`}
        >
          {value}
        </motion.p>

        {/* Trend Badge - Centered below value */}
        {change && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center gap-1 mb-3"
          >
            <Badge
              variant={
                change.trend === 'up'
                  ? 'success'
                  : change.trend === 'down'
                    ? 'error'
                    : 'neutral'
              }
              animate
            >
              {change.trend === 'up' ? '+' : change.trend === 'down' ? '-' : ''}
              {Math.abs(change.value)}%
            </Badge>
            {change.period && (
              <span className={`text-xs ${styles.text} opacity-50`}>
                {change.period}
              </span>
            )}
          </motion.div>
        )}

        {/* Sparkline */}
        {trendData && trendData.length > 0 && (
          <div className="mt-2 w-full flex justify-center">
            <Sparkline
              data={trendData}
              width={180}
              height={40}
              color="currentColor"
              animate={true}
            />
          </div>
        )}

        {/* Icon */}
        {icon && (
          <div className="absolute top-4 right-4 opacity-30">
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );
}

