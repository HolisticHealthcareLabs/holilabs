'use client';

/**
 * Prevention Plan Version Comparison Component
 *
 * Phase 3: History & Compliance
 * Compares two versions of a prevention plan showing differences.
 */

import { useState, useMemo } from 'react';
import { X, GitCompare, Check, AlertCircle, Plus, Minus, Edit } from 'lucide-react';

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

interface Goal {
  goal: string;
  status: string;
  category?: string;
  evidence?: string;
  addedAt?: string;
  addedBy?: string;
}

interface GoalDiff {
  goal: string;
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  oldStatus?: string;
  newStatus?: string;
  oldValue?: Goal;
  newValue?: Goal;
}

interface PreventionPlanVersionComparisonProps {
  version1: Version;
  version2: Version;
  onClose: () => void;
}

export default function PreventionPlanVersionComparison({
  version1,
  version2,
  onClose,
}: PreventionPlanVersionComparisonProps) {
  const [showOnlyChanges, setShowOnlyChanges] = useState(false);

  // Compute differences
  const diff = useMemo(() => {
    const v1Goals = ((version1.planData as any).goals as Goal[]) || [];
    const v2Goals = ((version2.planData as any).goals as Goal[]) || [];
    const v1Recommendations = ((version1.planData as any).recommendations as any[]) || [];
    const v2Recommendations = ((version2.planData as any).recommendations as any[]) || [];

    const goalDiffs: GoalDiff[] = [];

    // Find added and modified goals
    v2Goals.forEach((g) => {
      const matchingOld = v1Goals.find((v1g) => v1g.goal === g.goal);
      if (!matchingOld) {
        goalDiffs.push({
          goal: g.goal,
          type: 'added',
          newValue: g,
        });
      } else if (matchingOld.status !== g.status) {
        goalDiffs.push({
          goal: g.goal,
          type: 'modified',
          oldStatus: matchingOld.status,
          newStatus: g.status,
          oldValue: matchingOld,
          newValue: g,
        });
      } else {
        goalDiffs.push({
          goal: g.goal,
          type: 'unchanged',
          oldValue: matchingOld,
          newValue: g,
        });
      }
    });

    // Find removed goals
    v1Goals.forEach((g) => {
      const stillExists = v2Goals.find((v2g) => v2g.goal === g.goal);
      if (!stillExists) {
        goalDiffs.push({
          goal: g.goal,
          type: 'removed',
          oldValue: g,
        });
      }
    });

    // Status change
    const statusChanged =
      (version1.planData as any).status !== (version2.planData as any).status;
    const oldStatus = (version1.planData as any).status;
    const newStatus = (version2.planData as any).status;

    // Summary
    const summary = {
      goalsAdded: goalDiffs.filter((d) => d.type === 'added').length,
      goalsRemoved: goalDiffs.filter((d) => d.type === 'removed').length,
      goalsModified: goalDiffs.filter((d) => d.type === 'modified').length,
      goalsUnchanged: goalDiffs.filter((d) => d.type === 'unchanged').length,
      recommendationsAdded: Math.max(0, v2Recommendations.length - v1Recommendations.length),
      recommendationsRemoved: Math.max(0, v1Recommendations.length - v2Recommendations.length),
      statusChanged,
      oldStatus,
      newStatus,
    };

    return {
      goalDiffs,
      summary,
    };
  }, [version1, version2]);

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

  const displayedGoals = showOnlyChanges
    ? diff.goalDiffs.filter((d) => d.type !== 'unchanged')
    : diff.goalDiffs;

  const getDiffIcon = (type: string) => {
    switch (type) {
      case 'added':
        return <Plus className="w-4 h-4 text-green-600" />;
      case 'removed':
        return <Minus className="w-4 h-4 text-red-600" />;
      case 'modified':
        return <Edit className="w-4 h-4 text-orange-600" />;
      default:
        return <Check className="w-4 h-4 text-gray-400" />;
    }
  };

  const getDiffColor = (type: string) => {
    switch (type) {
      case 'added':
        return 'border-green-200 bg-green-50';
      case 'removed':
        return 'border-red-200 bg-red-50';
      case 'modified':
        return 'border-orange-200 bg-orange-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <GitCompare className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Version Comparison</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Version info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-600 font-medium mb-1">Old Version</p>
            <p className="text-lg font-semibold text-gray-900">Version {version1.version}</p>
            {version1.changeReason && (
              <p className="text-sm text-gray-600">{version1.changeReason}</p>
            )}
            <p className="text-xs text-gray-500 mt-2">{formatDate(version1.createdAt)}</p>
            {version1.clinician && (
              <p className="text-xs text-gray-500">
                by {version1.clinician.name || version1.clinician.email}
              </p>
            )}
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-sm text-green-600 font-medium mb-1">New Version</p>
            <p className="text-lg font-semibold text-gray-900">Version {version2.version}</p>
            {version2.changeReason && (
              <p className="text-sm text-gray-600">{version2.changeReason}</p>
            )}
            <p className="text-xs text-gray-500 mt-2">{formatDate(version2.createdAt)}</p>
            {version2.clinician && (
              <p className="text-xs text-gray-500">
                by {version2.clinician.name || version2.clinician.email}
              </p>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 flex items-center justify-between bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center space-x-6">
            <div>
              <p className="text-sm text-gray-600">Goals Added</p>
              <p className="text-2xl font-bold text-green-600">{diff.summary.goalsAdded}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Goals Removed</p>
              <p className="text-2xl font-bold text-red-600">{diff.summary.goalsRemoved}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Goals Modified</p>
              <p className="text-2xl font-bold text-orange-600">{diff.summary.goalsModified}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Unchanged</p>
              <p className="text-2xl font-bold text-gray-400">{diff.summary.goalsUnchanged}</p>
            </div>
          </div>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyChanges}
              onChange={(e) => setShowOnlyChanges(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Show only changes</span>
          </label>
        </div>

        {/* Status Change Alert */}
        {diff.summary.statusChanged && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              Plan status changed from <strong>{diff.summary.oldStatus}</strong> to{' '}
              <strong>{diff.summary.newStatus}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Goals Comparison */}
      <div className="p-6 max-h-[500px] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Goals Comparison</h3>

        {displayedGoals.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {showOnlyChanges ? 'No changes detected' : 'No goals to compare'}
          </div>
        ) : (
          <div className="space-y-3">
            {displayedGoals.map((goalDiff, index) => (
              <div
                key={`${goalDiff.goal}-${index}`}
                className={`p-4 rounded-lg border ${getDiffColor(goalDiff.type)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getDiffIcon(goalDiff.type)}
                    <span className="font-medium text-gray-900">{goalDiff.goal}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      goalDiff.type === 'added'
                        ? 'bg-green-100 text-green-700'
                        : goalDiff.type === 'removed'
                          ? 'bg-red-100 text-red-700'
                          : goalDiff.type === 'modified'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {goalDiff.type.charAt(0).toUpperCase() + goalDiff.type.slice(1)}
                  </span>
                </div>

                {goalDiff.type === 'modified' && (
                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Previous Status</p>
                      <span className="inline-flex px-2 py-0.5 bg-gray-200 text-gray-700 rounded">
                        {goalDiff.oldStatus}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">New Status</p>
                      <span className="inline-flex px-2 py-0.5 bg-blue-200 text-blue-700 rounded">
                        {goalDiff.newStatus}
                      </span>
                    </div>
                  </div>
                )}

                {goalDiff.type === 'added' && goalDiff.newValue && (
                  <div className="mt-2 text-sm">
                    <div className="flex items-center space-x-4 text-gray-600">
                      <span>
                        Status: <strong>{goalDiff.newValue.status}</strong>
                      </span>
                      {goalDiff.newValue.category && (
                        <span>
                          Category: <strong>{goalDiff.newValue.category}</strong>
                        </span>
                      )}
                    </div>
                    {goalDiff.newValue.evidence && (
                      <p className="mt-1 text-gray-500 text-xs">{goalDiff.newValue.evidence}</p>
                    )}
                  </div>
                )}

                {goalDiff.type === 'removed' && goalDiff.oldValue && (
                  <div className="mt-2 text-sm text-gray-600">
                    <span>
                      Was: <strong>{goalDiff.oldValue.status}</strong>
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
