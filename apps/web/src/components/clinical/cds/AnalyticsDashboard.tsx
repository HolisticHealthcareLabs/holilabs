/**
 * Analytics Dashboard Component
 *
 * Clinical decision support analytics and insights
 * Medical naming: "Analytics" (data-driven clinical insights)
 *
 * Features:
 * - Alert volume trends over time
 * - Rule performance metrics
 * - Override rate analysis
 * - Category distribution
 * - Response time statistics
 * - Provider engagement metrics
 * - Evidence strength distribution
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

interface AlertMetrics {
  total: number;
  critical: number;
  warning: number;
  info: number;
  accepted: number;
  overridden: number;
  dismissed: number;
  avgResponseTime: number; // minutes
}

interface RulePerformance {
  ruleId: string;
  ruleName: string;
  triggerCount: number;
  acceptanceRate: number;
  overrideRate: number;
  avgResponseTime: number;
}

interface CategoryMetrics {
  category: string;
  count: number;
  percentage: number;
}

interface TrendData {
  date: string;
  critical: number;
  warning: number;
  info: number;
}

interface AnalyticsDashboardProps {
  timeRange?: 'week' | 'month' | 'quarter' | 'year';
  className?: string;
}

export function AnalyticsDashboard({
  timeRange = 'month',
  className = '',
}: AnalyticsDashboardProps) {
  const [metrics, setMetrics] = useState<AlertMetrics | null>(null);
  const [rulePerformance, setRulePerformance] = useState<RulePerformance[]>([]);
  const [categoryMetrics, setCategoryMetrics] = useState<CategoryMetrics[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);

        // Mock data - replace with actual API calls
        const mockMetrics: AlertMetrics = {
          total: 487,
          critical: 89,
          warning: 234,
          info: 164,
          accepted: 312,
          overridden: 98,
          dismissed: 77,
          avgResponseTime: 8.5,
        };

        const mockRulePerformance: RulePerformance[] = [
          {
            ruleId: 'drug-interaction',
            ruleName: 'Drug-Drug Interactions',
            triggerCount: 156,
            acceptanceRate: 0.72,
            overrideRate: 0.18,
            avgResponseTime: 5.2,
          },
          {
            ruleId: 'hypertension',
            ruleName: 'Hypertension Management',
            triggerCount: 98,
            acceptanceRate: 0.85,
            overrideRate: 0.08,
            avgResponseTime: 12.3,
          },
          {
            ruleId: 'diabetes',
            ruleName: 'Diabetes Control',
            triggerCount: 87,
            acceptanceRate: 0.79,
            overrideRate: 0.12,
            avgResponseTime: 15.7,
          },
          {
            ruleId: 'preventive-care',
            ruleName: 'Preventive Screenings',
            triggerCount: 67,
            acceptanceRate: 0.91,
            overrideRate: 0.04,
            avgResponseTime: 3.8,
          },
          {
            ruleId: 'allergy-alert',
            ruleName: 'Allergy Alerts',
            triggerCount: 45,
            acceptanceRate: 0.96,
            overrideRate: 0.02,
            avgResponseTime: 2.1,
          },
        ];

        const mockCategoryMetrics: CategoryMetrics[] = [
          { category: 'Drug Interaction', count: 156, percentage: 32 },
          { category: 'Guideline Recommendation', count: 142, percentage: 29 },
          { category: 'Lab Abnormal', count: 89, percentage: 18 },
          { category: 'Preventive Care', count: 67, percentage: 14 },
          { category: 'Allergy', count: 33, percentage: 7 },
        ];

        const mockTrendData: TrendData[] = [
          { date: 'Week 1', critical: 18, warning: 45, info: 32 },
          { date: 'Week 2', critical: 22, warning: 52, info: 38 },
          { date: 'Week 3', critical: 25, warning: 61, info: 42 },
          { date: 'Week 4', critical: 24, warning: 76, info: 52 },
        ];

        setMetrics(mockMetrics);
        setRulePerformance(mockRulePerformance);
        setCategoryMetrics(mockCategoryMetrics);
        setTrendData(mockTrendData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching analytics:', error);
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeRange]);

  // Calculate derived metrics
  const derivedMetrics = useMemo(() => {
    if (!metrics) return null;

    return {
      acceptanceRate: ((metrics.accepted / metrics.total) * 100).toFixed(1),
      overrideRate: ((metrics.overridden / metrics.total) * 100).toFixed(1),
      dismissRate: ((metrics.dismissed / metrics.total) * 100).toFixed(1),
      criticalRate: ((metrics.critical / metrics.total) * 100).toFixed(1),
    };
  }, [metrics]);

  if (loading || !metrics || !derivedMetrics) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-2">📊</div>
            <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Analytics Dashboard
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              CDS performance insights and trends
            </p>
          </div>

          {/* Time Range Selector */}
          <select
            value={timeRange}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-sm"
          >
            <option value="week">Past Week</option>
            <option value="month">Past Month</option>
            <option value="quarter">Past Quarter</option>
            <option value="year">Past Year</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
          >
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {metrics.total}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Total Alerts
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              {metrics.critical} critical, {metrics.warning} warning
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800"
          >
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {derivedMetrics.acceptanceRate}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Acceptance Rate
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              {metrics.accepted} alerts accepted
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800"
          >
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {derivedMetrics.overrideRate}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Override Rate
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              {metrics.overridden} alerts overridden
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800"
          >
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {metrics.avgResponseTime}m
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Avg Response Time
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              Minutes to action
            </div>
          </motion.div>
        </div>

        {/* Alert Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Alert Volume Trend
          </h3>

          <div className="space-y-4">
            {trendData.map((week, idx) => {
              const total = week.critical + week.warning + week.info;
              const criticalPct = (week.critical / total) * 100;
              const warningPct = (week.warning / total) * 100;
              const infoPct = (week.info / total) * 100;

              return (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {week.date}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {total} alerts
                    </span>
                  </div>
                  <div className="flex h-8 rounded overflow-hidden">
                    <div
                      className="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${criticalPct}%` }}
                    >
                      {week.critical > 0 && week.critical}
                    </div>
                    <div
                      className="bg-amber-500 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${warningPct}%` }}
                    >
                      {week.warning > 0 && week.warning}
                    </div>
                    <div
                      className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${infoPct}%` }}
                      >
                      {week.info > 0 && week.info}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-6 mt-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Critical</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Warning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Info</span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rule Performance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Top Rules by Trigger Count
            </h3>

            <div className="space-y-3">
              {rulePerformance.map((rule, idx) => (
                <div key={rule.ruleId} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400">
                    {idx + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {rule.ruleName}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 mt-1">
                      <span>{rule.triggerCount} triggers</span>
                      <span>•</span>
                      <span className="text-green-600 dark:text-green-400">
                        {(rule.acceptanceRate * 100).toFixed(0)}% accepted
                      </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {rule.avgResponseTime.toFixed(1)}m
                    </div>
                    <div className="text-xs text-gray-500">avg time</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Category Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Alert Categories
            </h3>

            <div className="space-y-3">
              {categoryMetrics.map((cat) => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {cat.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {cat.count}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        ({cat.percentage}%)
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${cat.percentage}%` }}
                      transition={{ delay: 0.7 + categoryMetrics.indexOf(cat) * 0.1, duration: 0.5 }}
                      className="h-full bg-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Action Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Alert Actions Distribution
          </h3>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">
                {derivedMetrics.acceptanceRate}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Accepted</div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {metrics.accepted} alerts
              </div>
            </div>

            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                {derivedMetrics.overrideRate}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Overridden</div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {metrics.overridden} alerts
              </div>
            </div>

            <div className="text-center">
              <div className="text-4xl font-bold text-gray-600 dark:text-gray-400 mb-2">
                {derivedMetrics.dismissRate}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Dismissed</div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {metrics.dismissed} alerts
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
