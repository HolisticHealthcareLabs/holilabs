'use client';

// Force dynamic rendering for dashboard (requires authentication)


import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import NotificationPrompt from '@/components/NotificationPrompt';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import LanguageSelector from '@/components/LanguageSelector';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { SessionTimeoutWarning } from '@/components/SessionTimeoutWarning';
import { LoadingScreen } from '@/components/LoadingScreen';
import ThemeToggle from '@/components/ThemeToggle';
import { useToolUsageTracker } from '@/hooks/useToolUsageTracker';
import { DemoGuidedTour } from '@/components/demo/DemoGuidedTour';
import { ChevronRight } from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: string;
  badge?: number;
  gradient?: string;
  hoverGradient?: string;
  shadowColor?: string;
  subItems?: NavItem[];
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState<any>(null);
  const [fatalError, setFatalError] = useState<{ message: string; stack?: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarPeekOpen, setSidebarPeekOpen] = useState(false);
  const sidebarPeekCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false); // Disabled by default
  const [isInitialLoad, setIsInitialLoad] = useState(false);
  const { locale, t } = useLanguage();
  const { usageStats, bumpUsage, getMostUsed } = useToolUsageTracker();
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  const [hoveredRect, setHoveredRect] = useState<{ top: number; height: number } | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Session timeout (15 min idle for HIPAA compliance)
  const { showWarning, timeRemaining, extendSession, logout } = useSessionTimeout({
    timeoutMs: 15 * 60 * 1000, // 15 minutes
    warningMs: 2 * 60 * 1000,  // 2 minute warning
    redirectTo: '/sign-in',
  });

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
    // Check if this is the initial load (after sign in)
    const hasSeenLoading = sessionStorage.getItem('hasSeenLoadingScreen');
    if (hasSeenLoading) {
      setShowLoadingScreen(false);
      setIsInitialLoad(false);
    }
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

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'authenticated') {
      setUser(session.user);
      return;
    }

    // Unauthenticated: send to login, preserving where they were going.
    const callbackUrl = pathname || '/dashboard';
    router.push(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }, [status, session, router, pathname]);

  const handleLoadingComplete = () => {
    setShowLoadingScreen(false);
    sessionStorage.setItem('hasSeenLoadingScreen', 'true');
  };

  // Streamlined Navigation - Minimal & Clean (Phantom-style)
  const navItems: NavItem[] = [
    {
      name: 'Command Center',
      href: '/dashboard/command-center',
      icon: '/icons/chart-cured-increasing.svg',
    },
    {
      name: 'Clinical Co-Pilot',
      href: '/dashboard/clinical-command',
      icon: '/icons/stethoscope.svg',
    },
  ];

  const handleSignOut = async () => {
    // Clear NextAuth session and return to login
    await signOut({ redirect: true, callbackUrl: '/sign-in' });
  };

  return (
    <>
      {fatalError && (
        <div className="fixed inset-0 z-[10000] bg-white text-gray-900 p-6 overflow-auto">
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Dashboard crashed</h2>
                <p className="text-sm text-gray-600">
                  This is a failsafe overlay so we can see the real error.
                </p>
              </div>
              <button
                className="px-4 py-2 rounded-lg bg-gray-900 text-white"
                onClick={() => window.location.reload()}
              >
                Reload
              </button>
            </div>
            <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-auto whitespace-pre-wrap">
              {fatalError.message}
              {fatalError.stack ? `\n\n${fatalError.stack}` : ''}
            </pre>
          </div>
        </div>
      )}

      {/* Loading Screen - shown only on initial load after sign in */}
      {showLoadingScreen && isInitialLoad && (
        <LoadingScreen onComplete={handleLoadingComplete} />
      )}

      <div className="min-h-[100dvh] bg-gray-50 dark:bg-gray-900">
        {/* Mobile Sidebar Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 ${sidebarCollapsed ? 'w-20' : 'w-64'} bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center justify-between h-14 px-4 border-b border-gray-100 dark:border-gray-700/50">
              <Link href="/dashboard" className="flex items-center gap-2">
                <Image
                  src="/logos/Logo 1_Light.svg"
                  alt="Holi Labs"
                  width={28}
                  height={28}
                  style={{ width: 'auto', height: 'auto' }}
                />
                {!sidebarCollapsed && (
                  <span className="text-[15px] font-semibold tracking-[-0.02em] text-gray-900 dark:text-gray-100">
                    Holi Labs
                  </span>
                )}
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                aria-label="Close navigation menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <button
                onClick={() => setSidebarCollapsed((v) => !v)}
                className="hidden lg:inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${sidebarCollapsed ? '' : 'rotate-180'}`} />
              </button>
            </div>

            {/* Navigation - Minimal (Phantom-style) */}
            <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const currentPath = pathname || '';
                const isActive = currentPath === item.href || (item.href !== '/dashboard' && currentPath.startsWith(item.href));

                const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
                  if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredTool(item.name);
                  setHoveredRect({ top: rect.top, height: rect.height });
                };

                const handleMouseLeave = () => {
                  hoverTimeoutRef.current = setTimeout(() => {
                    setHoveredTool(null);
                    setHoveredRect(null);
                  }, 200);
                };

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      setSidebarOpen(false);
                      setSidebarPeekOpen(false);
                      bumpUsage(item.name);
                    }}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-150
                      ${isActive
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                      }`}
                  >
                    <div className={`w-5 h-5 shrink-0 transition-opacity duration-150 ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>
                      <Image
                        src={item.icon}
                        alt=""
                        width={20}
                        height={20}
                        className="dark:invert"
                        style={{ width: 'auto', height: 'auto' }}
                      />
                    </div>
                    {!sidebarCollapsed && (
                      <span className={`text-[13px] truncate ${isActive ? 'font-semibold' : 'font-medium'}`}>
                        {item.name}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Collapsed sidebar tooltip */}
            {hoveredTool && hoveredRect && sidebarCollapsed && (
              <div
                className="fixed left-20 z-[60] pointer-events-none"
                style={{ top: hoveredRect.top + (hoveredRect.height / 2) }}
              >
                <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg -translate-y-1/2 ml-1.5 whitespace-nowrap shadow-lg">
                  {hoveredTool}
                </div>
              </div>
            )}

            {/* Slide-up animation for profile menu */}
            <style jsx>{`
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(8px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .animate-slideUp { animation: slideUp 0.15s ease-out; }
          `}</style>

            {/* User Profile with Dropdown Menu */}
            <div className={`relative border-t border-gray-200 dark:border-gray-700 ${sidebarCollapsed ? 'p-3' : 'p-4'}`}>
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
                    className={`absolute bottom-full mb-2 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 animate-slideUp ${sidebarCollapsed
                      ? 'left-full ml-3 w-80'
                      : 'left-4 right-4'
                      }`}
                  >
                    {/* Settings Options */}
                    <div className="px-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                      <p className="px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Settings
                      </p>

                      <Link
                        href="/dashboard/settings"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                      >
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                          <span className="text-lg">👤</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">Profile</p>
                          <p className="text-xs text-gray-600 dark:text-gray-300">Personal information</p>
                        </div>
                      </Link>

                      <Link
                        href="/dashboard/settings?tab=security"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                      >
                        <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                          <span className="text-lg">🔐</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">Password & Security</p>
                          <p className="text-xs text-gray-600 dark:text-gray-300">Change password, 2FA</p>
                        </div>
                      </Link>

                      <Link
                        href="/dashboard/settings?tab=preferences"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                      >
                        <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                          <span className="text-lg">⚙️</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">Preferences</p>
                          <p className="text-xs text-gray-600 dark:text-gray-300">Language, theme, notifications</p>
                        </div>
                      </Link>

                      <Link
                        href="/dashboard/settings?tab=privacy"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                      >
                        <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                          <span className="text-lg">🔒</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">Privacy & Data</p>
                          <p className="text-xs text-gray-600 dark:text-gray-300">Data sharing, HIPAA compliance</p>
                        </div>
                      </Link>

                      <Link
                        href="/dashboard/settings?tab=billing"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                      >
                        <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                          <span className="text-lg">💳</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">Billing & Subscription</p>
                          <p className="text-xs text-gray-600 dark:text-gray-300">Plan, invoices, payment</p>
                        </div>
                      </Link>

                      <Link
                        href="/dashboard/settings?tab=integrations"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                      >
                        <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                          <span className="text-lg">🔗</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">Integrations</p>
                          <p className="text-xs text-gray-600 dark:text-gray-300">Connected apps, API keys</p>
                        </div>
                      </Link>
                    </div>

                    {/* Help Section */}
                    <div className="px-2 py-2 border-b border-gray-200 dark:border-gray-700">
                      <Link
                        href="/help"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <span className="text-lg">❓</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">Help & Support</span>
                      </Link>
                    </div>

                    {/* Sign Out */}
                    <div className="px-2 pt-2">
                      <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          handleSignOut();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-700 dark:text-red-400"
                      >
                        <span className="text-lg">🚪</span>
                        <span className="text-sm font-semibold">Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Profile Button */}
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors group`}
              >
                <div className="w-9 h-9 bg-gray-900 dark:bg-gray-600 rounded-full flex items-center justify-center text-white text-[13px] font-semibold shrink-0">
                  {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
                </div>
                {!sidebarCollapsed && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">
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
        <div className={(sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64') + ' min-h-[100dvh] flex flex-col bg-white dark:bg-gray-950'}>
          {/* Top Mobile Header */}
          <header className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 shadow-sm">
            <div className="flex items-center justify-between h-16 px-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                aria-label="Open navigation menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex items-center gap-2.5">
                <Image
                  src="/logos/Logo 1_Light.svg"
                  alt="Holi Labs"
                  width={32}
                  height={32}
                  style={{ width: 'auto', height: 'auto' }}
                />
                <span
                  className="text-lg tracking-tight text-gray-900 dark:text-[#E5E4E2]"
                  style={{
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Holi Labs
                </span>
              </div>
              <div className="flex items-center gap-2">
                <LanguageSelector currentLocale={locale} />
                <GlobalSearch />
                <NotificationCenter />
                <ThemeToggle />
              </div>
            </div>
          </header>

          {/* Desktop Header */}
          <header className="hidden lg:block bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-30">
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
                    {session.user.role === 'ADMIN' ? 'Administrator' :
                     session.user.role === 'PHYSICIAN' ? 'Clinician' :
                     session.user.role === 'NURSE' ? 'Nurse' :
                     session.user.role}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <LanguageSelector currentLocale={locale} />
                <GlobalSearch />
                <NotificationCenter />
                <ThemeToggle />
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 min-h-0">
            {children}
          </main>
        </div>

        {/* Notification Permission Prompt */}
        <NotificationPrompt />

        {/* Investor Demo Tour */}
        <DemoGuidedTour />

        {/* Session Timeout Warning Modal */}
        <SessionTimeoutWarning
          isOpen={showWarning}
          timeRemaining={timeRemaining}
          onExtend={extendSession}
          onLogout={logout}
        />
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
    <LanguageProvider>
      <DashboardContent>{children}</DashboardContent>
    </LanguageProvider>
  );
}
