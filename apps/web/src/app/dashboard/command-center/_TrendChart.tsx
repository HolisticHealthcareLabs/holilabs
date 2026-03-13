'use client';

import { useTranslations } from 'next-intl';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface TrendDatum {
  day: string;
  open: number;
  breached: number;
  resolved: number;
}

export default function TrendChart({ data }: { data: TrendDatum[] }) {
  const t = useTranslations('portal.trendChart');
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-none">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
        {t('title')}
      </h2>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorOpen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorBreached" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.2)" />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12, background: '#fff' }}
            labelStyle={{ fontWeight: 600 }}
          />
          <Area type="monotone" dataKey="open" stroke="#f59e0b" fill="url(#colorOpen)" strokeWidth={2} dot={false} />
          <Area type="monotone" dataKey="breached" stroke="#ef4444" fill="url(#colorBreached)" strokeWidth={2} dot={false} />
          <Area type="monotone" dataKey="resolved" stroke="#22c55e" fill="url(#colorResolved)" strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-3 justify-end">
        {[
          { color: '#f59e0b', label: t('open') },
          { color: '#ef4444', label: t('breached') },
          { color: '#22c55e', label: t('resolved') },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
