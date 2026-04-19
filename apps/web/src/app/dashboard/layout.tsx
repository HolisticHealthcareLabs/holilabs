'use client';

import { useEffect, useRef, useState, memo, lazy, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import ThemeToggle from '@/components/ThemeToggle';
const HoliLogo = () => (
  <div className="flex items-center gap-2">
    <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center text-white font-bold">H</div>
    <span className="font-bold text-xl tracking-tight">Holi</span>
  </div>
);
import { useToolUsageTracker } from '@/hooks/useToolUsageTracker';
// CinematicTransition removed — instant dashboard load
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  Loader2,
  X,
  Sun,
  Stethoscope,
  Users,
  User,
  Inbox,
  LayoutDashboard,
  FileText,
  BarChart3,
  Settings,
  Eye,
  CreditCard,
  HelpCircle,
  Activity,
  Lock,
  HeartPulse,
  Leaf,
  Sparkles,
  Share2,
  type LucideIcon,
} from 'lucide-react';
const Pill = Activity;
const Plug = Activity;
const UserPlus = Users;
const PanelLeft = LayoutDashboard;
const Zap = Activity;
const Shield = Lock;
const NotificationPrompt = lazy(() => import('@/components/NotificationPrompt'));
const NotificationCenter = lazy(() => import('@/components/notifications/NotificationCenter'));
const DemoModeBanner = lazy(() => import('@/components/demo/DemoModeBanner').then(m => ({ default: m.DemoModeBanner })));

const SessionTimeoutWarning = lazy(() => import('@/components/SessionTimeoutWarning').then(m => ({ default: m.SessionTimeoutWarning })));
const DemoGuidedTour = lazy(() => import('@/components/demo/DemoGuidedTour').then(m => ({ default: m.DemoGuidedTour })));
const LockScreen = lazy(() => import('@/components/LockScreen').then(m => ({ default: m.LockScreen })));

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

// Module preloader removed — was loading 16 modules (2.4MB) eagerly on idle,
// causing 2-4s of dev-mode CPU churn. Next.js <Link prefetch> handles this.


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
  const [user, setPlus] = useState<any>(null);
  const [fatalError, setFatalError] = useState<{ message: string; stack?: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [sidebarPeekOpen, setSidebarPeekOpen] = useState(false);
  const sidebarPeekCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isLaunchingEncounter, setIsLaunchingEncounter] = useState(false);
  const [isEphemeral, setIsEphemeral] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { locale, t } = useLanguage();
  const { usageStats, bumpUsage, getMostUsed } = useToolUsageTracker();
  // hasWarmedDashboardModulesRef removed — preloader eliminated

  useEffect(() => { setIsMounted(true); }, []);

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

  // ── Auto-lock: lock screen after 5 min of inactivity (disabled for demos) ─
  useEffect(() => {
    if (isLocked) return;
    // Demo sessions skip auto-lock — the lock screen is still manually available
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('demo_mode') === 'true') return;
    } catch { /* SSR / incognito */ }
    const LOCK_MS = 5 * 60 * 1000;
    const THROTTLE_MS = 30_000;
    let timer = setTimeout(() => setIsLocked(true), LOCK_MS);
    let lastReset = Date.now();
    const reset = () => {
      const now = Date.now();
      if (now - lastReset < THROTTLE_MS) return;
      lastReset = now;
      clearTimeout(timer);
      timer = setTimeout(() => setIsLocked(true), LOCK_MS);
    };
    const events: (keyof WindowEventMap)[] = ['mousedown', 'keydown', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [isLocked]);

  const showCollapsedSidebar = sidebarCollapsed && isDesktopViewport && !sidebarPeekOpen;
  const isSettingsPage = pathname?.includes('/dashboard/settings');

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'authenticated') {
      setPlus(session.user);
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

  // Route prefetch effect removed — <Link prefetch> on sidebar handles this natively

  // Module preloader effect removed — was loading 2.4MB of modules eagerly

  // Duplicate workspace fetch removed — already called at line 185

  const sidebarGroups: SidebarNavGroup[] = [
    {
      heading: t('dashboard.sidebar.clinicalWorkspace'),
      items: [
        { key: 'my-day', label: t('dashboard.sidebar.myDay'), href: '/dashboard/my-day', icon: Sun },
        { key: 'clinical-copilot', label: t('dashboard.sidebar.coPilot'), href: '/dashboard/co-pilot', icon: Stethoscope },
        { key: 'patients', label: t('dashboard.sidebar.patients'), href: '/dashboard/patients', icon: Users },
        { key: 'prescriptions', label: t('dashboard.sidebar.prescriptions'), href: '/dashboard/prescriptions', icon: Pill },
        { key: 'reminders', label: t('dashboard.sidebar.inbox'), href: '/dashboard/reminders', icon: Inbox, badge: '3' },
      ],
    },
    {
      heading: 'Perioperative',
      items: [
        { key: 'find-doctor',        label: 'Find care',            href: '/dashboard/find-doctor',        icon: Stethoscope },
        { key: 'preop-calculators',  label: 'Risk calculators',     href: '/dashboard/preop-calculators',  icon: HeartPulse },
        { key: 'preop-screening',    label: 'Supplement screen',    href: '/dashboard/preop-screening',    icon: Leaf },
        { key: 'cam-consult',        label: 'CAM consult',          href: '/dashboard/cam-consult',        icon: Sparkles },
        { key: 'clinical-referrals', label: 'Referrals',            href: '/dashboard/clinical-referrals', icon: Share2 },
      ],
    },
    {
      heading: t('dashboard.sidebar.revenueOps'),
      items: [
        { key: 'command-center', label: t('dashboard.sidebar.commandCenter'), href: '/dashboard/command-center', icon: LayoutDashboard },
        { key: 'claims-intelligence', label: t('dashboard.sidebar.claimsIntelligence'), href: '/dashboard/billing', icon: FileText },
        { key: 'analytics', label: t('dashboard.sidebar.analytics'), href: '/dashboard/analytics', icon: BarChart3 },
      ],
    },
    {
      heading: t('dashboard.sidebar.administration'),
      items: [
        { key: 'audit-compliance', label: t('dashboard.sidebar.auditCompliance'), href: '/dashboard/auditor', icon: Shield },
        { key: 'overrides', label: t('dashboard.sidebar.overrides'), href: '/dashboard/governance/overrides', icon: BarChart3 },
        { key: 'settings-team', label: t('dashboard.sidebar.settingsTeam'), href: '/dashboard/settings', icon: Settings },
      ],
    },
  ];

  const activeNavKey = (() => {
    const currentPath = pathname || '';
    if (currentPath === '/dashboard' || currentPath.includes('/dashboard/my-day')) return 'my-day';
    if (currentPath.includes('/dashboard/co-pilot') || currentPath.includes('/dashboard/clinical-command')) return 'clinical-copilot';
    if (currentPath.includes('/dashboard/command-center')) return 'command-center';
    if (currentPath.includes('/dashboard/billing')) return 'claims-intelligence';
    if (currentPath.includes('/dashboard/analytics')) return 'analytics';
    if (currentPath.includes('/dashboard/reminders')) return 'reminders';
    if (currentPath.includes('/dashboard/prescriptions')) return 'prescriptions';
    if (currentPath.includes('/dashboard/patients')) return 'patients';
    if (currentPath.includes('/dashboard/auditor') || currentPath.includes('/dashboard/admin/audit-logs')) return 'audit-compliance';
    if (currentPath.includes('/dashboard/settings')) return 'settings-team';
    if (currentPath.includes('/dashboard/find-doctor')) return 'find-doctor';
    if (currentPath.includes('/dashboard/preop-calculators')) return 'preop-calculators';
    if (currentPath.includes('/dashboard/preop-screening')) return 'preop-screening';
    if (currentPath.includes('/dashboard/cam-consult')) return 'cam-consult';
    if (currentPath.includes('/dashboard/clinical-referrals')) return 'clinical-referrals';
    return 'my-day';
  })();

  const handleSignOut = async () => {
    // Clear NextAuth session and return to login
    await signOut({ redirect: true, callbackUrl: '/auth/login' });
  };

  const handlePlustEncounter = () => {
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
      {isLocked && (
        <Suspense fallback={null}>
          <LockScreen onUnlock={() => setIsLocked(false)} userEmail={user?.email} />
        </Suspense>
      )}
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

      <div className="min-h-[100dvh] bg-white dark:bg-gray-950">
        {/* Mobile Sidebar Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-transparent z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          onMouseEnter={() => {
            if (sidebarCollapsed && isDesktopViewport) {
              if (sidebarPeekCloseTimerRef.current) { clearTimeout(sidebarPeekCloseTimerRef.current); sidebarPeekCloseTimerRef.current = null; }
              setSidebarPeekOpen(true);
            }
          }}
          onMouseLeave={() => {
            if (sidebarCollapsed && isDesktopViewport && sidebarPeekOpen) {
              sidebarPeekCloseTimerRef.current = setTimeout(() => setSidebarPeekOpen(false), 300);
            }
          }}
          className={`fixed inset-y-0 left-0 z-50 isolate overflow-visible ${
            sidebarCollapsed && isDesktopViewport
              ? sidebarPeekOpen
                ? 'w-[200px] shadow-2xl'
                : 'w-[52px]'
              : 'w-[200px] sm:w-[210px] lg:w-[200px]'
          } bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 transform transition-[width,transform,opacity] duration-200 ease-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          <div className="relative z-10 flex flex-col h-full">
            {/* Sidebar header — Holi Labs wordmark + controls */}
            <div className={`relative z-20 h-11 border-b border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-950 flex items-center ${showCollapsedSidebar ? 'justify-center' : 'justify-between'} px-2.5`}>
              {!showCollapsedSidebar && (
                <Link href="/dashboard/my-day" className="select-none">
                  <span className="text-[15px] font-semibold tracking-[-0.03em] text-gray-900 dark:text-white">Holi Labs</span>
                </Link>
              )}
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => {
                    if (isDesktopViewport) {
                      setSidebarCollapsed((v) => !v);
                    } else {
                      setSidebarOpen(false);
                    }
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-100/80 dark:bg-white/[0.06] hover:bg-gray-200/80 dark:hover:bg-white/[0.1] transition-all duration-200"
                  title={showCollapsedSidebar ? t('dashboard.sidebar.expandSidebar') : t('dashboard.sidebar.collapseSidebar')}
                >
                  <PanelLeft className="w-[16px] h-[16px]" strokeWidth={1.25} />
                </button>
                {!showCollapsedSidebar && (
                  <>
                    <button
                      onClick={() => router.back()}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      aria-label="Go back"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => router.forward()}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      aria-label="Go forward"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Search pill — icon when collapsed, expands to full bar */}
            <div className={`border-b border-gray-100 dark:border-gray-700/50 transition-all duration-200 ease-out ${showCollapsedSidebar ? 'px-0 py-1.5 flex justify-center' : 'px-2.5 py-1.5'}`}>
              {showCollapsedSidebar ? (
                <button
                  className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                  aria-label={t('dashboard.sidebar.searchPatients')}
                  onClick={() => { setSidebarCollapsed(false); }}
                >
                  <Search className="w-3.5 h-3.5" strokeWidth={1.25} />
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <div
                    className="flex-1 flex items-center rounded-full px-3 h-9 gap-2"
                    style={{
                      backgroundColor: 'var(--surface-primary)',
                      border: '1.5px solid var(--border-default)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                  >
                    <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder={t('dashboard.sidebar.searchPatients')}
                      className="flex-1 min-w-0 bg-transparent text-xs focus:outline-none"
                      style={{ color: 'var(--text-primary)', }}
                      aria-label={t('dashboard.sidebar.searchPatients')}
                    />
                    <button
                      className="w-6 h-6 min-w-[24px] min-h-[24px] max-w-[24px] max-h-[24px] flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-600 text-white shrink-0 transition-colors mr-0.5"
                      aria-label={t('dashboard.sidebar.addPatient')}
                      title={t('dashboard.sidebar.addPatient')}
                    >
                      <Plus className="w-3 h-3" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 min-h-0 overflow-y-auto px-1.5 py-2 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
              {sidebarGroups.map((group) => (
                <div key={group.heading} className="mb-2.5 last:mb-0">
                  {!showCollapsedSidebar && (
                    <p className="px-2 mb-1 text-[9px] font-semibold text-gray-500 uppercase tracking-[0.18em] dark:text-gray-400">
                      {group.heading}
                    </p>
                  )}
                  <div className="space-y-px">
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
                            className={`group flex items-center ${showCollapsedSidebar ? 'justify-center' : 'gap-2'} px-2 py-1.5 rounded-lg transition-all duration-200 ease-out ${isActive
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold shadow-sm'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                              }`}
                          >
                            <Icon className={`w-3.5 h-3.5 shrink-0 icon-animate transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`} strokeWidth={1.25} />
                            {!showCollapsedSidebar && (
                              <span className={`text-[11.5px] truncate flex-1 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                                {item.label}
                              </span>
                            )}
                            {!showCollapsedSidebar && item.badge && (
                              <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-semibold leading-none badge-bounce">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                          {showCollapsedSidebar && (
                            <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[60] opacity-0 translate-x-1 group-hover/tip:opacity-100 group-hover/tip:translate-x-0 transition-all duration-200 ease-out">
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

            {/* Apple Glass Footer */}
            <div className={`relative mt-auto ${showCollapsedSidebar ? 'p-2' : 'p-3'} flex flex-col ${showCollapsedSidebar ? 'items-center gap-2' : 'gap-3'}`}>

              {/* Profile Menu Dropdown — Glass Panel */}
              {profileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                  <div
                    className={`absolute bottom-full mb-2 z-50 glass-panel glass-panel-light dark:glass-panel-dark py-2 animate-slideUp ${showCollapsedSidebar
                      ? 'left-full ml-3 w-80'
                      : 'left-3 right-3'
                    }`}
                  >
                    <div className="px-1.5 py-1.5">
                      {[
                        { href: '/dashboard/settings',                 label: t('dashboard.profile.profile'),          Icon: User },
                        { href: '/dashboard/settings?tab=security',    label: t('dashboard.profile.security'),         Icon: Shield },
                        { href: '/dashboard/settings?tab=preferences', label: t('dashboard.profile.preferences'),      Icon: Settings },
                        { href: '/dashboard/settings?tab=privacy',     label: t('dashboard.profile.privacyData'),      Icon: Eye },
                        { href: '/dashboard/settings?tab=billing',     label: t('dashboard.profile.billing'),          Icon: CreditCard },
                        { href: '/dashboard/settings?tab=integrations',label: t('dashboard.profile.integrations'),     Icon: Plug },
                        { href: '/dashboard/settings?tab=team',        label: t('dashboard.profile.teamCredentials'),  Icon: Users },
                      ].map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                        >
                          <div className="w-6 h-6 rounded-full flex items-center justify-center border border-gray-300 dark:border-white/[0.15]">
                            <item.Icon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                          </div>
                          <span className="text-[13px] font-medium text-gray-700 dark:text-gray-200">{item.label}</span>
                        </Link>
                      ))}
                    </div>

                    <div className="mx-3 border-t border-gray-200/50 dark:border-white/[0.06]" />

                    <div className="px-1.5 py-1.5">
                      <Link
                        href="/help"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-[16px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full flex items-center justify-center border border-gray-300 dark:border-white/[0.15]">
                          <HelpCircle className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                        </div>
                        <span className="text-[13px] font-medium text-gray-700 dark:text-gray-200">{t('dashboard.profile.helpSupport')}</span>
                      </Link>

                      <button
                        onClick={() => { setProfileMenuOpen(false); handleSignOut(); }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-[16px] hover:bg-red-50/80 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full flex items-center justify-center border border-red-300 dark:border-red-500/30">
                          <X className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                        </div>
                        <span className="text-[13px] font-medium text-red-600 dark:text-red-400">{t('dashboard.profile.signOut')}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Quick utilities — three glass circles with hover tooltips */}
              <div className={`${showCollapsedSidebar ? 'flex flex-col items-center gap-2' : 'flex items-center gap-2'}`}>
                {/* Notifications */}
                <div className="group/notif relative">
                  {isMounted ? (
                    <Suspense fallback={null}>
                      <div className={`glass-circle glass-circle-light dark:glass-circle-dark glass-circle-inner flex items-center justify-center cursor-pointer ${showCollapsedSidebar ? 'w-11 h-11' : 'w-10 h-10'}`}>
                        <NotificationCenter />
                      </div>
                    </Suspense>
                  ) : (
                    <div className={`glass-circle glass-circle-light dark:glass-circle-dark glass-circle-inner flex items-center justify-center cursor-pointer ${showCollapsedSidebar ? 'w-11 h-11' : 'w-10 h-10'}`} />
                  )}
                  <div className={`pointer-events-none absolute z-[60] opacity-0 group-hover/notif:opacity-100 transition-all duration-200 ease-out ${
                    showCollapsedSidebar
                      ? 'left-full top-1/2 -translate-y-1/2 ml-3 translate-x-1 group-hover/notif:translate-x-0'
                      : 'bottom-full left-1/2 -translate-x-1/2 mb-2 translate-y-1 group-hover/notif:translate-y-0'
                  }`}>
                    <div className="whitespace-nowrap rounded-lg bg-gray-900 dark:bg-gray-700 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg">
                      {t('dashboard.sidebar.notifications')}
                    </div>
                  </div>
                </div>

                {/* Theme Toggle */}
                <div className="group/theme relative">
                  <div className={`glass-circle glass-circle-light dark:glass-circle-dark glass-circle-inner flex items-center justify-center ${showCollapsedSidebar ? 'w-11 h-11' : 'w-10 h-10'}`}>
                    <ThemeToggle />
                  </div>
                  <div className={`pointer-events-none absolute z-[60] opacity-0 group-hover/theme:opacity-100 transition-all duration-200 ease-out ${
                    showCollapsedSidebar
                      ? 'left-full top-1/2 -translate-y-1/2 ml-3 translate-x-1 group-hover/theme:translate-x-0'
                      : 'bottom-full left-1/2 -translate-x-1/2 mb-2 translate-y-1 group-hover/theme:translate-y-0'
                  }`}>
                    <div className="whitespace-nowrap rounded-lg bg-gray-900 dark:bg-gray-700 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg">
                      {t('dashboard.sidebar.appearance')}
                    </div>
                  </div>
                </div>

                {/* Invite Colleague */}
                <div className="group/invite relative">
                  <button
                    onClick={() => {/* future: open invite modal */}}
                    className={`glass-circle glass-circle-light dark:glass-circle-dark flex items-center justify-center ${showCollapsedSidebar ? 'w-11 h-11' : 'w-10 h-10'}`}
                  >
                    <UserPlus className="w-[18px] h-[18px] text-gray-600 dark:text-gray-300" strokeWidth={1.25} />
                  </button>
                  <div className={`pointer-events-none absolute z-[60] opacity-0 group-hover/invite:opacity-100 transition-all duration-200 ease-out ${
                    showCollapsedSidebar
                      ? 'left-full top-1/2 -translate-y-1/2 ml-3 translate-x-1 group-hover/invite:translate-x-0'
                      : 'bottom-full left-1/2 -translate-x-1/2 mb-2 translate-y-1 group-hover/invite:translate-y-0'
                  }`}>
                    <div className="whitespace-nowrap rounded-lg bg-gray-900 dark:bg-gray-700 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg">
                      {t('dashboard.sidebar.inviteColleague')}
                    </div>
                  </div>
                </div>

                {/* Lock Screen */}
                <div className="group/lock relative">
                  <button
                    onClick={() => setIsLocked(true)}
                    className={`glass-circle glass-circle-light dark:glass-circle-dark flex items-center justify-center ${showCollapsedSidebar ? 'w-11 h-11' : 'w-10 h-10'}`}
                  >
                    <Lock className="w-[18px] h-[18px] text-gray-600 dark:text-gray-300" strokeWidth={1.25} />
                  </button>
                  <div className={`pointer-events-none absolute z-[60] opacity-0 group-hover/lock:opacity-100 transition-all duration-200 ease-out ${
                    showCollapsedSidebar
                      ? 'left-full top-1/2 -translate-y-1/2 ml-3 translate-x-1 group-hover/lock:translate-x-0'
                      : 'bottom-full left-1/2 -translate-x-1/2 mb-2 translate-y-1 group-hover/lock:translate-y-0'
                  }`}>
                    <div className="whitespace-nowrap rounded-lg bg-gray-900 dark:bg-gray-700 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg">
                      {t('dashboard.sidebar.lockScreen')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile — glass pill */}
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className={`w-full flex items-center ${showCollapsedSidebar ? 'justify-center' : 'gap-3'} ${showCollapsedSidebar ? '' : 'py-3 px-4'} ${showCollapsedSidebar ? 'glass-circle glass-circle-light dark:glass-circle-dark w-11 h-11' : 'glass-pill glass-pill-light dark:glass-pill-dark'} group`}
              >
                <div className="w-8 h-8 bg-gray-900 dark:bg-gray-600 rounded-full flex items-center justify-center text-white text-[12px] font-semibold shrink-0 border border-white/20">
                  {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
                </div>
                {!showCollapsedSidebar && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-[12.5px] font-semibold text-gray-900 dark:text-white truncate">
                        {user?.name || user?.email?.split('@')[0] || 'User'}
                      </p>
                      {session?.user?.role && (
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mt-0.5">
                          {session.user.role}
                        </p>
                      )}
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
        <div className={((sidebarCollapsed && isDesktopViewport) ? 'lg:pl-[52px]' : 'lg:pl-[200px]') + ' min-h-[100dvh] flex flex-col bg-white dark:bg-gray-950 transition-[padding] duration-150 ease-out'}>
          {/* Demo mode banner — persistent, non-dismissable */}
          <Suspense fallback={null}><DemoModeBanner /></Suspense>

          {/* Top Mobile Header */}
          <header className={`lg:hidden bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800/50 sticky top-0 z-30 shadow-sm dark:shadow-none ${isSettingsPage ? 'hidden' : ''}`}>
            <div className="flex items-center justify-between h-16 px-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-100/80 dark:bg-white/[0.06] hover:bg-gray-200/80 dark:hover:bg-white/[0.1] transition-all duration-200"
                aria-label={t('dashboard.sidebar.openNavigation')}
              >
                <PanelLeft className="w-[18px] h-[18px]" strokeWidth={1.25} />
              </button>
              <div className="flex-1" aria-hidden="true" />
            </div>
          </header>


          {/* Page Content */}
          <MemoizedMain>{children}</MemoizedMain>
        </div>


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
    <DashboardContent>{children}</DashboardContent>
  );
}
