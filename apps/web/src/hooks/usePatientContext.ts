/**
 * usePatientContext Hook
 *
 * React hook to fetch and format patient context for AI prompts
 */

import { useState, useEffect } from 'react';

export type ContextFormat = 'full' | 'soap' | 'scribe' | 'summary';

interface UsePatientContextOptions {
  patientId: string;
  format?: ContextFormat;
  chiefComplaint?: string;
  appointmentReason?: string;
  autoFetch?: boolean;
}

interface PatientContextResult {
  context: any;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePatientContext({
  patientId,
  format = 'full',
  chiefComplaint,
  appointmentReason,
  autoFetch = true,
}: UsePatientContextOptions): PatientContextResult {
  const [context, setContext] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContext = async () => {
    if (!patientId) {
      setError('Patient ID is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        patientId,
        format,
      });

      if (chiefComplaint) {
        params.append('chiefComplaint', chiefComplaint);
      }

      if (appointmentReason) {
        params.append('appointmentReason', appointmentReason);
      }

      const response = await fetch(`/api/ai/patient-context?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch patient context');
      }

      const data = await response.json();
      setContext(data.context);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setContext(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch && patientId) {
      fetchContext();
    }
  }, [patientId, format, chiefComplaint, appointmentReason, autoFetch]);

  return {
    context,
    loading,
    error,
    refetch: fetchContext,
  };
}

/**
 * Hook specifically for SOAP note generation
 */
export function usePatientContextForSOAP(patientId: string, chiefComplaint: string) {
  return usePatientContext({
    patientId,
    format: 'soap',
    chiefComplaint,
    autoFetch: !!patientId && !!chiefComplaint,
  });
}

/**
 * Hook specifically for clinical scribe
 */
export function usePatientContextForScribe(patientId: string, appointmentReason: string) {
  return usePatientContext({
    patientId,
    format: 'scribe',
    appointmentReason,
    autoFetch: !!patientId && !!appointmentReason,
  });
}

/**
 * Hook for patient summary (quick view)
 */
export function usePatientSummary(patientId: string) {
  return usePatientContext({
    patientId,
    format: 'summary',
    autoFetch: !!patientId,
  });
}
