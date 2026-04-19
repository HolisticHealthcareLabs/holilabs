'use client';

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import {
  Calendar, Clock, Stethoscope,
  User, FileText, CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import { PatientQueue, type Appointment } from './_components/PatientQueue';
import { TaskWidget, type TaskItem } from './_components/TaskWidget';
import { MetricCard, type AccentName } from '@/components/ui/premium';

const WelcomeModal = lazy(() => import('@/components/onboarding/WelcomeModal'));
const SpecialtyWalkthrough = lazy(() => import('@/components/onboarding/SpecialtyWalkthrough'));
const SpotlightTrigger = lazy(() => import('@/components/onboarding/SpotlightTrigger'));
import {
  staggerContainer,
  staggerItem,
  slideDownHeader,
} from '@/components/dashboard/CinematicTransition';

// ---------------------------------------------------------------------------
// Time-aware greeting
// ---------------------------------------------------------------------------

function getGreetingKey(now: Date): string {
  const h = now.getHours();
  if (h < 12) return 'goodMorning';
  if (h < 18) return 'goodAfternoon';
  return 'goodEvening';
}

const LOCALE_BCP47: Record<string, string> = {
  en: 'en-US',
  pt: 'pt-BR',
  es: 'es-MX',
};

function formatToday(now: Date, locale: string): string {
  const bcp47 = LOCALE_BCP47[locale] ?? locale;
  return now.toLocaleDateString(bcp47, {
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
// Persona schedule → Appointment adapter
// ---------------------------------------------------------------------------

interface PersonaScheduleItem {
  firstName: string;
  lastName: string;
  age: number;
  sex: 'M' | 'F';
  chiefComplaint: string;
  status: string;
  time: string;
}

const STATUS_MAP: Record<string, Appointment['status']> = {
  'in-progress':  'In Progress',
  'arrived':      'Arrived',
  'completed':    'Finished',
  'scheduled':    'Scheduled',
};

function adaptPersonaSchedule(items: PersonaScheduleItem[]): Appointment[] {
  return items.map((item, i) => {
    const initials = `${item.firstName[0]}${item.lastName[0]}`.toUpperCase();
    const rawStatus = item.status.toLowerCase();

    // The second patient in the demo has a "pending signature" to show that task
    const status: Appointment['status'] =
      i === 1 ? 'Pending Signature' : (STATUS_MAP[rawStatus] ?? 'Scheduled');

    return {
      id:             `demo-apt-${i}`,
      time:           item.time,
      patientName:    `${item.firstName} ${item.lastName}`,
      initials,
      age:            item.age,
      sex:            item.sex,
      chiefComplaint: item.chiefComplaint,
      status,
    };
  });
}

// ---------------------------------------------------------------------------
// Default mock data (shown for non-ephemeral / non-demo sessions)
// ---------------------------------------------------------------------------

// Chief complaints use i18n keys — resolved at render time via t()
const DEFAULT_APPOINTMENT_DEFS = [
  { id: 'P002',    time: '08:00 AM', patientName: 'Maria Santos',           initials: 'MS', age: 53, sex: 'F', complaintKey: 'cc1', status: 'Finished' as const },
  { id: 'P003',    time: '08:30 AM', patientName: "James O'Brien",          initials: 'JO', age: 80, sex: 'M', complaintKey: 'cc2', status: 'Pending Signature' as const },
  { id: 'P004',    time: '09:00 AM', patientName: 'Sofia Reyes',            initials: 'SR', age: 41, sex: 'F', complaintKey: 'cc3', status: 'In Progress' as const },
  { id: 'P001',    time: '09:30 AM', patientName: 'Robert Chen',            initials: 'RC', age: 67, sex: 'M', complaintKey: 'cc4', status: 'Arrived' as const },
  { id: 'apt-005', time: '10:00 AM', patientName: 'Juliana Costa Lima',     initials: 'JL', age: 38, sex: 'F', complaintKey: 'cc5', status: 'Scheduled' as const },
  { id: 'apt-006', time: '10:30 AM', patientName: 'Fernando Augusto Vieira', initials: 'FV', age: 63, sex: 'M', complaintKey: 'cc6', status: 'Scheduled' as const },
];

// Task definitions — labels are i18n keys resolved at render time
const DEFAULT_TASK_DEFS = [
  { id: 'task-001', labelKey: 'unsignedSoapNotes', count: 2, icon: 'signature' as const, urgency: 'high' as const, href: '/dashboard/clinical-command' },
  { id: 'task-002', labelKey: 'pendingPriorAuth',  count: 1, icon: 'auth' as const,      urgency: 'medium' as const, href: '/dashboard/billing' },
  { id: 'task-003', labelKey: 'labResultsToReview', count: 3, icon: 'lab' as const,       urgency: 'medium' as const, href: '/dashboard/patients' },
];

// ---------------------------------------------------------------------------
// Summary stats
// ---------------------------------------------------------------------------

interface KpiCard {
  label: string;
  value: number;
  Icon: LucideIcon;
  accent: AccentName;
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
      label: 'patientsToday',
      value: stats.total,
      Icon: User,
      accent: 'sky',
    },
    {
      label: 'remaining',
      value: stats.remaining,
      Icon: Calendar,
      accent: 'slate',
    },
    {
      label: 'waitingRoom',
      value: stats.arrivedCount,
      Icon: CheckCircle2,
      accent: 'emerald',
    },
    {
      label: 'unsignedCharts',
      value: stats.unsignedCount,
      Icon: FileText,
      accent: 'amber',
    },
  ], [stats]);
}

// ---------------------------------------------------------------------------
// Persona data shape (mirrors what /api/demo/provision stores in metadata)
// ---------------------------------------------------------------------------

interface WorkspacePersona {
  disciplineSlug: string;
  doctorTitle:    string;
  doctorFirst:    string;
  doctorLast:     string;
  specialty:      string;
  schedule:       PersonaScheduleItem[];
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MyDayPage() {
  const { data: session } = useSession();
  const [now, setNow] = useState<Date | null>(null);
  const [isClockReady, setIsClockReady] = useState(false);
  const [personaSchedule, setPersonaSchedule] = useState<Appointment[] | null>(null);
  const [personaSpecialty, setPersonaSpecialty] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [workspaceVoiceId, setWorkspaceVoiceId] = useState<string | undefined>();

  // Live clock
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    setIsClockReady(true);
    const interval = window.setInterval(tick, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  // If the session belongs to an ephemeral (demo) workspace, fetch persona data
  const organizationId = (session?.user as { organizationId?: string } | undefined)?.organizationId;

  useEffect(() => {
    if (!organizationId) return;

    let cancelled = false;

    async function loadPersona() {
      try {
        const res = await fetch(`/api/workspace/current`);
        if (!res.ok || cancelled) return;
        const data = await res.json();

        const isEphemeral = data?.isEphemeral ?? false;
        const persona: WorkspacePersona | undefined = data?.metadata?.persona;

        if (isEphemeral && persona?.schedule?.length) {
          if (!cancelled) {
            setPersonaSchedule(adaptPersonaSchedule(persona.schedule));
            setPersonaSpecialty(persona.specialty ?? null);
            const voice = (data?.metadata?.persona as Record<string, unknown> | undefined)?.voice as
              | { copilotVoiceId?: string }
              | undefined;
            if (voice?.copilotVoiceId) setWorkspaceVoiceId(voice.copilotVoiceId);
          }
        }

        if (isEphemeral && !localStorage.getItem('holi_welcome_seen')) {
          if (!cancelled) setShowWelcome(true);
        }
      } catch {
        // Silently fall back to default mock data
      }
    }

    loadPersona();
    return () => { cancelled = true; };
  }, [organizationId]);

  const t = useTranslations('dashboard.myDay');
  const locale = useLocale();

  const defaultAppointments: Appointment[] = useMemo(() =>
    DEFAULT_APPOINTMENT_DEFS.map((d) => ({
      id: d.id, time: d.time, patientName: d.patientName, initials: d.initials,
      age: d.age, sex: d.sex, chiefComplaint: t(d.complaintKey), status: d.status,
    })),
  [t]);

  const appointments = personaSchedule ?? defaultAppointments;

  const tasks: TaskItem[] = DEFAULT_TASK_DEFS.map((def, i) => ({
    ...def,
    label: t(def.labelKey),
    count: i === 0 ? 1 : def.count,
  }));
  const userRole = String((session?.user as { role?: string } | undefined)?.role ?? 'CLINICIAN');
  const doctorLastName = getDoctorLastName(session?.user?.name);
  const greeting = isClockReady && now ? t(getGreetingKey(now)) : t('welcome');
  const todayLabel = isClockReady && now ? formatToday(now, locale) : t('loadingDate');
  const localTimeLabel = isClockReady && now ? formatLocalTime(now) : '--:--';
  const timeZoneLabel = isClockReady && now ? formatTimeZone(now) : 'Detecting timezone';
  const stats = useScheduleStats(appointments);
  const kpiCards = useKpiCards(appointments);

  const dismissWelcome = () => {
    localStorage.setItem('holi_welcome_seen', 'true');
    setShowWelcome(false);
  };

  const startTour = () => {
    localStorage.setItem('holi_welcome_seen', 'true');
    setShowWelcome(false);
    setTourActive(true);
  };

  return (
    <>
    {showWelcome && (
      <Suspense fallback={null}>
        <WelcomeModal
          doctorName={doctorLastName ?? session?.user?.name ?? ''}
          specialty={personaSpecialty ?? 'Clinical'}
          onStartTour={startTour}
          onDismiss={dismissWelcome}
        />
      </Suspense>
    )}
    {tourActive && (
      <Suspense fallback={null}>
        <SpecialtyWalkthrough
          active={tourActive}
          onComplete={() => setTourActive(false)}
          doctorName={doctorLastName ?? session?.user?.name ?? ''}
          specialty={personaSpecialty ?? 'Medicine'}
          voiceId={workspaceVoiceId}
          language={locale as 'en' | 'pt' | 'es'}
        />
      </Suspense>
    )}
    <motion.div
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Header: greeting + date */}
      <motion.div variants={slideDownHeader} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            <span className="whitespace-nowrap">{greeting}{doctorLastName ? ',' : ''}</span>{doctorLastName ? <>{' '}<span className="whitespace-nowrap">Dr.&nbsp;{doctorLastName}</span></> : ''}
          </h1>
          <p suppressHydrationWarning className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">{todayLabel}</span>
            {personaSpecialty && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-semibold uppercase tracking-wide border border-cyan-200/60 dark:border-cyan-500/20 whitespace-nowrap">
                {personaSpecialty} {t('demo')}
              </span>
            )}
          </p>
        </div>

        {/* Stat pills */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
          <Suspense fallback={null}>
            <SpotlightTrigger
              label={t('quickTour')}
              steps={[
                { target: '#my-day-schedule', title: t('todaySchedule'), content: t('tourScheduleContent') },
                { target: '#stat-cards', title: t('tourQuickStats'), content: t('tourQuickStatsContent') },
                { target: '#requires-attention', title: t('tourActionItems'), content: t('tourActionItemsContent') },
              ]}
            />
          </Suspense>
          <div suppressHydrationWarning className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
            <Clock className="w-3.5 h-3.5" />
            {localTimeLabel}
            <span className="text-cyan-500/80 dark:text-cyan-300/80 font-medium">
              {timeZoneLabel}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">
            <Stethoscope className="w-3.5 h-3.5" />
            {t('patientsSeen', { seen: stats.seen, total: stats.total })}
          </div>
          {stats.arrivedCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t('inLobby', { count: stats.arrivedCount })}
            </div>
          )}
          {stats.unsignedCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-xs font-semibold text-amber-700 dark:text-amber-300">
              {t('unsigned', { count: stats.unsignedCount })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Morning Huddle KPI cards */}
      <motion.div variants={staggerItem} id="stat-cards" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => (
          <MetricCard
            key={card.label}
            icon={card.Icon}
            label={t(card.label)}
            value={card.value}
            accent={card.accent}
            index={i}
          />
        ))}
      </motion.div>

      {/* Grid: Schedule + Tasks */}
      <motion.div variants={staggerItem} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient queue: 2/3 */}
        <motion.div id="my-day-schedule" variants={staggerItem} className="lg:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-none overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t('todaySchedule')}
            </h2>
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
              {t('appointments', { count: appointments.length })}
            </span>
          </div>
          <PatientQueue appointments={appointments} userRole={userRole} />
        </motion.div>

        {/* Tasks: 1/3 */}
        <motion.div id="requires-attention" variants={staggerItem} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-none overflow-hidden">
          <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t('requiresAttention')}
            </h2>
          </div>
          <TaskWidget tasks={tasks} userRole={userRole} />
        </motion.div>
      </motion.div>
    </motion.div>
    </>
  );
}
