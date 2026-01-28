
'use client';

import { useEffect, useState } from 'react';
import { getGovernanceLogs, getSafetyStats } from './actions';
import GovernanceFeedTable from '@/components/governance/GovernanceFeedTable';
import SafetyPulse from '@/components/governance/SafetyPulse';
import { Button } from '@/components/ui/Button';
import { RefreshCw } from 'lucide-react';

// Polling Interval: 5 seconds
const REFRESH_INTERVAL = 5000;

export default function GovernanceDashboard() {
    const [logs, setLogs] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({ sessionsAudited: 0, interventionsTriggered: 0, avgSafetyScore: 0 });
    const [loading, setLoading] = useState(true);
    const [lastRefreshed, setLastRefreshed] = useState(new Date());

    const fetchData = async () => {
        // Parallel fetch
        const [logsRes, statsRes] = await Promise.all([
            getGovernanceLogs(),
            getSafetyStats()
        ]);

        if (logsRes.data) setLogs(logsRes.data);
        if (statsRes.data) setStats(statsRes.data);

        setLoading(false);
        setLastRefreshed(new Date());
    };

    useEffect(() => {
        fetchData(); // Initial load

        const interval = setInterval(() => {
            fetchData();
        }, REFRESH_INTERVAL);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col space-y-6 p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Mission Control</h1>
                    <p className="text-muted-foreground">
                        Real-time Clinical Governance & Adversarial Audit Feed
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">
                        Last updated: {lastRefreshed.toLocaleTimeString()}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchData()}
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            <SafetyPulse stats={stats} />

            <div className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight">Live Risk Feed (Last 50)</h2>
                <GovernanceFeedTable logs={logs} />
            </div>
        </div>
    );
}
