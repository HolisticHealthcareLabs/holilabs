
import { StatCard } from '@/components/ui/Card';
import { Activity, AlertTriangle, FileText } from 'lucide-react';

export default function SafetyPulse({ stats }: { stats: any }) {
    return (
        <div className="grid gap-4 md:grid-cols-3">
            <StatCard
                label="Sessions Audited (24h)"
                value={stats.sessionsAudited}
                icon={<FileText className="w-5 h-5 text-blue-500" />}
                iconBackground="bg-blue-50"
            />

            <StatCard
                label="Interventions Triggered"
                value={stats.interventionsTriggered}
                icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
                iconBackground="bg-red-50"
            />

            <StatCard
                label="Average Safety Score"
                value={`${stats.avgSafetyScore}%`}
                icon={<Activity className="w-5 h-5 text-emerald-500" />}
                iconBackground="bg-emerald-50"
            />
        </div>
    );
}
