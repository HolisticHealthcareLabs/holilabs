'use client';

/**
 * Prevention Plan History Component
 *
 * Phase 3: History & Compliance
 * Displays version history and timeline for a patient's prevention plan.
 */

import { useState, useEffect } from 'react';
import { Clock, User, FileText, Eye, GitCompare, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

interface Version {
  id: string;
  planId: string;
  version: number;
  planData: Record<string, unknown>;
  changes: Record<string, unknown>;
  changedBy: string;
  changeReason: string | null;
  createdAt: string;
  clinician?: {
    id: string;
    name: string | null;
    email?: string;
  };
}

interface TimelineEvent {
  id: string;
  type: string;
  date: string;
  title: string;
  description: string;
  actor?: string;
  metadata?: Record<string, unknown>;
}

interface ScreeningCompliance {
  totalScheduled: number;
  completed: number;
  overdue: number;
  upcoming: number;
  complianceRate: number;
}

interface HistoryData {
  plan: {
    id: string;
    planName: string;
    planType: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  versions: Version[];
  timeline: TimelineEvent[];
  screeningCompliance: ScreeningCompliance;
}

interface PreventionPlanHistoryProps {
  patientId: string;
  planId?: string;
  onViewVersion?: (version: Version) => void;
  onCompareVersions?: (version1: Version, version2: Version) => void;
}

export default function PreventionPlanHistory({
  patientId,
  planId,
  onViewVersion,
  onCompareVersions,
}: PreventionPlanHistoryProps) {
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'versions'>('timeline');
  const [selectedForCompare, setSelectedForCompare] = useState<Version[]>([]);

  useEffect(() => {
    fetchHistory();
  }, [patientId, planId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = planId
        ? `/api/prevention/history/${patientId}?planId=${planId}`
        : `/api/prevention/history/${patientId}`;

      const response = await fetch(url);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch history');
      }

      setHistoryData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCompareSelection = (version: Version) => {
    setSelectedForCompare((prev) => {
      const isSelected = prev.some((v) => v.id === version.id);
      if (isSelected) {
        return prev.filter((v) => v.id !== version.id);
      }
      if (prev.length >= 2) {
        return [prev[1], version];
      }
      return [...prev, version];
    });
  };

  const handleCompare = () => {
    if (selectedForCompare.length === 2 && onCompareVersions) {
      onCompareVersions(selectedForCompare[0], selectedForCompare[1]);
      setSelectedForCompare([]);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'plan_created':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'plan_updated':
      case 'goal_added':
        return <Activity className="w-4 h-4 text-purple-600" />;
      case 'goal_completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'screening_completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'screening_scheduled':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'screening_overdue':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'encounter_linked':
        return <GitCompare className="w-4 h-4 text-indigo-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'plan_created':
        return 'bg-blue-100 border-blue-300';
      case 'goal_completed':
      case 'screening_completed':
        return 'bg-green-100 border-green-300';
      case 'screening_overdue':
        return 'bg-red-100 border-red-300';
      case 'encounter_linked':
        return 'bg-indigo-100 border-indigo-300';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchHistory}
          className="mt-2 text-sm text-red-700 hover:text-red-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!historyData) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {historyData.plan?.planName || 'Prevention History'}
            </h3>
            {historyData.plan && (
              <p className="text-sm text-gray-600">
                {historyData.plan.planType.replace(/_/g, ' ')} - {historyData.plan.status}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode('versions')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                viewMode === 'versions'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Versions ({historyData.versions.length})
            </button>
          </div>
        </div>

        {/* Screening Compliance Summary */}
        <div className="mt-4 grid grid-cols-4 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-600">Total Screenings</p>
            <p className="text-xl font-bold text-gray-900">
              {historyData.screeningCompliance.totalScheduled}
            </p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-xs text-green-600">Completed</p>
            <p className="text-xl font-bold text-green-700">
              {historyData.screeningCompliance.completed}
            </p>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <p className="text-xs text-red-600">Overdue</p>
            <p className="text-xl font-bold text-red-700">
              {historyData.screeningCompliance.overdue}
            </p>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-xs text-blue-600">Compliance</p>
            <p className="text-xl font-bold text-blue-700">
              {historyData.screeningCompliance.complianceRate}%
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[500px] overflow-y-auto">
        {viewMode === 'timeline' ? (
          /* Timeline View */
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-4">
              {historyData.timeline.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No timeline events yet
                </div>
              ) : (
                historyData.timeline.map((event) => (
                  <div key={event.id} className="relative pl-10">
                    <div
                      className={`absolute left-2.5 w-3 h-3 rounded-full ${
                        event.type.includes('overdue')
                          ? 'bg-red-500'
                          : event.type.includes('completed')
                            ? 'bg-green-500'
                            : 'bg-blue-500'
                      }`}
                    />
                    <div
                      className={`p-3 rounded-lg border ${getEventColor(event.type)}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          {getEventIcon(event.type)}
                          <span className="font-medium text-gray-900">{event.title}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {getRelativeTime(event.date)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{event.description}</p>
                      {event.actor && (
                        <div className="mt-2 flex items-center space-x-1 text-xs text-gray-500">
                          <User className="w-3 h-3" />
                          <span>{event.actor}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Versions View */
          <div className="space-y-4">
            {selectedForCompare.length === 2 && (
              <button
                onClick={handleCompare}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <GitCompare className="w-4 h-4" />
                <span>Compare Selected Versions</span>
              </button>
            )}

            {historyData.versions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No version history available
              </div>
            ) : (
              historyData.versions.map((version, index) => {
                const isLatest = index === 0;
                const isSelected = selectedForCompare.some((v) => v.id === version.id);

                return (
                  <div
                    key={version.id}
                    className={`p-4 rounded-lg border ${
                      isSelected
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-gray-900">
                            Version {version.version}
                          </span>
                          {isLatest && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        {version.changeReason && (
                          <p className="text-sm text-gray-600 mt-1">{version.changeReason}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleToggleCompareSelection(version)}
                        className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </button>
                    </div>

                    {/* Change details */}
                    {version.changes && (version.changes as any).type && (
                      <div className="mb-2">
                        <span className="inline-flex items-center px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                          {(version.changes as any).type.replace(/_/g, ' ')}
                        </span>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      {version.clinician && (
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>{version.clinician.name || version.clinician.email}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{getRelativeTime(version.createdAt)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center space-x-2">
                      {onViewVersion && (
                        <button
                          onClick={() => onViewVersion(version)}
                          className="flex items-center space-x-1 px-3 py-1.5 text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Details</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
