'use client';

/**
 * Prevention History Page
 *
 * Phase 3: History & Compliance
 * Displays full prevention history for a patient including:
 * - Plan version history with comparison
 * - Timeline of all prevention events
 * - Screening compliance metrics
 */

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import PreventionPlanHistory from '@/components/prevention/PreventionPlanHistory';
import PreventionPlanVersionComparison from '@/components/prevention/PreventionPlanVersionComparison';

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

export default function PreventionHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = (params?.patientId as string) || '';

  const [viewMode, setViewMode] = useState<'history' | 'comparison'>('history');
  const [comparisonVersions, setComparisonVersions] = useState<{
    version1: Version;
    version2: Version;
  } | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);

  const handleViewVersion = (version: Version) => {
    setSelectedVersion(version);
    // Could open a modal or detail view
    console.log('View version:', version);
  };

  const handleCompareVersions = (version1: Version, version2: Version) => {
    setComparisonVersions({ version1, version2 });
    setViewMode('comparison');
  };

  const handleBackToHistory = () => {
    setViewMode('history');
    setComparisonVersions(null);
  };

  const handleBackToDashboard = () => {
    router.push('/dashboard/prevention/hub');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={viewMode === 'comparison' ? handleBackToHistory : handleBackToDashboard}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Go back"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {viewMode === 'history' ? 'Prevention History' : 'Version Comparison'}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {viewMode === 'history'
                    ? 'View prevention plan history and screening timeline'
                    : 'Compare differences between plan versions'}
                </p>
              </div>
            </div>

            {viewMode === 'history' && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Patient ID:</span>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">{patientId}</code>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'history' ? (
          <PreventionPlanHistory
            patientId={patientId}
            onViewVersion={handleViewVersion}
            onCompareVersions={handleCompareVersions}
          />
        ) : (
          comparisonVersions && (
            <PreventionPlanVersionComparison
              version1={comparisonVersions.version1}
              version2={comparisonVersions.version2}
              onClose={handleBackToHistory}
            />
          )
        )}

        {/* Selected Version Detail Modal */}
        {selectedVersion && viewMode === 'history' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-auto m-4">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Version {selectedVersion.version} Details
                  </h3>
                  <button
                    onClick={() => setSelectedVersion(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    &times;
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Change Reason</p>
                    <p className="font-medium text-gray-900">
                      {selectedVersion.changeReason || 'No reason provided'}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Changed By</p>
                    <p className="font-medium text-gray-900">
                      {selectedVersion.clinician?.name || selectedVersion.changedBy}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedVersion.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-2">Changes</p>
                    <pre className="bg-gray-50 p-3 rounded-lg text-xs overflow-auto">
                      {JSON.stringify(selectedVersion.changes, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-2">Plan Data Snapshot</p>
                    <pre className="bg-gray-50 p-3 rounded-lg text-xs overflow-auto max-h-[200px]">
                      {JSON.stringify(selectedVersion.planData, null, 2)}
                    </pre>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setSelectedVersion(null)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
