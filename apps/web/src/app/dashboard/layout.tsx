'use client';

import { useEffect, useRef, useState, memo, lazy, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import ThemeToggle from '@/components/ThemeToggle';
import { useToolUsageTracker } from '@/hooks/useToolUsageTracker';
import { CinematicTransition } from '@/components/dashboard/CinematicTransition';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Plus,
  Loader2,
  CalendarDays,
  Sparkles,
  Users,
  Inbox,
  Activity,
  FileText,
  BarChart3,
  ShieldCheck,
  Settings2,
  User,
  Lock,
  SlidersHorizontal,
  CreditCard,
  Link2,
  HelpCircle,
  LogOut,
  type LucideIcon,
} from 'lucide-react';

const NotificationPrompt = lazy(() => import('@/components/NotificationPrompt'));
const NotificationCenter = lazy(() => import('@/components/notifications/NotificationCenter'));
const GlobalSearch = lazy(() => import('@/components/search/GlobalSearch').then(m => ({ default: m.GlobalSearch })));
const SessionTimeoutWarning = lazy(() => import('@/components/SessionTimeoutWarning').then(m => ({ default: m.SessionTimeoutWarning })));
const DemoGuidedTour = lazy(() => import('@/components/demo/DemoGuidedTour').then(m => ({ default: m.DemoGuidedTour })));

interface SidebarNavItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

interface SidebarNavGroup {
  heading: string;
  items: SidebarNavItem[];
}

const DASHBOARD_MODULE_PRELOADERS = [
  () => import('@/app/dashboard/my-day/page'),
  () => import('@/app/dashboard/clinical-command/page'),
  () => import('@/app/dashboard/patients/page'),
  () => import('@/app/dashboard/reminders/page'),
  () => import('@/app/dashboard/command-center/page'),
  () => import('@/app/dashboard/billing/page'),
  () => import('@/app/dashboard/analytics/page'),
  () => import('@/app/dashboard/auditor/page'),
  () => import('@/app/dashboard/settings/page'),
  () => import('@/app/dashboard/clinical-command/_components/CdssAlertsPane'),
  () => import('@/app/dashboard/clinical-command/_components/PatientContextBar'),
  () => import('@/app/dashboard/clinical-command/_components/SoapNotePane'),
  () => import('@/app/dashboard/clinical-command/_components/TranscriptPane'),
  () => import('@/app/dashboard/command-center/_TrendChart'),
  () => import('framer-motion'),
  () => import('react-joyride'),
];

function DashboardBrand({
  showWordmark = true,
  className = '',
  isEphemeral = false,
}: {
  showWordmark?: boolean;
  className?: string;
  isEphemeral?: boolean;
}) {
  if (isEphemeral) {
    return (
      <Link href="/dashboard/my-day" className={`flex min-w-0 items-center gap-2.5 ${className}`.trim()}>
        <img
          src="/demo/hospital-logo.png"
          alt="Hospital Demo"
          className="h-7 w-auto shrink-0 object-contain dark:brightness-0 dark:invert"
        />
        {showWordmark && (
          <span className="whitespace-nowrap text-sm font-semibold leading-none tracking-[-0.02em]">
            Hospital Demo
          </span>
        )}
      </Link>
    );
  }

  return (
    <Link href="/dashboard/my-day" className={`flex min-w-0 items-center gap-2 ${className}`.trim()}>
      <svg
        className="h-8 w-7 shrink-0"
        viewBox="20 100 555 670"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <line x1="244.03" y1="369.32" x2="350.47" y2="369.32" stroke="currentColor" strokeLinecap="round" strokeWidth="58" />
        <line x1="244.03" y1="453.65" x2="350.47" y2="453.65" stroke="currentColor" strokeLinecap="round" strokeWidth="58" />
        <path fill="currentColor" d="m545.36,412.45h.28c-.09-.09-.18-.19-.28-.29,0-.23.01-.46,0-.69-.26-20.4-12.91-39.54-22.09-52.6-10.57-15.03-23.66-36.05-24.12-56.82-.03-1.47-.02-1.18,0-2.65.12-21.37,11.74-41.35,23.85-56.95,9.78-12.59,22.88-33.63,22.63-55.23-.47-40.95-33.71-74.6-74.64-75.57-43.09-1.02-78.34,33.61-78.34,76.48h-.04s.03.03.04.04c.01,20.95,11.14,39.39,22.09,53.74,11.78,15.43,24.2,35.7,24.35,57.25,0,.78,0,1.56,0,2.34-.16,21.55-14.59,43.3-24.39,57.22-10.89,15.48-22.1,32.77-22.1,53.72s8.39,39.83,21.99,53.62c15.01,15.22,24.01,35.43,24.12,56.81,0,.38,0,.77,0,1.15-.04,21.55-12.4,42.24-24.14,57.31-8.95,11.5-22.03,32.85-21.97,53.83.12,41.15,33.4,75.17,74.54,76.14,43.03,1.02,78.23-33.56,78.23-76.36,0-21.19-13.73-42.38-22.56-54.2-12.69-16.97-23.47-35.3-23.55-56.49,0-.19,0-.37,0-.56,0-21.6,8.9-42.21,24.08-57.58,13.62-13.79,22.02-32.75,22.02-53.67Z" />
        <path fill="currentColor" d="m202.39,412.45h.28c-.09-.09-.18-.19-.28-.29,0-.23.01-.46,0-.69-.26-20.4-12.91-39.54-22.09-52.6-10.57-15.03-23.66-36.05-24.12-56.82-.03-1.47-.02-1.18,0-2.65.12-21.37,11.74-41.35,23.85-56.95,9.78-12.59,22.88-33.63,22.63-55.23-.47-40.95-33.71-74.6-74.64-75.57-43.09-1.02-78.34,33.61-78.34,76.48h-.04s.03.03.04.04c.01,20.95,11.14,39.39,22.09,53.74,11.78,15.43,24.2,35.7,24.35,57.25,0,.78,0,1.56,0,2.34-.16,21.55-14.59,43.3-24.39,57.22-10.89,15.48-22.1,32.77-22.1,53.72s8.39,39.83,21.99,53.62c15.01,15.22,24.01,35.43,24.12,56.81,0,.38,0,.77,0,1.15-.04,21.55-12.4,42.24-24.14,57.31-8.95,11.5-22.03,32.85-21.97,53.83.12,41.15,33.4,75.17,74.54,76.14,43.03,1.02,78.23-33.56,78.23-76.36,0-21.19-13.73-42.38-22.56-54.2-12.69-16.97-23.47-35.3-23.55-56.49,0-.19,0-.37,0-.56,0-21.6,8.9-42.21,24.08-57.58,13.62-13.79,22.02-32.75,22.02-53.67Z" />
      </svg>
      {showWordmark && (
        <span className="whitespace-nowrap text-sm font-semibold leading-none tracking-[-0.02em]">
          Holi Labs
        </span>
      )}
    </Link>
  );
}

function SessionTimeoutGuard() {
  const { showWarning, timeRemaining, extendSession, logout } = useSessionTimeout({
    timeoutMs: 15 * 60 * 1000,
    warningMs: 2 * 60 * 1000,
    redirectTo: '/auth/login',
  });

  if (!showWarning) return null;

  return (
    <Suspense fallback={null}>
      <SessionTimeoutWarning
        isOpen={showWarning}
        timeRemaining={timeRemaining}
        onExtend={extendSession}
        onLogout={logout}
      />
    </Suspense>
  );
}

const MemoizedMain = memo(function MemoizedMain({ children }: { children: React.ReactNode }) {
  return <main className="flex-1 min-h-0">{children}</main>;
});

function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState<any>(null);
  const [fatalError, setFatalError] = useState<{ message: string; stack?: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [sidebarPeekOpen, setSidebarPeekOpen] = useState(false);
  const sidebarPeekCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isLaunchingEncounter, setIsLaunchingEncounter] = useState(false);
  const [isEphemeral, setIsEphemeral] = useState(false);
  const { locale, t } = useLanguage();
  const { usageStats, bumpUsage, getMostUsed } = useToolUsageTracker();
  const hasWarmedDashboardModulesRef = useRef(false);

  // Session timeout is isolated into <SessionTimeoutGuard /> to avoid
  // countdown-driven re-renders from cascading into the entire layout.

  useEffect(() => {
    // Hard failsafe: surface client-side crashes even if the dev overlay doesn't show.
    // Patterns below are non-fatal and handled automatically by React / Next.js:
    //  - Hydration mismatches → React recovers and re-renders client-side
    //  - ChunkLoadError for ssr:false dynamic imports → expected BailoutToCSR behaviour
    //  - NEXT_REDIRECT → intentional navigation signal, not an app error
    const IGNORABLE = [
      'hydrat',          // "Hydration failed", "hydrating this Suspense"
      'ChunkLoadError',
      'Loading chunk',
      'NEXT_REDIRECT',
      'BailoutToCSR',
    ];
    const isIgnorable = (msg: string) =>
      IGNORABLE.some((p) => msg.toLowerCase().includes(p.toLowerCase()));

    const onError = (event: ErrorEvent) => {
      try {
        const err: any = (event as any)?.error;
        const message = String(err?.message || event.message || 'Unknown client error');
        if (isIgnorable(message)) return;
        setFatalError({ message, stack: err?.stack });
      } catch {
        setFatalError({ message: String(event?.message || 'Unknown client error') });
      }
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason: any = (event as any)?.reason;
      const message = String(reason?.message || reason || 'Unhandled promise rejection');
      if (isIgnorable(message)) return;
      setFatalError({ message, stack: reason?.stack });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  useEffect(() => {
    const syncViewportState = () => {
      setIsDesktopViewport(window.innerWidth >= 1024);
    };

    syncViewportState();
    window.addEventListener('resize', syncViewportState);
    return () => window.removeEventListener('resize', syncViewportState);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/workspace/current')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.isEphemeral) setIsEphemeral(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    // Make the menu discoverable on mobile the first time.
    // (The dashboard has a lot of sections; hiding nav by default is confusing.)
    try {
      const key = 'holilabs:sidebar:mobileHinted';
      const hinted = sessionStorage.getItem(key) === 'true';
      if (!hinted && typeof window !== 'undefined' && window.innerWidth < 1024) {
        setSidebarOpen(true);
        sessionStorage.setItem(key, 'true');
      }
    } catch {
      // ignore
    }
  }, []);

  const showCollapsedSidebar = sidebarCollapsed && isDesktopViewport;

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'authenticated') {
      setUser(session.user);
      return;
    }

    // Unauthenticated: send to login, preserving where they were going.
    const callbackUrl = pathname || '/dashboard';
    router.push(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }, [status, session, router, pathname]);

  useEffect(() => {
    // Reset quick-action loading state once route changes complete.
    setIsLaunchingEncounter(false);
  }, [pathname]);

  useEffect(() => {
    // Warm up key dashboard routes in the background so window switches feel instant.
    const hotRoutes = [
      '/dashboard/my-day',
      '/dashboard/clinical-command',
      '/dashboard/patients',
      '/dashboard/reminders',
      '/dashboard/command-center',
      '/dashboard/billing',
      '/dashboard/analytics',
      '/dashboard/auditor',
      '/dashboard/settings',
    ];

    let cancelled = false;

    const prefetchRoutes = () => {
      if (cancelled) return;
      hotRoutes.forEach((route) => {
        try {
          router.prefetch(route);
        } catch {
          // no-op
        }
      });
    };

    const idleApi = window as unknown as {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (idleApi.requestIdleCallback) {
      const idleId = idleApi.requestIdleCallback(prefetchRoutes);
      return () => {
        cancelled = true;
        if (idleApi.cancelIdleCallback) idleApi.cancelIdleCallback(idleId);
      };
    }

    const timeoutId = window.setTimeout(prefetchRoutes, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [router]);

  useEffect(() => {
    if (hasWarmedDashboardModulesRef.current) return;
    hasWarmedDashboardModulesRef.current = true;

    let cancelled = false;
    const timeoutIds: number[] = [];
    const idleApi = window as unknown as {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    const warmModules = () => {
      DASHBOARD_MODULE_PRELOADERS.forEach((loadModule, index) => {
        const timeoutId = window.setTimeout(() => {
          if (cancelled) return;
          void loadModule().catch(() => undefined);
        }, index * 120);
        timeoutIds.push(timeoutId);
      });
    };

    if (idleApi.requestIdleCallback) {
      const idleId = idleApi.requestIdleCallback(warmModules);
      return () => {
        cancelled = true;
        timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
        if (idleApi.cancelIdleCallback) idleApi.cancelIdleCallback(idleId);
      };
    }

    const timeoutId = window.setTimeout(warmModules, 200);
    timeoutIds.push(timeoutId);
    return () => {
      cancelled = true;
      timeoutIds.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;
    fetch('/api/workspace/current')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.isEphemeral) setIsEphemeral(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [status]);

  const sidebarGroups: SidebarNavGroup[] = [
    {
      heading: t('dashboard.sidebar.clinicalWorkspace'),
      items: [
        { key: 'my-day', label: t('dashboard.sidebar.myDay'), href: '/dashboard/my-day', icon: CalendarDays },
        { key: 'clinical-copilot', label: t('dashboard.sidebar.coPilot'), href: '/dashboard/clinical-command', icon: Sparkles },
        { key: 'patients', label: t('dashboard.sidebar.patients'), href: '/dashboard/patients', icon: Users },
        { key: 'inbox', label: t('dashboard.sidebar.inbox'), href: '/dashboard/reminders', icon: Inbox, badge: '3' },
      ],
    },
    {
      heading: t('dashboard.sidebar.revenueOps'),
      items: [
        { key: 'command-center', label: t('dashboard.sidebar.commandCenter'), href: '/dashboard/command-center', icon: Activity },
        { key: 'claims-intelligence', label: t('dashboard.sidebar.claimsIntelligence'), href: '/dashboard/billing', icon: FileText },
        { key: 'analytics', label: t('dashboard.sidebar.analytics'), href: '/dashboard/analytics', icon: BarChart3 },
      ],
    },
    {
      heading: t('dashboard.sidebar.administration'),
      items: [
        { key: 'audit-compliance', label: t('dashboard.sidebar.auditCompliance'), href: '/dashboard/auditor', icon: ShieldCheck },
        { key: 'settings-team', label: t('dashboard.sidebar.settingsTeam'), href: '/dashboard/settings', icon: Settings2 },
      ],
    },
  ];

  const activeNavKey = (() => {
    const currentPath = pathname || '';
    if (currentPath === '/dashboard' || currentPath.includes('/dashboard/my-day')) return 'my-day';
    if (currentPath.includes('/dashboard/clinical-command')) return 'clinical-copilot';
    if (currentPath.includes('/dashboard/command-center')) return 'command-center';
    if (currentPath.includes('/dashboard/billing')) return 'claims-intelligence';
    if (currentPath.includes('/dashboard/analytics')) return 'analytics';
    if (currentPath.includes('/dashboard/reminders')) return 'inbox';
    if (currentPath.includes('/dashboard/patients')) return 'patients';
    if (currentPath.includes('/dashboard/auditor') || currentPath.includes('/dashboard/admin/audit-logs')) return 'audit-compliance';
    if (currentPath.includes('/dashboard/settings')) return 'settings-team';
    return 'my-day';
  })();

  const handleSignOut = async () => {
    // Clear NextAuth session and return to login
    await signOut({ redirect: true, callbackUrl: '/auth/login' });
  };

  const handleStartEncounter = () => {
    if (isLaunchingEncounter) return;
    setIsLaunchingEncounter(true);
    try {
      router.prefetch('/dashboard/clinical-command');
    } catch {
      // no-op
    }
    router.push('/dashboard/clinical-command');
  };

  return (
    <>
      {fatalError && (
        <div className="fixed inset-0 z-[10000] bg-white text-gray-900 p-6 overflow-auto">
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">{t('dashboard.error.crashed')}</h2>
                <p className="text-sm text-gray-600">
                  {t('dashboard.error.failsafeOverlay')}
                </p>
              </div>
              <button
                className="px-4 py-2 rounded-lg bg-gray-900 text-white"
                onClick={() => window.location.reload()}
              >
                {t('dashboard.error.reload')}
              </button>
            </div>
            <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-auto whitespace-pre-wrap">
              {fatalError.message}
              {fatalError.stack ? `\n\n${fatalError.stack}` : ''}
            </pre>
          </div>
        </div>
      )}

      <div className="min-h-[100dvh] bg-gray-50 dark:bg-gray-900">
        {/* Mobile Sidebar Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-transparent z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 isolate overflow-hidden ${showCollapsedSidebar ? 'lg:w-[68px]' : 'w-[248px] sm:w-[272px] lg:w-[248px]'} bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          <div className="relative z-10 flex flex-col h-full">
            {/* Logo */}
            <div className="relative z-20 flex items-center justify-between h-13 px-3 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-900">
              {!showCollapsedSidebar ? (
                <DashboardBrand
                  showWordmark
                  className="text-gray-900 dark:text-white"
                  isEphemeral={isEphemeral}
                />
              ) : (
                <div className="w-8 h-8" aria-hidden="true" />
              )}
              <button
                onClick={() => {
                  if (isDesktopViewport) {
                    setSidebarCollapsed((v) => !v);
                  } else {
                    setSidebarOpen(false);
                  }
                }}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                title={showCollapsedSidebar ? t('dashboard.sidebar.expandSidebar') : t('dashboard.sidebar.collapseSidebar')}
                aria-label={showCollapsedSidebar ? t('dashboard.sidebar.expandSidebar') : t('dashboard.sidebar.closeSidebar')}
              >
                {showCollapsedSidebar ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Quick actions: floating + button + search */}
            <div className="px-2.5 py-2.5 border-b border-gray-100 dark:border-gray-700/50">
              <div className={`flex ${showCollapsedSidebar ? 'flex-col' : 'flex-row'} items-stretch gap-1.5`}>
                {/* Floating + (Start Visit) */}
                <div className={showCollapsedSidebar ? 'group/tip relative' : ''}>
                  <button
                    type="button"
                    onClick={handleStartEncounter}
                    aria-label={t('dashboard.sidebar.startVisit')}
                    className={`
                      inline-flex items-center justify-center
                      bg-gray-900 text-white dark:bg-white dark:text-gray-900
                      hover:bg-gray-800 dark:hover:bg-gray-200
                      transition-all duration-200 plus-rotate
                      ${showCollapsedSidebar
                        ? 'w-full h-9 rounded-lg'
                        : 'w-9 h-9 rounded-xl shrink-0'
                      }
                    `}
                  >
                    {isLaunchingEncounter ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </button>
                  {showCollapsedSidebar && (
                    <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[60] opacity-0 translate-x-1 group-hover/tip:opacity-100 group-hover/tip:translate-x-0 transition-all duration-150">
                      <div className="whitespace-nowrap rounded-lg bg-gray-900 dark:bg-gray-700 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg">
                        {isLaunchingEncounter ? t('dashboard.sidebar.openingCoPilot') : t('dashboard.sidebar.startVisit')}
                      </div>
                    </div>
                  )}
                </div>

                {/* Search */}
                <div className={showCollapsedSidebar ? 'group/tip relative' : 'flex-1 min-w-0'}>
                  <button
                    type="button"
                    className={`
                      flex items-center gap-2 bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-gray-700
                      transition-colors dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200
                      ${showCollapsedSidebar
                        ? 'w-full h-9 justify-center rounded-lg'
                        : 'w-full rounded-xl px-2.5 py-2'
                      }
                    `}
                    aria-label={t('dashboard.sidebar.searchPatients')}
                  >
                    <Search className="w-4 h-4 shrink-0" />
                    {!showCollapsedSidebar && <span className="text-[13px] flex-1 text-left truncate">{t('dashboard.sidebar.searchPatients')}</span>}
                  </button>
                  {showCollapsedSidebar && (
                    <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[60] opacity-0 translate-x-1 group-hover/tip:opacity-100 group-hover/tip:translate-x-0 transition-all duration-150">
                      <div className="whitespace-nowrap rounded-lg bg-gray-900 dark:bg-gray-700 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg">
                        {t('dashboard.sidebar.searchPatients')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-3">
              {sidebarGroups.map((group) => (
                <div key={group.heading} className="mb-4 last:mb-0">
                  {!sidebarCollapsed && (
                    <p className="px-2 mb-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-[0.16em] dark:text-gray-400">
                      {group.heading}
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeNavKey === item.key;

                      return (
                        <div key={item.key} className={showCollapsedSidebar ? 'group/tip relative' : ''}>
                          <Link
                            href={item.href}
                            prefetch
                            onClick={() => {
                              setSidebarOpen(false);
                              setSidebarPeekOpen(false);
                              bumpUsage(item.label);
                            }}
                            onMouseEnter={() => {
                              if (item.href.startsWith('/')) {
                                try { router.prefetch(item.href); } catch { /* no-op */ }
                              }
                            }}
                            className={`group flex items-center ${showCollapsedSidebar ? 'justify-center' : 'gap-2.5'} px-2.5 py-2 rounded-xl transition-colors duration-150 ${isActive
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold shadow-sm'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                              }`}
                          >
                            <Icon className={`w-4 h-4 shrink-0 icon-animate ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`} />
                            {!showCollapsedSidebar && (
                              <span className={`text-[12.5px] truncate flex-1 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                                {item.label}
                              </span>
                            )}
                            {!showCollapsedSidebar && item.badge && (
                              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none badge-bounce">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                          {showCollapsedSidebar && (
                            <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[60] opacity-0 translate-x-1 group-hover/tip:opacity-100 group-hover/tip:translate-x-0 transition-all duration-150">
                              <div className="whitespace-nowrap rounded-lg bg-gray-900 dark:bg-gray-700 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg">
                                {item.label}
                                {item.badge && (
                                  <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-[9px] font-bold leading-none">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {/* Tooltips are now CSS-only via group-hover/tip on each item */}

            {/* Slide-up animation for profile menu */}
            <style jsx>{`
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(8px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .animate-slideUp { animation: slideUp 0.15s ease-out; }
          `}</style>

            {/* User Profile with Dropdown Menu */}
            <div className={`relative mt-auto border-t border-gray-200 dark:border-gray-700 ${showCollapsedSidebar ? 'p-2' : 'p-3'}`}>
              {/* Profile Menu Dropdown - Expands Upward */}
              {profileMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  {/* Menu */}
                  <div
                    className={`absolute bottom-full mb-2 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 animate-slideUp ${showCollapsedSidebar
                      ? 'left-full ml-3 w-80'
                      : 'left-4 right-4'
                      }`}
                  >
                    {/* Navigation */}
                    <div className="px-1.5 py-1.5">
                      {[
                        { href: '/dashboard/settings',                label: t('dashboard.profile.profile'),      Icon: User },
                        { href: '/dashboard/settings?tab=security',   label: t('dashboard.profile.security'),     Icon: Lock },
                        { href: '/dashboard/settings?tab=preferences',label: t('dashboard.profile.preferences'),  Icon: SlidersHorizontal },
                        { href: '/dashboard/settings?tab=privacy',    label: t('dashboard.profile.privacyData'),  Icon: ShieldCheck },
                        { href: '/dashboard/settings?tab=billing',    label: t('dashboard.profile.billing'),      Icon: CreditCard },
                        { href: '/dashboard/settings?tab=integrations',label: t('dashboard.profile.integrations'),Icon: Link2 },
                      ].map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
                        >
                          <item.Icon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          <span className="text-[13px] font-medium text-gray-700 dark:text-gray-200">{item.label}</span>
                        </Link>
                      ))}
                    </div>

                    <div className="mx-3 border-t border-gray-200 dark:border-gray-700" />

                    {/* Help + Sign Out */}
                    <div className="px-1.5 py-1.5">
                      <Link
                        href="/help"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
                      >
                        <HelpCircle className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <span className="text-[13px] font-medium text-gray-700 dark:text-gray-200">{t('dashboard.profile.helpSupport')}</span>
                      </Link>

                      <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          handleSignOut();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-red-500 dark:text-red-400" />
                        <span className="text-[13px] font-medium text-red-600 dark:text-red-400">{t('dashboard.profile.signOut')}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Profile Button */}
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className={`w-full flex items-center ${showCollapsedSidebar ? 'justify-center' : 'gap-2.5'} p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors group`}
              >
                <div className="w-8 h-8 bg-gray-900 dark:bg-gray-600 rounded-full flex items-center justify-center text-white text-[12px] font-semibold shrink-0">
                  {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
                </div>
                {!showCollapsedSidebar && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-[12.5px] font-semibold text-gray-900 dark:text-white truncate">
                        {user?.name || user?.email?.split('@')[0] || 'User'}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                    </div>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${profileMenuOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className={(showCollapsedSidebar ? 'lg:pl-[68px]' : 'lg:pl-[248px]') + ' min-h-[100dvh] flex flex-col bg-white dark:bg-gray-950'}>
          {/* Top Mobile Header */}
          <header className="lg:hidden bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800/50 sticky top-0 z-30 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between h-16 px-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.10] rounded-lg transition-colors"
                aria-label={t('dashboard.sidebar.openNavigation')}
              >
                <PanelLeftOpen className="w-5 h-5" />
              </button>
              <div className="flex-1" aria-hidden="true" />
              <div className="flex items-center gap-2">
                <Suspense fallback={null}>
                  <GlobalSearch />
                </Suspense>
                <Suspense fallback={null}>
                  <NotificationCenter />
                </Suspense>
                <ThemeToggle />
              </div>
            </div>
          </header>

          {/* Desktop Header */}
          <header className="hidden lg:block bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800/50 shadow-sm dark:shadow-none sticky top-0 z-30">
            <div className="flex items-center justify-between h-14 px-6">
              {/* Role badge */}
              <div className="flex items-center gap-2">
                {session?.user?.role && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    session.user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                    session.user.role === 'PHYSICIAN' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      session.user.role === 'ADMIN' ? 'bg-purple-500' :
                      session.user.role === 'PHYSICIAN' ? 'bg-blue-500' :
                      'bg-gray-400'
                    }`} />
                    {session.user.role === 'ADMIN' ? t('dashboard.roles.administrator') :
                     session.user.role === 'PHYSICIAN' ? t('dashboard.roles.clinician') :
                     session.user.role === 'NURSE' ? t('dashboard.roles.nurse') :
                     session.user.role}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Suspense fallback={null}>
                  <GlobalSearch />
                </Suspense>
                <Suspense fallback={null}>
                  <NotificationCenter />
                </Suspense>
                <ThemeToggle />
              </div>
            </div>
          </header>

          {/* Page Content */}
          <MemoizedMain>{children}</MemoizedMain>
        </div>

        <Suspense fallback={null}>
          <NotificationPrompt />
        </Suspense>

        <Suspense fallback={null}>
          <DemoGuidedTour />
        </Suspense>

        <SessionTimeoutGuard />
      </div>
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CinematicTransition>
      <DashboardContent>{children}</DashboardContent>
    </CinematicTransition>
  );
}
