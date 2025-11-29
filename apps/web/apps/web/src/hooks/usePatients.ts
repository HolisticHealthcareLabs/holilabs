/**
 * Custom React Hooks for Patient Data Fetching
 *
 * Industry-grade data fetching hooks inspired by Medplum's useMedplum pattern
 * Provides consistent error handling, loading states, and refetch capabilities
 *
 * @inspiration Medplum React hooks architecture
 * @see https://www.medplum.com/docs/react
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Patient, Prescription, LabResult } from '@prisma/client';

// ============================================================================
// Base Types
// ============================================================================

interface UseFetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface UseFetchListState<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// usePatients - Fetch patient list with pagination
// ============================================================================

interface UsePatientsOptions {
  limit?: number;
  offset?: number;
  search?: string;
}

export function usePatients(options?: UsePatientsOptions): UseFetchListState<Patient> {
  const [data, setData] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options?.limit) params.set('limit', String(options.limit));
      if (options?.offset) params.set('offset', String(options.offset));
      if (options?.search) params.set('search', options.search);

      const res = await fetch(`/api/patients?${params.toString()}`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const patients = await res.json();
      setData(patients);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('[usePatients] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [options?.limit, options?.offset, options?.search]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  return { data, loading, error, refetch: fetchPatients };
}

// ============================================================================
// usePatient - Fetch single patient with access logging
// ============================================================================

interface UsePatientOptions {
  id: string;
  accessReason?: string;
  accessPurpose?: string;
}

export function usePatient(options: UsePatientOptions): UseFetchState<Patient> {
  const [data, setData] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPatient = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Step 1: Log access (if reason provided)
      if (options.accessReason) {
        const logRes = await fetch(`/api/patients/${options.id}/log-access`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessReason: options.accessReason,
            accessPurpose: options.accessPurpose,
          }),
        });

        if (!logRes.ok) {
          throw new Error('Failed to log patient access');
        }
      }

      // Step 2: Fetch patient data
      const res = await fetch(`/api/patients/${options.id}`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const patient = await res.json();
      setData(patient);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('[usePatient] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [options.id, options.accessReason, options.accessPurpose]);

  useEffect(() => {
    fetchPatient();
  }, [fetchPatient]);

  return { data, loading, error, refetch: fetchPatient };
}

// ============================================================================
// usePrescriptions - Fetch patient prescriptions
// ============================================================================

export function usePrescriptions(patientId: string): UseFetchListState<Prescription> {
  const [data, setData] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPrescriptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/patients/${patientId}/prescriptions`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const prescriptions = await res.json();
      setData(prescriptions);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('[usePrescriptions] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  return { data, loading, error, refetch: fetchPrescriptions };
}

// ============================================================================
// useLabResults - Fetch patient lab results
// ============================================================================

export function useLabResults(patientId: string): UseFetchListState<LabResult> {
  const [data, setData] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchLabResults = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/patients/${patientId}/lab-results`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const labResults = await res.json();
      setData(labResults);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('[useLabResults] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchLabResults();
  }, [fetchLabResults]);

  return { data, loading, error, refetch: fetchLabResults };
}

// ============================================================================
// useAuditLogs - Fetch audit logs for compliance reporting
// ============================================================================

interface UseAuditLogsOptions {
  userId?: string;
  resource?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export function useAuditLogs(options?: UseAuditLogsOptions): UseFetchListState<any> {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options?.userId) params.set('userId', options.userId);
      if (options?.resource) params.set('resource', options.resource);
      if (options?.action) params.set('action', options.action);
      if (options?.startDate) params.set('startDate', options.startDate.toISOString());
      if (options?.endDate) params.set('endDate', options.endDate.toISOString());
      if (options?.limit) params.set('limit', String(options.limit));

      const res = await fetch(`/api/audit-logs?${params.toString()}`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const auditLogs = await res.json();
      setData(auditLogs);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('[useAuditLogs] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [
    options?.userId,
    options?.resource,
    options?.action,
    options?.startDate,
    options?.endDate,
    options?.limit,
  ]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  return { data, loading, error, refetch: fetchAuditLogs };
}

// ============================================================================
// useMutation - Generic mutation hook for POST/PUT/DELETE operations
// ============================================================================

interface UseMutationState<T> {
  mutate: (data: any) => Promise<T>;
  loading: boolean;
  error: Error | null;
  data: T | null;
  reset: () => void;
}

export function useMutation<T>(
  url: string,
  method: 'POST' | 'PUT' | 'DELETE' = 'POST'
): UseMutationState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (body: any): Promise<T> => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: method !== 'DELETE' ? JSON.stringify(body) : undefined,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const responseData = await res.json();
        setData(responseData);
        return responseData;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        console.error('[useMutation] Error:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [url, method]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { mutate, loading, error, data, reset };
}
