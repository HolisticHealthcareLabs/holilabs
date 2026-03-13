import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const colorMap = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    ring: 'ring-blue-100',
  },
  emerald: {
    bg: 'bg-emerald-50',
    icon: 'text-emerald-600',
    ring: 'ring-emerald-100',
  },
  indigo: {
    bg: 'bg-indigo-50',
    icon: 'text-indigo-600',
    ring: 'ring-indigo-100',
  },
  violet: {
    bg: 'bg-violet-50',
    icon: 'text-violet-600',
    ring: 'ring-violet-100',
  },
  green: {
    bg: 'bg-green-50',
    icon: 'text-green-600',
    ring: 'ring-green-100',
  },
} as const;

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description?: string;
  color: keyof typeof colorMap;
  highlight?: boolean;
}

export function StatCard({ title, value, icon: Icon, description, color, highlight }: StatCardProps) {
  const colors = colorMap[color];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md',
        highlight ? 'border-green-200 ring-2 ring-green-100' : 'border-slate-200'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-slate-500">{title}</p>
          <p
            className={cn(
              'mt-1.5 text-2xl font-bold tracking-tight',
              highlight ? 'text-green-700' : 'text-slate-900'
            )}
          >
            {value}
          </p>
          {description && (
            <p className="mt-1 truncate text-xs text-slate-400">{description}</p>
          )}
        </div>
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1',
            colors.bg,
            colors.ring
          )}
        >
          <Icon className={cn('h-4 w-4', colors.icon)} />
        </div>
      </div>
      {highlight && (
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-green-400 to-emerald-500" />
      )}
    </div>
  );
}
