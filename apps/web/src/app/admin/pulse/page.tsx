'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Activity, Shield } from 'lucide-react';

export default function PulseDashboard() {
    const [killSwitchActive, setKillSwitchActive] = useState(false);
    const [nodes, setNodes] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);

    // Simulate Live Data Feed
    useEffect(() => {
        const interval = setInterval(() => {
            // Mock Node States
            const newNodes = Array.from({ length: 5 }).map((_, i) => ({
                id: `node-00${i + 1}`,
                status: Math.random() > 0.9 ? 'error' : 'success',
                latency: Math.floor(Math.random() * 50) + 10,
                load: Math.floor(Math.random() * 100)
            }));
            setNodes(newNodes);

            // Mock Live Logs
            if (Math.random() > 0.7) {
                const log = {
                    id: Date.now(),
                    node: `node-00${Math.ceil(Math.random() * 5)}`,
                    msg: Math.random() > 0.5 ? 'Resource Pressure (CPU > 80%)' : 'Compliance Warning: CPF detected in payload',
                    level: Math.random() > 0.5 ? 'warning' : 'critical'
                };
                setLogs(prev => [log, ...prev].slice(0, 50));
            }

        }, 2000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Mission Control: Pulse</h1>
                    <p className="text-muted-foreground">Fleet Telemetry & Command</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${killSwitchActive ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                        <span className="font-mono text-sm">GLOBAL STATUS: {killSwitchActive ? 'EMERGENCY STOP' : 'NOMINAL'}</span>
                    </div>

                    <Button
                        variant={killSwitchActive ? "primary" : "danger"}
                        onClick={() => setKillSwitchActive(!killSwitchActive)}
                    >
                        {killSwitchActive ? 'DEACTIVATE KILL SWITCH' : 'ACTIVATE KILL SWITCH'}
                    </Button>
                </div>
            </div>

            {/* Fleet Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader
                        title="Active Nodes"
                        icon={<Activity className="h-4 w-4" />}
                    />
                    <CardContent>
                        <div className="text-2xl font-bold">42</div>
                        <p className="text-xs text-muted-foreground">+3 connected in last hour</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader
                        title="Critical Alerts (24h)"
                        icon={<Shield className="h-4 w-4" />}
                    />
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">3</div>
                        <p className="text-xs text-muted-foreground">2 Compliance, 1 Resource</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader
                        title="Avg Latency"
                        icon={<Activity className="h-4 w-4" />}
                    />
                    <CardContent>
                        <div className="text-2xl font-bold">24ms</div>
                        <p className="text-xs text-muted-foreground">Within SLA</p>
                    </CardContent>
                </Card>
            </div>

            {/* Node Grid Heatmap */}
            <Card>
                <CardHeader title="Fleet Status" />
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {nodes.map(node => (
                            <div key={node.id} className={`p-4 border rounded-lg flex flex-col items-center justify-center gap-2 ${node.status === 'error' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                                <span className="font-bold">{node.id}</span>
                                <span className="text-xs">{node.latency}ms</span>
                                <Badge variant={node.status === 'error' ? 'error' : 'success'}>
                                    {node.status.toUpperCase()}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Live Stream */}
            <Card className="h-[400px]">
                <CardHeader title="Live Telemetry Stream" />
                <CardContent className="overflow-auto h-[320px]">
                    <div className="space-y-2">
                        {logs.map(log => (
                            <div key={log.id} className="font-mono text-sm p-2 border-b flex gap-4 items-center animate-in fade-in slide-in-from-top-1">
                                <span className="text-muted-foreground">{new Date(log.id).toLocaleTimeString()}</span>
                                <Badge variant={log.level === 'critical' ? 'risk-critical' : 'neutral'}>{log.node}</Badge>
                                <span className={log.level === 'critical' ? 'text-red-600 font-bold' : ''}>{log.msg}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
