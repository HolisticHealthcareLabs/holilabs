import { useState, useEffect } from 'react';

/**
 * Hook to track and retrieve tool usage statistics for intelligent defaulting
 */
export function useToolUsageTracker() {
    const [usageStats, setUsageStats] = useState<Record<string, number>>({});

    useEffect(() => {
        const raw = localStorage.getItem('holi.toolUsage');
        if (raw) {
            try {
                setUsageStats(JSON.parse(raw));
            } catch (e) {
                console.error('Failed to parse tool usage stats', e);
            }
        }
    }, []);

    const bumpUsage = (toolId: string) => {
        const newStats = {
            ...usageStats,
            [toolId]: (usageStats[toolId] || 0) + 1
        };
        setUsageStats(newStats);
        localStorage.setItem('holi.toolUsage', JSON.stringify(newStats));
    };

    const getMostUsed = (limit: number = 3) => {
        return Object.entries(usageStats)
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit)
            .map(([id]) => id);
    };

    return { usageStats, bumpUsage, getMostUsed };
}
