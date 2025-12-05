'use client';

/**
 * Manual Review Queue Page
 *
 * Priority-sorted queue of AI outputs that need manual review
 * - Low-confidence sentences flagged by AI
 * - Clinician-flagged content
 * - Status workflow: PENDING → IN_REVIEW → APPROVED/CORRECTED/ESCALATED
 *
 * @compliance Phase 2.3: AI Quality Control
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flag,
  ChevronRight,
  RefreshCw,
  Filter,
  ArrowUp,
  User,
  FileText,
  Edit2,
  AlertCircle,
} from 'lucide-react';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
}

interface Clinician {
  id: string;
  firstName: string;
  lastName: string;
}

interface QueueItem {
  id: string;
  contentType: string;
  contentId: string;
  sectionType?: string;
  priority: number;
  confidence: number;
  flagReason: string;
  flagDetails?: string;
  status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'CORRECTED' | 'ESCALATED';
  patient: Patient;
  clinician: Clinician;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  wasCorrect?: boolean;
  corrections?: any;
  createdAt: string;
  updatedAt: string;
}

interface QueueStats {
  pending: number;
  inReview: number;
  approved: number;
  corrected: number;
  escalated: number;
}

export default function ReviewQueuePage() {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats>({
    pending: 0,
    inReview: 0,
    approved: 0,
    corrected: 0,
    escalated: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchQueue();
  }, [statusFilter]);

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/ai/review-queue?${params}`);
      if (response.ok) {
        const data = await response.json();
        setQueueItems(data.items || []);
        setStats(data.stats || {});
      }
    } catch (error) {
      console.error('Error fetching review queue:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (itemId: string, newStatus: string, wasCorrect?: boolean) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/ai/review-queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queueItemId: itemId,
          status: newStatus,
          reviewNotes: reviewNotes || undefined,
          wasCorrect,
        }),
      });

      if (response.ok) {
        await fetchQueue();
        setSelectedItem(null);
        setReviewNotes('');
      } else {
        alert('Failed to update review status');
      }
    } catch (error) {
      console.error('Error updating review:', error);
      alert('Error updating review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'IN_REVIEW':
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      case 'APPROVED':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'CORRECTED':
        return <Edit2 className="h-4 w-4 text-orange-600" />;
      case 'ESCALATED':
        return <Flag className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'IN_REVIEW':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'APPROVED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'CORRECTED':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'ESCALATED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'text-red-600 dark:text-red-400';
    if (priority >= 5) return 'text-orange-600 dark:text-orange-400';
    return 'text-yellow-600 dark:text-yellow-400';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const formatContentType = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Manual Review Queue
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                AI outputs flagged for clinician review
              </p>
            </div>
            <button
              onClick={fetchQueue}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Stats Bar */}
          <div className="mt-6 grid grid-cols-5 gap-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                  Pending
                </span>
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                {stats.pending}
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  In Review
                </span>
                <AlertCircle className="h-4 w-4 text-blue-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-blue-900 dark:text-blue-100">
                {stats.inReview}
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-900 dark:text-green-100">
                  Approved
                </span>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-green-900 dark:text-green-100">
                {stats.approved}
              </p>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/10 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-orange-900 dark:text-orange-100">
                  Corrected
                </span>
                <Edit2 className="h-4 w-4 text-orange-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-orange-900 dark:text-orange-100">
                {stats.corrected}
              </p>
            </div>

            <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-4 border border-red-200 dark:border-red-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-900 dark:text-red-100">
                  Escalated
                </span>
                <Flag className="h-4 w-4 text-red-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-red-900 dark:text-red-100">
                {stats.escalated}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 flex items-center gap-4">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter by status:
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter('')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  statusFilter === ''
                    ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                All
              </button>
              {['PENDING', 'IN_REVIEW', 'APPROVED', 'CORRECTED', 'ESCALATED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    statusFilter === status
                      ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Queue Items */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 animate-pulse"
              >
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : queueItems.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No items in queue
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {statusFilter
                ? `No items with status: ${statusFilter}`
                : 'All AI outputs are looking good!'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {queueItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow"
                >
                  <div className="p-6">
                    {/* Header Row */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Priority Badge */}
                        <div className="flex items-center gap-1">
                          <ArrowUp className={`h-4 w-4 ${getPriorityColor(item.priority)}`} />
                          <span
                            className={`text-sm font-bold ${getPriorityColor(item.priority)}`}
                          >
                            P{item.priority}
                          </span>
                        </div>

                        {/* Content Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {formatContentType(item.contentType)}
                            </span>
                            {item.sectionType && (
                              <>
                                <ChevronRight className="h-3 w-3 text-gray-400" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {item.sectionType}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Patient Info */}
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <User className="h-3 w-3" />
                            <span>
                              {item.patient.firstName} {item.patient.lastName}
                            </span>
                            <span className="text-gray-400">•</span>
                            <span>MRN: {item.patient.mrn}</span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${getStatusColor(
                            item.status
                          )}`}
                        >
                          {getStatusIcon(item.status)}
                          <span className="text-xs font-medium">
                            {item.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Flag Reason */}
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                        <div>
                          <span className="text-sm font-medium text-red-900 dark:text-red-100">
                            {item.flagReason}
                          </span>
                          {item.flagDetails && (
                            <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                              {item.flagDetails}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Metrics Row */}
                    <div className="flex items-center gap-6 mb-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Confidence:</span>
                        <span
                          className={`ml-2 font-medium ${getConfidenceColor(item.confidence)}`}
                        >
                          {Math.round(item.confidence * 100)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Created:</span>
                        <span className="ml-2 text-gray-900 dark:text-gray-100">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Assigned to:</span>
                        <span className="ml-2 text-gray-900 dark:text-gray-100">
                          Dr. {item.clinician.firstName} {item.clinician.lastName}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {(item.status === 'PENDING' || item.status === 'IN_REVIEW') && (
                      <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                          Review Now
                        </button>
                      </div>
                    )}

                    {/* Review Details (if completed) */}
                    {item.status !== 'PENDING' && item.status !== 'IN_REVIEW' && item.reviewedAt && (
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400">
                        <p>
                          Reviewed {formatDate(item.reviewedAt)}
                          {item.reviewNotes && <span> • {item.reviewNotes}</span>}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Review Item
                </h3>

                {/* Item Details */}
                <div className="space-y-4 mb-6">
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Content Type:
                    </span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100">
                      {formatContentType(selectedItem.contentType)}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Patient:
                    </span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100">
                      {selectedItem.patient.firstName} {selectedItem.patient.lastName} (MRN:{' '}
                      {selectedItem.patient.mrn})
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Flag Reason:
                    </span>
                    <span className="ml-2 text-red-600 dark:text-red-400">
                      {selectedItem.flagReason}
                    </span>
                  </div>
                  {selectedItem.flagDetails && (
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Details:
                      </span>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {selectedItem.flagDetails}
                      </p>
                    </div>
                  )}
                </div>

                {/* Review Notes */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Review Notes (optional)
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add any notes about this review..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleReview(selectedItem.id, 'APPROVED', true)}
                    disabled={isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReview(selectedItem.id, 'CORRECTED', false)}
                    disabled={isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                    Mark Corrected
                  </button>
                  <button
                    onClick={() => handleReview(selectedItem.id, 'ESCALATED')}
                    disabled={isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Flag className="h-4 w-4" />
                    Escalate
                  </button>
                </div>

                {/* Cancel */}
                <button
                  onClick={() => setSelectedItem(null)}
                  disabled={isSubmitting}
                  className="w-full mt-3 px-4 py-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
