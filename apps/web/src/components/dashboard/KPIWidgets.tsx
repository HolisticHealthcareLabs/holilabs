'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { PastelGlassStatCard } from './PastelGlassStatCard';

// AI Time Reclaimed Widget (with radial progress)
export function AITimeReclaimedWidgetRadial() {
  const percentage = 68;
  const hours = 12.5;

  return (
    <div className="rounded-2xl p-6 backdrop-blur-xl bg-[oklch(0.95_0.02_160)]/10 dark:bg-[oklch(0.15_0.02_160)]/10 border border-[oklch(0.85_0.05_160)]/20 dark:border-[oklch(0.35_0.05_160)]/20">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
        AI Time Reclaimed
      </h3>
      <div className="flex flex-col items-center">
        <div className="relative w-32 h-32 mb-4">
          <svg className="transform -rotate-90 w-32 h-32">
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-slate-200 dark:text-slate-700"
            />
            <motion.circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 56}`}
              strokeDashoffset={`${2 * Math.PI * 56 * (1 - percentage / 100)}`}
              strokeLinecap="round"
              className="text-green-500"
              initial={{ strokeDashoffset: 2 * Math.PI * 56 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 56 * (1 - percentage / 100) }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {hours}h
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">{percentage}%</div>
            </div>
          </div>
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-400">Saved this week</div>
      </div>
    </div>
  );
}

// Legacy AI Time Widget (for compatibility)
export function AITimeReclaimedWidget() {
  return <AITimeReclaimedWidgetRadial />;
}

// Pending Results Widget
export function PendingResultsWidget() {
  const results = [
    { name: 'CBC', status: 'pending', days: 2 },
    { name: 'Lipid Panel', status: 'pending', days: 1 },
    { name: 'HbA1c', status: 'overdue', days: 5 },
  ];

  return (
    <div className="rounded-2xl p-6 backdrop-blur-xl bg-[oklch(0.95_0.02_200)]/10 dark:bg-[oklch(0.15_0.02_200)]/10 border border-[oklch(0.85_0.05_200)]/20 dark:border-[oklch(0.35_0.05_200)]/20">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
        Pending Results
      </h3>
      <div className="space-y-2">
        {results.map((result, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-gray-800/50"
          >
            <div>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {result.name}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                {result.days}d ago
              </span>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                result.status === 'overdue'
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                  : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
              }`}
            >
              {result.status}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Adherence Score Widget
export function AdherenceScoreWidget() {
  const score = 87;
  const trendData = [82, 84, 83, 85, 86, 87, 87];

  return (
    <PastelGlassStatCard
      label="Adherence Score"
      value={`${score}%`}
      change={{ value: 5, trend: 'up', period: 'vs last month' }}
      trendData={trendData}
      gradient="lavender"
    />
  );
}

// Billable Value Widget
export function BillableValueWidget() {
  const value = 12450;
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <PastelGlassStatCard
      label="Billable Value"
      value={`$${displayValue.toLocaleString()}`}
      change={{ value: 8.3, trend: 'up', period: 'this month' }}
      gradient="cyan"
    />
  );
}
