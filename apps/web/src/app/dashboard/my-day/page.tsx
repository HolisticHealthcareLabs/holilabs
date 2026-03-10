'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Calendar, Clock, Stethoscope,
  User, FileText, CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import { PatientQueue, type Appointment } from './_components/PatientQueue';
import { TaskWidget, type TaskItem } from './_components/TaskWidget';

// ---------------------------------------------------------------------------
// Time-aware greeting
// ---------------------------------------------------------------------------

function getGreeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatToday(now: Date): string {
  return now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatLocalTime(now: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
}

function formatTimeZone(now: Date): string {
  const tz = Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
    .formatToParts(now)
    .find((part) => part.type === 'timeZoneName')?.value;
  const iana = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (tz && iana) return `${tz} (${iana})`;
  return tz || iana || 'Local time';
}

function getDoctorLastName(fullName?: string | null): string | null {
  if (!fullName) return null;
  const normalized = fullName.replace(/^\s*(dr|dra|doctor|doctora)\.?\s+/i, '').trim();
  if (!normalized) return null;
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return parts.slice(1).join(' ');
  return parts[0] || null;
}

// ---------------------------------------------------------------------------
// Mock data: LATAM clinic morning schedule
// ---------------------------------------------------------------------------

const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: 'P002',
    time: '08:00 AM',
    patientName: 'Maria Santos',
    initials: 'MS',
    age: 53,
    sex: 'F',
    chiefComplaint: 'Follow-up: HTN + CKD Stage 3 (eGFR trending)',
    status: 'Finished',
  },
  {
    id: 'P003',
    time: '08:30 AM',
    patientName: "James O'Brien",
    initials: 'JO',
    age: 80,
    sex: 'M',
    chiefComplaint: 'Chest tightness 5 days, bilateral ankle edema',
    status: 'Pending Signature',
  },
  {
    id: 'P004',
    time: '09:00 AM',
    patientName: 'Sofia Reyes',
    initials: 'SR',
    age: 41,
    sex: 'F',
    chiefComplaint: 'Annual cardiology review, lipid panel results',
    status: 'In Progress',
  },
  {
    id: 'P001',
    time: '09:30 AM',
    patientName: 'Robert Chen',
    initials: 'RC',
    age: 67,
    sex: 'M',
    chiefComplaint: 'Warfarin INR check, atrial fibrillation management',
    status: 'Arrived',
  },
  {
    id: 'apt-005',
    time: '10:00 AM',
    patientName: 'Juliana Costa Lima',
    initials: 'JL',
    age: 38,
    sex: 'F',
    chiefComplaint: 'New patient: palpitations and exercise intolerance',
    status: 'Scheduled',
  },
  {
    id: 'apt-006',
    time: '10:30 AM',
    patientName: 'Fernando Augusto Vieira',
    initials: 'FV',
    age: 63,
    sex: 'M',
    chiefComplaint: 'Post-stent follow-up, dual antiplatelet review',
    status: 'Scheduled',
  },
  {
    id: 'apt-007',
    time: '11:15 AM',
    patientName: 'Lucia Helena Barbosa',
    initials: 'LB',
    age: 58,
    sex: 'F',
    chiefComplaint: 'Heart failure optimization, BNP trending up',
    status: 'Scheduled',
  },
];

const MOCK_TASKS: TaskItem[] = [
  {
    id: 'task-001',
    label: 'Unsigned SOAP Notes',
    count: 2,
    icon: 'signature',
    urgency: 'high',
    href: '/dashboard/clinical-command',
  },
  {
    id: 'task-002',
    label: 'Pending Prior Authorizations',
    count: 1,
    icon: 'auth',
    urgency: 'medium',
    href: '/dashboard/billing',
  },
  {
    id: 'task-003',
    label: 'Lab Results to Review',
    count: 3,
    icon: 'lab',
    urgency: 'medium',
    href: '/dashboard/patients',
  },
];

// ---------------------------------------------------------------------------
// Summary stats derived from appointments
// ---------------------------------------------------------------------------

interface KpiCard {
  label: string;
  value: number;
  Icon: LucideIcon;
  accent: string;
  border: string;
}

function useScheduleStats(appointments: Appointment[]) {
  return useMemo(() => {
    const total = appointments.length;
    const seen = appointments.filter((a) =>
      a.status === 'Finished' || a.status === 'Pending Signature' || a.status === 'In Progress'
    ).length;
    const arrivedCount = appointments.filter((a) => a.status === 'Arrived').length;
    const unsignedCount = appointments.filter((a) => a.status === 'Pending Signature').length;
    const remaining = appointments.filter((a) =>
      a.status === 'Scheduled' || a.status === 'Arrived'
    ).length;
    return { total, seen, arrivedCount, unsignedCount, remaining };
  }, [appointments]);
}

function useKpiCards(appointments: Appointment[]): KpiCard[] {
  const stats = useScheduleStats(appointments);
  return useMemo(() => [
    {
      label: 'Patients Today',
      value: stats.total,
      Icon: User,
      accent: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200/60 dark:border-blue-500/20',
    },
    {
      label: 'Remaining',
      value: stats.remaining,
      Icon: Calendar,
      accent: 'text-slate-600 dark:text-slate-300',
      border: 'border-slate-200/80 dark:border-slate-700/40',
    },
    {
      label: 'Waiting Room',
      value: stats.arrivedCount,
      Icon: CheckCircle2,
      accent: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200/60 dark:border-emerald-500/20',
    },
    {
      label: 'Unsigned Charts',
      value: stats.unsignedCount,
      Icon: FileText,
      accent: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200/60 dark:border-amber-500/20',
    },
  ], [stats]);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MyDayPage() {
  const { data: session } = useSession();
  const [now, setNow] = useState<Date | null>(null);
  const [isClockReady, setIsClockReady] = useState(false);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    setIsClockReady(true);
    const interval = window.setInterval(() => {
      tick();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const userRole = String((session?.user as { role?: string } | undefined)?.role ?? 'CLINICIAN');
  const doctorLastName = getDoctorLastName(session?.user?.name);
  const greeting = isClockReady && now ? getGreeting(now) : 'Welcome';
  const todayLabel = isClockReady && now ? formatToday(now) : 'Loading local date';
  const localTimeLabel = isClockReady && now ? formatLocalTime(now) : '--:--';
  const timeZoneLabel = isClockReady && now ? formatTimeZone(now) : 'Detecting timezone';
  const stats = useScheduleStats(MOCK_APPOINTMENTS);
  const kpiCards = useKpiCards(MOCK_APPOINTMENTS);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header: greeting + date */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            {greeting}{doctorLastName ? `, Dr. ${doctorLastName}` : ''}
          </h1>
          <p suppressHydrationWarning className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {todayLabel}
          </p>
        </div>

        {/* Stat pills */}
        <div className="flex items-center gap-3">
          <div suppressHydrationWarning className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
            <Clock className="w-3.5 h-3.5" />
            {localTimeLabel}
            <span className="text-cyan-500/80 dark:text-cyan-300/80 font-medium">
              {timeZoneLabel}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">
            <Stethoscope className="w-3.5 h-3.5" />
            {stats.seen}/{stats.total} patients seen
          </div>
          {stats.arrivedCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {stats.arrivedCount} in lobby
            </div>
          )}
          {stats.unsignedCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-xs font-semibold text-amber-700 dark:text-amber-300">
              {stats.unsignedCount} unsigned
            </div>
          )}
        </div>
      </div>

      {/* Morning Huddle KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className={`
              rounded-2xl border bg-white dark:bg-gray-900 p-4
              ${card.border}
            `}
          >
            <div className="flex items-center gap-2 mb-2.5">
              <card.Icon className={`w-4 h-4 ${card.accent}`} />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {card.label}
              </span>
            </div>
            <p className={`text-3xl font-bold tabular-nums ${card.accent}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Grid: Schedule + Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient queue: 2/3 */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-none overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Today&apos;s Schedule
            </h2>
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
              {MOCK_APPOINTMENTS.length} appointments
            </span>
          </div>
          <PatientQueue appointments={MOCK_APPOINTMENTS} userRole={userRole} />
        </div>

        {/* Tasks: 1/3 */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-none overflow-hidden">
          <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Requires Attention
            </h2>
          </div>
          <TaskWidget tasks={MOCK_TASKS} userRole={userRole} />
        </div>
      </div>
    </div>
  );
}
