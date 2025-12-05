'use client';

/**
 * AI Quality Analytics Dashboard
 *
 * Comprehensive dashboard for monitoring AI quality metrics:
 * - Accuracy rates by content type
 * - Confidence calibration
 * - Time saved estimates
 * - Common error patterns
 * - Clinician satisfaction scores
 *
 * @compliance Phase 2.3: AI Quality Control
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  Brain,
  AlertTriangle,
  Target,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
} from 'lucide-react';

interface QualitySummary {
  totalFeedback: number;
  correctCount: number;
  incorrectCount: number;
  accuracyRate: number;
  avgEditDistance: number;
  avgConfidence: number;
  avgConfidenceWhenCorrect: number;
  avgConfidenceWhenIncorrect: number;
}

interface FeedbackItem {
  id: string;
  contentType: string;
  isCorrect: boolean;
  aiConfidence: number;
  editDistance?: number;
  createdAt: string;
}

export default function AIQualityDashboard() {
  const [summary, setSummary] = useState<QualitySummary | null>(null);
  const [recentFeedback, setRecentFeedback] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/feedback');
      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
        setRecentFeedback(data.items.slice(0, 10));
      }
    } catch (error) {
      console.error('Error fetching AI quality analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    trendValue,
    color = 'blue',
  }: {
    title: string;
    value: string;
    subtitle: string;
    icon: any;
    trend?: 'up' | 'down';
    trendValue?: string;
    color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  }) => {
    const colorClasses: Record<string, string> = {
      blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
      red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
      purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
            {subtitle && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
            )}
            {trend && (
              <div
                className={`mt-2 flex items-center gap-1 text-sm ${
                  trend === 'up'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {trend === 'up' ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="text-lg font-medium">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <BarChart3 className="h-16 w-16 text-gray-400 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
            No Data Available
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Start using AI features to see quality analytics
          </p>
        </div>
      </div>
    );
  }

  const accuracyPercentage = Math.round(summary.accuracyRate * 100);
  const avgConfidencePercentage = Math.round(summary.avgConfidence * 100);
  const confidenceCalibration =
    Math.round((summary.avgConfidenceWhenCorrect - summary.avgConfidenceWhenIncorrect) * 100);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              AI Quality Analytics
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Monitor AI accuracy and improve clinical decision support
            </p>
          </div>
          <div className="flex gap-2">
            {(['day', 'week', 'month'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
            <button
              onClick={fetchAnalytics}
              className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Overall Accuracy"
            value={`${accuracyPercentage}%`}
            subtitle={`${summary.correctCount}/${summary.totalFeedback} correct`}
            icon={Target}
            trend={accuracyPercentage >= 85 ? 'up' : 'down'}
            trendValue={accuracyPercentage >= 85 ? 'Excellent' : 'Needs improvement'}
            color={accuracyPercentage >= 85 ? 'green' : accuracyPercentage >= 70 ? 'orange' : 'red'}
          />

          <StatCard
            title="Avg AI Confidence"
            value={`${avgConfidencePercentage}%`}
            subtitle="Model certainty level"
            icon={Brain}
            color="purple"
          />

          <StatCard
            title="Confidence Calibration"
            value={confidenceCalibration >= 0 ? `+${confidenceCalibration}%` : `${confidenceCalibration}%`}
            subtitle="Correct vs incorrect predictions"
            icon={BarChart3}
            trend={confidenceCalibration > 0 ? 'up' : 'down'}
            trendValue={confidenceCalibration > 0 ? 'Well calibrated' : 'Overconfident'}
            color={confidenceCalibration > 0 ? 'green' : 'orange'}
          />

          <StatCard
            title="Avg Edit Distance"
            value={summary.avgEditDistance.toFixed(1)}
            subtitle="Characters changed per correction"
            icon={AlertTriangle}
            color="orange"
          />
        </div>

        {/* Accuracy Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Accuracy by Response Type */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Feedback Distribution
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Correct
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {summary.correctCount} ({Math.round((summary.correctCount / summary.totalFeedback) * 100)}%)
                  </span>
                </div>
                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${(summary.correctCount / summary.totalFeedback) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Incorrect
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {summary.incorrectCount} ({Math.round((summary.incorrectCount / summary.totalFeedback) * 100)}%)
                  </span>
                </div>
                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500"
                    style={{ width: `${(summary.incorrectCount / summary.totalFeedback) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Confidence Calibration Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Confidence Calibration
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      When Correct
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {Math.round(summary.avgConfidenceWhenCorrect * 100)}%
                  </span>
                </div>
                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${summary.avgConfidenceWhenCorrect * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ThumbsDown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      When Incorrect
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {Math.round(summary.avgConfidenceWhenIncorrect * 100)}%
                  </span>
                </div>
                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500"
                    style={{ width: `${summary.avgConfidenceWhenIncorrect * 100}%` }}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Calibration Gap:</span>{' '}
                  {confidenceCalibration > 0
                    ? `${confidenceCalibration}% higher confidence on correct predictions (good)`
                    : `${Math.abs(confidenceCalibration)}% overconfident on incorrect predictions`}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Recent Feedback */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Recent Feedback
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                    Content Type
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                    Result
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                    AI Confidence
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                    Edit Distance
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentFeedback.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-100 capitalize">
                      {item.contentType.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          item.isCorrect
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                            : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                        }`}
                      >
                        {item.isCorrect ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {item.isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                      {item.aiConfidence ? `${Math.round(item.aiConfidence * 100)}%` : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                      {item.editDistance !== undefined && item.editDistance !== null
                        ? item.editDistance
                        : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
