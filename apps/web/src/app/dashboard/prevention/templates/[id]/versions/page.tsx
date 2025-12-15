'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeftIcon as ArrowLeft } from '@heroicons/react/24/outline';
import { Download } from 'lucide-react';
import VersionHistory from '@/components/prevention/VersionHistory';
import VersionComparison from '@/components/prevention/VersionComparison';

export default function TemplateVersionsPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  const [viewMode, setViewMode] = useState<'history' | 'comparison'>('history');
  const [comparisonVersions, setComparisonVersions] = useState<{
    versionId1: string;
    versionId2?: string;
    compareWithCurrent?: boolean;
  } | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  const handleViewVersion = (versionId: string) => {
    setSelectedVersionId(versionId);
    // Could open a modal or navigate to a detail view
    console.log('View version:', versionId);
  };

  const handleRevertToVersion = (versionId: string) => {
    // Refresh after revert - VersionHistory component handles this
    console.log('Reverted to version:', versionId);
  };

  const handleCompareVersions = (versionId1: string, versionId2?: string) => {
    if (versionId2) {
      // Compare two specific versions
      setComparisonVersions({
        versionId1,
        versionId2,
        compareWithCurrent: false,
      });
    } else {
      // Compare version with current state
      setComparisonVersions({
        versionId1,
        compareWithCurrent: true,
      });
    }
    setViewMode('comparison');
  };

  const handleBackToHistory = () => {
    setViewMode('history');
    setComparisonVersions(null);
  };

  const handleBackToTemplate = () => {
    router.push('/dashboard/prevention/templates');
  };

  const handleExportVersion = async (versionId: string) => {
    try {
      const response = await fetch(
        `/api/prevention/templates/${templateId}/versions/${versionId}`
      );
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      // Create download
      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template-version-${result.data.versionNumber}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to export version');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={viewMode === 'comparison' ? handleBackToHistory : handleBackToTemplate}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {viewMode === 'history' ? 'Historial de Versiones' : 'Comparación de Versiones'}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {viewMode === 'history'
                    ? 'Ver y gestionar versiones de la plantilla'
                    : 'Visualizar diferencias entre versiones'}
                </p>
              </div>
            </div>

            {viewMode === 'history' && selectedVersionId && (
              <button
                onClick={() => handleExportVersion(selectedVersionId)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Exportar Versión</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'history' ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <VersionHistory
              templateId={templateId}
              onViewVersion={handleViewVersion}
              onRevertToVersion={handleRevertToVersion}
              onCompareVersions={handleCompareVersions}
            />
          </div>
        ) : (
          comparisonVersions && (
            <VersionComparison
              templateId={templateId}
              versionId1={comparisonVersions.versionId1}
              versionId2={comparisonVersions.versionId2}
              compareWithCurrent={comparisonVersions.compareWithCurrent}
              onClose={handleBackToHistory}
            />
          )
        )}
      </div>
    </div>
  );
}
