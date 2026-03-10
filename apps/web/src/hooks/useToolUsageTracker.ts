import { useCallback, useRef } from 'react';

const STORAGE_KEY = 'holi.toolUsage';

function readStats(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function useToolUsageTracker() {
  const statsRef = useRef<Record<string, number> | null>(null);

  function getStats(): Record<string, number> {
    if (statsRef.current === null) {
      statsRef.current = readStats();
    }
    return statsRef.current;
  }

  const bumpUsage = useCallback((toolId: string) => {
    const current = getStats();
    const updated = { ...current, [toolId]: (current[toolId] || 0) + 1 };
    statsRef.current = updated;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // storage full or restricted
    }
  }, []);

  const getMostUsed = useCallback((limit: number = 3): string[] => {
    return Object.entries(getStats())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([id]) => id);
  }, []);

  return { usageStats: getStats(), bumpUsage, getMostUsed };
}
