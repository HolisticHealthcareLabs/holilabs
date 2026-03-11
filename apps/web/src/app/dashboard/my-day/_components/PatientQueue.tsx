'use client';

import { useEffect, useMemo, useState, useOptimistic, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { CalendarDays, ChevronRight, Play, ChevronDown } from 'lucide-react';
import { updateAppointmentStatus } from '@/app/actions/schedule';

export type AppointmentStatus =
  | 'Scheduled'
  | 'Arrived'
  | 'In Progress'
  | 'Finished'
  | 'Pending Signature';

export interface Appointment {
  id: string;
  time: string;
  patientName: string;
  initials: string;
  age: number;
  sex: string;
  chiefComplaint: string;
  status: AppointmentStatus;
}

export type QueueFilter = 'All' | 'Arrived' | 'Scheduled' | 'To Sign' | 'Completed';

const ADMIN_ROLES = ['ADMIN', 'ORG_ADMIN', 'FRONT_DESK', 'RECEPTIONIST', 'STAFF'];

const ALL_STATUSES: AppointmentStatus[] = [
  'Scheduled', 'Arrived', 'In Progress', 'Pending Signature', 'Finished',
];

const STATUS_STYLE: Record<AppointmentStatus, { bg: string; text: string; dot: string }> = {
  Scheduled:           { bg: 'bg-slate-100 dark:bg-slate-700/40',    text: 'text-slate-600 dark:text-slate-300',   dot: 'bg-slate-400' },
  Arrived:             { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  'In Progress':       { bg: 'bg-blue-50 dark:bg-blue-500/10',      text: 'text-blue-700 dark:text-blue-300',     dot: 'bg-blue-500' },
  Finished:            { bg: 'bg-slate-50 dark:bg-slate-700/20',     text: 'text-slate-500 dark:text-slate-400',   dot: 'bg-slate-300 dark:bg-slate-600' },
  'Pending Signature': { bg: 'bg-amber-50 dark:bg-amber-500/10',    text: 'text-amber-700 dark:text-amber-300',   dot: 'bg-amber-500' },
};

const STATUS_TO_KEY: Record<AppointmentStatus, string> = {
  Scheduled: 'dashboard.myDay.scheduled',
  Arrived: 'dashboard.myDay.arrived',
  'In Progress': 'dashboard.myDay.inProgress',
  Finished: 'dashboard.myDay.finished',
  'Pending Signature': 'dashboard.myDay.pendingSignature',
};

const AVATAR_COLORS = [
  'bg-cyan-600', 'bg-violet-600', 'bg-rose-600',
  'bg-teal-600', 'bg-amber-600', 'bg-indigo-600',
];

function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const FILTER_TABS: QueueFilter[] = ['All', 'Arrived', 'Scheduled', 'To Sign', 'Completed'];

function matchesFilter(apt: Appointment, filter: QueueFilter): boolean {
  switch (filter) {
    case 'All':       return true;
    case 'Arrived':   return apt.status === 'Arrived';
    case 'Scheduled': return apt.status === 'Scheduled';
    case 'To Sign':   return apt.status === 'Pending Signature';
    case 'Completed': return apt.status === 'Finished';
  }
}

interface PatientQueueProps {
  appointments: Appointment[];
  userRole?: string;
}

export function PatientQueue({ appointments, userRole = 'CLINICIAN' }: PatientQueueProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<QueueFilter>('All');
  const [isPending, startTransition] = useTransition();
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const normalizedRole = userRole.toUpperCase();
  const isAdminView = ADMIN_ROLES.includes(normalizedRole);

  const [optimisticAppointments, applyOptimistic] = useOptimistic(
    appointments,
    (state: Appointment[], payload: { id: string; status: AppointmentStatus }) =>
      state.map((apt) =>
        apt.id === payload.id ? { ...apt, status: payload.status } : apt
      )
  );

  useEffect(() => {
    if (!isAdminView) {
      try { router.prefetch('/dashboard/clinical-command'); } catch { /* no-op */ }
    }
  }, [router, isAdminView]);

  useEffect(() => {
    if (!openDropdownId) return;
    const close = () => setOpenDropdownId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [openDropdownId]);

  const filtered = useMemo(
    () => optimisticAppointments.filter((apt) => matchesFilter(apt, activeFilter)),
    [optimisticAppointments, activeFilter],
  );

  const countsByFilter = useMemo(
    () =>
      FILTER_TABS.reduce<Record<QueueFilter, number>>((acc, tab) => {
        acc[tab] = optimisticAppointments.filter((a) => matchesFilter(a, tab)).length;
        return acc;
      }, { All: 0, Arrived: 0, Scheduled: 0, 'To Sign': 0, Completed: 0 }),
    [optimisticAppointments],
  );

  function handleStatusChange(appointmentId: string, newStatus: AppointmentStatus) {
    setOpenDropdownId(null);
    startTransition(async () => {
      applyOptimistic({ id: appointmentId, status: newStatus });
      await updateAppointmentStatus(appointmentId, newStatus);
    });
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 px-5 py-3 border-b border-slate-100 dark:border-slate-800">
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab;
          const count = countsByFilter[tab];
          return (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                transition-all duration-150
                ${isActive
                  ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }
              `}
            >
              {tab}
              <span className={`text-[10px] font-bold tabular-nums ${isActive ? 'text-white/70 dark:text-slate-900/60' : 'text-slate-400 dark:text-slate-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mb-4">
            <CalendarDays className="w-6 h-6 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
            {activeFilter === 'All' ? 'Your schedule is clear' : `No ${activeFilter.toLowerCase()} patients`}
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center max-w-xs">
            {activeFilter === 'All'
              ? "No appointments on today's calendar."
              : 'Try switching to another filter or check back later.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.map((apt) => {
            const style = STATUS_STYLE[apt.status];
            const isDropdownOpen = openDropdownId === apt.id;

            return (
              <div
                key={apt.id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
              >
                <span className="w-[72px] flex-shrink-0 text-[13px] font-mono font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                  {apt.time}
                </span>

                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${avatarColor(apt.id)}`}>
                  {apt.initials}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                      {apt.patientName}
                    </p>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 flex-shrink-0">
                      {apt.age}{apt.sex ? ` ${apt.sex}` : ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {apt.chiefComplaint}
                  </p>
                </div>

                {isAdminView ? (
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdownId(isDropdownOpen ? null : apt.id);
                      }}
                      disabled={isPending}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer border ${style.bg} ${style.text} border-current/20 hover:opacity-80 disabled:opacity-50`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                      {t(STATUS_TO_KEY[apt.status])}
                      <ChevronDown className="w-3 h-3" />
                    </button>

                    {isDropdownOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl py-1"
                      >
                        {ALL_STATUSES.filter((s) => s !== apt.status).map((targetStatus) => {
                          const targetStyle = STATUS_STYLE[targetStatus];
                          return (
                            <button
                              key={targetStatus}
                              onClick={() => handleStatusChange(apt.id, targetStatus)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                            >
                              <span className={`w-2 h-2 rounded-full ${targetStyle.dot}`} />
                              {t(STATUS_TO_KEY[targetStatus])}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0 ${style.bg} ${style.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                    {t(STATUS_TO_KEY[apt.status])}
                  </span>
                )}

                {!isAdminView && apt.status === 'Arrived' && (
                  <button
                    onClick={() => router.push(`/dashboard/clinical-command?patientId=${apt.id}`)}
                    className="
                      inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0
                      bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700
                      text-white shadow-sm shadow-emerald-600/20 transition-colors
                    "
                  >
                    <Play className="w-3 h-3" />
                    Begin Visit
                  </button>
                )}

                {!isAdminView && apt.status !== 'Arrived' && (
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
