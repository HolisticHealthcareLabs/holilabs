/**
 * CDSS V3 - Conflict Review Queue Component
 *
 * Displays pending FHIR sync conflicts for human review.
 * CRITICAL: No auto-merge. All conflicts must be resolved manually.
 *
 * Features:
 * - List of pending conflicts
 * - Side-by-side diff view
 * - Resolution actions (Keep Local, Keep Remote, Manual Merge)
 * - Audit trail display
 */

'use client';

import React, { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// Types
interface ConflictSummary {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  resourceType: string;
  resourceId: string;
  operation: string;
  status: string;
  localVersion: number;
  remoteVersion: string | null;
  retryCount: number;
  createdAt: string;
  patientName?: string;
  mrn?: string;
  dateOfBirth?: string;
  conflictSummary: {
    hasLocalData: boolean;
    hasRemoteData: boolean;
    detectedAt?: string;
  };
}

interface ConflictDetail {
  id: string;
  direction: string;
  resourceType: string;
  resourceId: string;
  operation: string;
  status: string;
  localVersion: number;
  remoteVersion: string | null;
  createdAt: string;
  conflictData: {
    local: unknown;
    remote: unknown;
    detectedAt?: string;
  };
  currentLocalData?: unknown;
  instructions: {
    KEEP_LOCAL: string;
    KEEP_REMOTE: string;
    MANUAL_MERGE: string;
  };
  warning: string;
}

interface ConflictReviewQueueProps {
  resourceType?: string;
  onResolve?: (conflictId: string, resolution: string) => void;
  className?: string;
}

// Fetcher for SWR
const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Alert icon
const AlertIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

// Check icon
const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// Sync icon
const SyncIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

// Conflict detail modal
function ConflictDetailModal({
  conflictId,
  onClose,
  onResolve,
}: {
  conflictId: string;
  onClose: () => void;
  onResolve: (resolution: string) => void;
}) {
  const { data, error, isLoading } = useSWR<{ success: boolean; data: ConflictDetail }>(
    `/api/fhir/conflicts/${conflictId}`,
    fetcher
  );
  const [isResolving, setIsResolving] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState<string | null>(null);

  const handleResolve = async (resolution: string) => {
    setIsResolving(true);
    setSelectedResolution(resolution);

    try {
      const response = await fetch(`/api/fhir/conflicts/${conflictId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution }),
      });

      const result = await response.json();

      if (result.success) {
        onResolve(resolution);
        onClose();
      } else {
        alert(`Failed to resolve: ${result.error}`);
      }
    } catch (err) {
      alert('Failed to resolve conflict');
    } finally {
      setIsResolving(false);
      setSelectedResolution(null);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card variant="elevated" padding="lg" className="max-w-4xl w-full mx-4">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        </Card>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card variant="elevated" padding="lg" className="max-w-md mx-4">
          <CardContent>
            <p className="text-red-600">Failed to load conflict details</p>
            <Button onClick={onClose} className="mt-4">Close</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const conflict = data.data;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto py-8">
      <Card variant="elevated" padding="none" className="max-w-5xl w-full mx-4 my-auto">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-red-50 dark:bg-red-950/30">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400">
                <AlertIcon />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Conflict Review Required
                </h2>
                <p className="text-sm text-red-600 dark:text-red-400">
                  {conflict.warning}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Meta info */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-neutral-500 dark:text-neutral-500">Resource Type</span>
              <p className="font-medium text-neutral-900 dark:text-neutral-100">{conflict.resourceType}</p>
            </div>
            <div>
              <span className="text-neutral-500 dark:text-neutral-500">Direction</span>
              <p className="font-medium text-neutral-900 dark:text-neutral-100">{conflict.direction}</p>
            </div>
            <div>
              <span className="text-neutral-500 dark:text-neutral-500">Operation</span>
              <p className="font-medium text-neutral-900 dark:text-neutral-100">{conflict.operation}</p>
            </div>
            <div>
              <span className="text-neutral-500 dark:text-neutral-500">Detected</span>
              <p className="font-medium text-neutral-900 dark:text-neutral-100">
                {new Date(conflict.conflictData.detectedAt || conflict.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Diff view */}
        <div className="p-4 grid grid-cols-2 gap-4">
          {/* Local data */}
          <div className="border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden">
            <div className="bg-blue-50 dark:bg-blue-950/30 px-4 py-2 border-b border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-800 dark:text-blue-300">
                Local Version (Your Data)
              </h3>
              <p className="text-xs text-blue-600 dark:text-blue-400">Version: {conflict.localVersion}</p>
            </div>
            <div className="p-4 bg-white dark:bg-neutral-950">
              <pre className="text-xs overflow-auto max-h-96 text-neutral-700 dark:text-neutral-300">
                {JSON.stringify(conflict.conflictData.local, null, 2)}
              </pre>
            </div>
          </div>

          {/* Remote data */}
          <div className="border border-green-200 dark:border-green-800 rounded-lg overflow-hidden">
            <div className="bg-green-50 dark:bg-green-950/30 px-4 py-2 border-b border-green-200 dark:border-green-800">
              <h3 className="font-semibold text-green-800 dark:text-green-300">
                Remote Version (FHIR Server)
              </h3>
              <p className="text-xs text-green-600 dark:text-green-400">Version: {conflict.remoteVersion || 'N/A'}</p>
            </div>
            <div className="p-4 bg-white dark:bg-neutral-950">
              <pre className="text-xs overflow-auto max-h-96 text-neutral-700 dark:text-neutral-300">
                {JSON.stringify(conflict.conflictData.remote, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Resolution actions */}
        <CardFooter className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
          <div className="flex flex-col gap-4 w-full">
            <div className="grid grid-cols-3 gap-4">
              {/* Keep Local */}
              <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Keep Local</h4>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                  {conflict.instructions.KEEP_LOCAL}
                </p>
                <Button
                  variant="secondary"
                  onClick={() => handleResolve('KEEP_LOCAL')}
                  disabled={isResolving}
                  className="w-full"
                >
                  {isResolving && selectedResolution === 'KEEP_LOCAL' ? 'Resolving...' : 'Keep Local Data'}
                </Button>
              </div>

              {/* Keep Remote */}
              <div className="border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">Keep Remote</h4>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                  {conflict.instructions.KEEP_REMOTE}
                </p>
                <Button
                  variant="secondary"
                  onClick={() => handleResolve('KEEP_REMOTE')}
                  disabled={isResolving}
                  className="w-full"
                >
                  {isResolving && selectedResolution === 'KEEP_REMOTE' ? 'Resolving...' : 'Keep Remote Data'}
                </Button>
              </div>

              {/* Manual Merge */}
              <div className="border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">Manual Merge</h4>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                  {conflict.instructions.MANUAL_MERGE}
                </p>
                <Button
                  variant="ghost"
                  disabled={true}
                  className="w-full"
                >
                  Coming Soon
                </Button>
              </div>
            </div>

            <p className="text-xs text-center text-neutral-500 dark:text-neutral-500">
              This action will be logged for HIPAA compliance. Choose carefully.
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

// Main component
export function ConflictReviewQueue({
  resourceType,
  onResolve,
  className = '',
}: ConflictReviewQueueProps) {
  const [selectedConflict, setSelectedConflict] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Build query URL
  const queryParams = new URLSearchParams();
  queryParams.set('page', page.toString());
  if (resourceType) {
    queryParams.set('resourceType', resourceType);
  }

  const { data, error, isLoading } = useSWR<{
    success: boolean;
    data: {
      conflicts: ConflictSummary[];
      pagination: {
        page: number;
        limit: number;
        totalCount: number;
        totalPages: number;
        hasMore: boolean;
      };
      warning?: string;
    };
  }>(
    `/api/fhir/conflicts?${queryParams.toString()}`,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  const handleResolve = useCallback((resolution: string) => {
    // Refresh the list
    mutate(`/api/fhir/conflicts?${queryParams.toString()}`);
    onResolve?.(selectedConflict!, resolution);
    setSelectedConflict(null);
  }, [selectedConflict, onResolve, queryParams]);

  if (isLoading) {
    return (
      <Card variant="outlined" padding="lg" className={className}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="outlined" padding="lg" className={className}>
        <div className="text-center py-8">
          <p className="text-red-600 dark:text-red-400">Failed to load conflicts</p>
        </div>
      </Card>
    );
  }

  const conflicts = data?.data?.conflicts || [];
  const pagination = data?.data?.pagination;
  const warning = data?.data?.warning;

  return (
    <>
      <Card variant="outlined" padding="none" className={className}>
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <CardHeader
            title="FHIR Sync Conflicts"
            subtitle={
              conflicts.length > 0
                ? `${pagination?.totalCount || conflicts.length} conflict(s) requiring review`
                : 'No conflicts pending'
            }
          />
          {warning && (
            <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertIcon />
                {warning}
              </p>
            </div>
          )}
        </div>

        {/* Conflict list */}
        {conflicts.length > 0 ? (
          <CardContent className="p-0">
            <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {conflicts.map((conflict) => (
                <li
                  key={conflict.id}
                  className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 cursor-pointer"
                  onClick={() => setSelectedConflict(conflict.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                        <SyncIcon />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                            {conflict.resourceType}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            conflict.direction === 'INBOUND'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          }`}>
                            {conflict.direction}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                            CONFLICT
                          </span>
                        </div>
                        {conflict.patientName && (
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            {conflict.patientName} • MRN: {conflict.mrn}
                          </p>
                        )}
                        <p className="text-xs text-neutral-500 dark:text-neutral-500">
                          Detected: {new Date(conflict.conflictSummary.detectedAt || conflict.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Button variant="secondary" size="sm">
                      Review
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={!pagination.hasMore}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        ) : (
          <CardContent>
            <div className="text-center py-8">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <CheckIcon />
              </div>
              <p className="text-neutral-600 dark:text-neutral-400">
                All syncs are up to date. No conflicts to review.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Detail modal */}
      {selectedConflict && (
        <ConflictDetailModal
          conflictId={selectedConflict}
          onClose={() => setSelectedConflict(null)}
          onResolve={handleResolve}
        />
      )}
    </>
  );
}

export default ConflictReviewQueue;
