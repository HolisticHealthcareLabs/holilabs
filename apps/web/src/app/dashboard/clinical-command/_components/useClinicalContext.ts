'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { ClinicalContextResult } from '@/app/api/clinical/context-scan/route';

/**
 * useClinicalContext
 *
 * Fires an AI-powered background scan of the patient's medical record
 * the moment consent is granted — NOT on patient selection (LGPD-safe).
 *
 * Returns pre-computed clinical context: active meds with drug classes,
 * allergies with cross-reactivity, risk flags, interaction matrix, and
 * suggested screenings. Ready before the doctor speaks a word.
 *
 * Cache: one scan per patient per calendar day (browser-side).
 */

interface UseClinicalContextOptions {
  patientId: string | null;
  encounterId: string;
  consentGranted: boolean;
  facesheetData?: Record<string, unknown>;
}

interface UseClinicalContextReturn {
  context: ClinicalContextResult | null;
  isScanning: boolean;
  error: string | null;
  rescan: () => void;
}

// Browser-side cache: patientId:date → result
const browserCache = new Map<string, ClinicalContextResult>();

function cacheKey(patientId: string): string {
  return `${patientId}:${new Date().toISOString().slice(0, 10)}`;
}

export function useClinicalContext({
  patientId,
  encounterId,
  consentGranted,
  facesheetData,
}: UseClinicalContextOptions): UseClinicalContextReturn {
  const [context, setContext] = useState<ClinicalContextResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hasFiredRef = useRef(false);

  const scan = useCallback(async () => {
    if (!patientId || !consentGranted) return;

    // Check browser cache first
    const key = cacheKey(patientId);
    const cached = browserCache.get(key);
    if (cached) {
      setContext({ ...cached, encounterId });
      return;
    }

    setIsScanning(true);
    setError(null);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/clinical/context-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Access-Reason': 'CLINICAL_CARE' },
        signal: controller.signal,
        body: JSON.stringify({
          patientId,
          encounterId,
          facesheetData,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Scan failed (${res.status})`);
      }

      const data = await res.json();
      if (data.success && data.context) {
        browserCache.set(key, data.context);
        setContext(data.context);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Context scan failed';
      setError(msg);
    } finally {
      setIsScanning(false);
    }
  }, [patientId, encounterId, consentGranted, facesheetData]);

  // Fire scan when consent is granted (the critical trigger point)
  useEffect(() => {
    if (!consentGranted || !patientId) {
      hasFiredRef.current = false;
      setContext(null);
      return;
    }

    if (hasFiredRef.current) return;
    hasFiredRef.current = true;

    scan();
  }, [consentGranted, patientId, scan]);

  // Clear context on patient switch
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, [patientId]);

  const rescan = useCallback(() => {
    if (patientId) {
      browserCache.delete(cacheKey(patientId));
      hasFiredRef.current = false;
    }
    scan();
  }, [patientId, scan]);

  return { context, isScanning, error, rescan };
}
