'use client';

import * as React from 'react';
import Link from 'next/link';
import { IntroQuestionnaireModal } from '@/components/onboarding/IntroQuestionnaireModal';

type Overview = {
  fleet: {
    totalDevices: number;
    onlineDevices: number;
    offlineDevices: number;
    last24hNewDevices: number;
  };
  policy: {
    rulesetVersion: string;
    lastUpdatedAt: string | null;
  };
  outcomes: {
    interventions24h: number;
    hardBrakes24h: number;
    nudges24h: number;
    p95LatencyMs: number | null;
  };
};

type Device = {
  id: string;
  deviceId: string;
  deviceType: string;
  hostname: string | null;
  os: string | null;
  lastHeartbeatAt: string;
  firstSeenAt: string;
  sidecarVersion: string | null;
  edgeVersion: string | null;
  rulesetVersion: string | null;
  status: 'online' | 'offline';
};

export const dynamic = 'force-dynamic';

export default function CommandCenterPage() {
  const [overview, setOverview] = React.useState<Overview | null>(null);
  const [devices, setDevices] = React.useState<Device[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showQ, setShowQ] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      try {
        const [oRes, dRes, pRes] = await Promise.all([
          fetch('/api/command-center/overview', { cache: 'no-store' }),
          fetch('/api/command-center/devices?limit=50', { cache: 'no-store' }),
          fetch('/api/onboarding/profile', { cache: 'no-store' }).catch(() => null),
        ]);

        const oJson = await oRes.json().catch(() => null);
        const dJson = await dRes.json().catch(() => null);

        const profileOk = pRes && pRes.ok;
        const profileJson = profileOk ? await pRes!.json().catch(() => null) : null;
        const hasProfile = !!profileJson?.data;

        if (!cancelled) {
          setOverview(oJson as Overview);
          setDevices((dJson?.data as Device[]) || []);
          setShowQ(!hasProfile); // optional but prompted if missing
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    const t = setInterval(run, 20_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Command Center</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Fleet health, policy rollout, and safety outcomes—built for clinic owners and hospital IT.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQ(true)}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Tailor onboarding
          </button>
          <Link
            href="/download"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-lg shadow-blue-600/20"
          >
            Downloads →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Metric
          title="Devices online"
          value={
            loading ? '—' : `${overview?.fleet.onlineDevices ?? 0}/${overview?.fleet.totalDevices ?? 0}`
          }
          sub="Last 5 minutes"
        />
        <Metric
          title="New devices"
          value={loading ? '—' : String(overview?.fleet.last24hNewDevices ?? 0)}
          sub="Last 24 hours"
        />
        <Metric
          title="Ruleset"
          value={loading ? '—' : overview?.policy.rulesetVersion ?? 'OFFLINE'}
          sub="Active policy version"
        />
        <Metric
          title="Hard brakes"
          value={loading ? '—' : String(overview?.outcomes.hardBrakes24h ?? 0)}
          sub="Last 24 hours"
        />
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="font-semibold text-gray-900 dark:text-white">Fleet</div>
          <div className="text-xs text-gray-600 dark:text-gray-300">
            Online = heartbeat within 5 minutes
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/40 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="text-left px-5 py-3 font-semibold">Device</th>
                <th className="text-left px-5 py-3 font-semibold">Type</th>
                <th className="text-left px-5 py-3 font-semibold">Last heartbeat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {devices.map((d) => (
                <tr key={d.id} className="text-gray-900 dark:text-white">
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-semibold ${
                        d.status === 'online'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'bg-gray-500/10 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          d.status === 'online' ? 'bg-emerald-500' : 'bg-gray-400'
                        }`}
                      />
                      {d.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-semibold">{d.hostname || d.deviceId}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">{d.deviceId}</div>
                  </td>
                  <td className="px-5 py-3">{d.deviceType}</td>
                  <td className="px-5 py-3">
                    {new Date(d.lastHeartbeatAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {!loading && devices.length === 0 && (
                <tr>
                  <td className="px-5 py-8 text-sm text-gray-600 dark:text-gray-300" colSpan={4}>
                    No devices yet. Go to <Link className="text-blue-600 dark:text-blue-400 font-semibold" href="/download">Downloads</Link> to install the Cortex agent.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <IntroQuestionnaireModal
        open={showQ}
        onClose={() => setShowQ(false)}
      />
    </div>
  );
}

function Metric({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
      <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
        {title}
      </div>
      <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">{sub}</div>
    </div>
  );
}

