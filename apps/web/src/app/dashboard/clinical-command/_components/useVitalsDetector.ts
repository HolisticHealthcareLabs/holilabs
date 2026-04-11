'use client';

import { useState, useCallback } from 'react';

export interface VitalItem {
  id: string;
  label: string;
  value: string;
  unit: string;
  selected: boolean;
}

export interface VitalsBatch {
  items: VitalItem[];
  detectedAt: string | null;
}

interface UseVitalsDetectorOptions {
  segments: any[];
  language: string;
  patientId: string | null;
  enabled: boolean;
}

export function useVitalsDetector(_options: UseVitalsDetectorOptions) {
  const [batch, setBatch] = useState<VitalsBatch>({ items: [], detectedAt: null });
  const [history, setHistory] = useState<VitalsBatch[]>([]);

  const acceptAll = useCallback(() => {
    if (batch.items.length > 0) {
      setHistory((h) => [...h, batch]);
      setBatch({ items: [], detectedAt: null });
    }
  }, [batch]);

  const dismissAll = useCallback(() => {
    setBatch({ items: [], detectedAt: null });
  }, []);

  const toggleItem = useCallback((id: string) => {
    setBatch((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      ),
    }));
  }, []);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setBatch(last);
      return prev.slice(0, -1);
    });
  }, []);

  return {
    pendingBatch: batch,
    acceptAll,
    dismiss: dismissAll,
    toggleItem,
    undo,
    canUndo: history.length > 0,
  };
}
