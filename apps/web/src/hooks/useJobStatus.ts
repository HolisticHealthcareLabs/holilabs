/**
 * useJobStatus Hook - CDSS V3 Async Engine
 *
 * React hook for polling async job status from BullMQ queues.
 * Used by components to track progress of document parsing,
 * summary generation, and FHIR sync operations.
 *
 * Features:
 * - Automatic polling while job is active (every 2s by default)
 * - Stops polling when job completes or fails
 * - Manual refresh capability
 * - Cleanup on unmount
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { JobStatusResponse, JobStatus } from '@/lib/queue/types';

interface UseJobStatusOptions {
  /** Polling interval in ms (default: 2000) */
  pollingInterval?: number;
  /** Whether to automatically start polling (default: true) */
  autoStart?: boolean;
  /** Callback when job completes successfully */
  onComplete?: (result: unknown) => void;
  /** Callback when job fails */
  onError?: (error: string) => void;
}

interface UseJobStatusResult {
  /** Current job status */
  status: JobStatus;
  /** Progress percentage (0-100) */
  progress: number;
  /** Job result if completed */
  result: unknown | null;
  /** Error message if failed */
  error: string | null;
  /** Whether the hook is loading initial data */
  isLoading: boolean;
  /** Whether the job has completed successfully */
  isComplete: boolean;
  /** Whether the job has failed */
  isFailed: boolean;
  /** Whether polling is currently active */
  isPolling: boolean;
  /** Manually refresh the job status */
  refresh: () => Promise<void>;
  /** Start polling */
  startPolling: () => void;
  /** Stop polling */
  stopPolling: () => void;
}

const DEFAULT_POLLING_INTERVAL = 2000; // 2 seconds

export function useJobStatus(
  jobId: string | null,
  options: UseJobStatusOptions = {}
): UseJobStatusResult {
  const {
    pollingInterval = DEFAULT_POLLING_INTERVAL,
    autoStart = true,
    onComplete,
    onError,
  } = options;

  const [status, setStatus] = useState<JobStatus>('waiting');
  const [progress, setProgress] = useState<number>(0);
  const [result, setResult] = useState<unknown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  // Use refs to avoid stale closures in interval callback
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  // Update callback refs
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onComplete, onError]);

  const fetchStatus = useCallback(async () => {
    if (!jobId) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/jobs/${jobId}/status`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch job status');
      }

      const data = await response.json();

      if (data.success && data.data) {
        const jobData = data.data as JobStatusResponse;
        setStatus(jobData.status);
        setProgress(jobData.progress);

        if (jobData.status === 'completed') {
          setResult(jobData.result);
          setError(null);
          // Call onComplete callback
          if (onCompleteRef.current) {
            onCompleteRef.current(jobData.result);
          }
        } else if (jobData.status === 'failed') {
          setError(jobData.error || 'Job failed');
          setResult(null);
          // Call onError callback
          if (onErrorRef.current) {
            onErrorRef.current(jobData.error || 'Job failed');
          }
        }

        return jobData.status;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const startPolling = useCallback(() => {
    if (!jobId || pollingRef.current) return;

    setIsPolling(true);

    // Initial fetch
    fetchStatus();

    // Set up polling interval
    pollingRef.current = setInterval(async () => {
      const currentStatus = await fetchStatus();

      // Stop polling if job is complete or failed
      if (currentStatus === 'completed' || currentStatus === 'failed') {
        stopPolling();
      }
    }, pollingInterval);
  }, [jobId, fetchStatus, pollingInterval, stopPolling]);

  // Auto-start polling when jobId changes
  useEffect(() => {
    if (jobId && autoStart) {
      // Reset state for new job
      setStatus('waiting');
      setProgress(0);
      setResult(null);
      setError(null);
      startPolling();
    } else {
      stopPolling();
    }

    // Cleanup on unmount or jobId change
    return () => {
      stopPolling();
    };
  }, [jobId, autoStart, startPolling, stopPolling]);

  const refresh = useCallback(async () => {
    await fetchStatus();
  }, [fetchStatus]);

  return {
    status,
    progress,
    result,
    error,
    isLoading,
    isComplete: status === 'completed',
    isFailed: status === 'failed',
    isPolling,
    refresh,
    startPolling,
    stopPolling,
  };
}

/**
 * Hook specifically for document parsing jobs
 */
export function useDocumentParseStatus(
  jobId: string | null,
  options?: UseJobStatusOptions
) {
  return useJobStatus(jobId, options);
}

/**
 * Hook specifically for summary generation jobs
 */
export function useSummaryGenStatus(
  jobId: string | null,
  options?: UseJobStatusOptions
) {
  return useJobStatus(jobId, options);
}

/**
 * Hook specifically for FHIR sync jobs
 */
export function useFhirSyncStatus(
  jobId: string | null,
  options?: UseJobStatusOptions
) {
  return useJobStatus(jobId, options);
}
