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
import { ChevronRight, User, Clock, MessageSquare, Shield, Activity, Search, Plus, RefreshCw, XCircle, X, CheckCircle2 } from 'lucide-react';

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
    redirectTo: '/auth/login',
  });

  useEffect(() => {
    // Hard failsafe: surface client-side crashes even if the dev overlay doesn't show.
    const onError = (event: ErrorEvent) => {
      try {
        const err: any = (event as any)?.error;
        setFatalError({
          message: String(err?.message || event.message || 'Unknown client error'),
          stack: err?.stack,
        });
      } catch {
        setFatalError({ message: String(event?.message || 'Unknown client error') });
      }
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason: any = (event as any)?.reason;
      setFatalError({
        message: String(reason?.message || reason || 'Unhandled promise rejection'),
        stack: reason?.stack,
      });
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
    router.push(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }, [status, session, router, pathname]);

  const handleLoadingComplete = () => {
    setShowLoadingScreen(false);
    sessionStorage.setItem('hasSeenLoadingScreen', 'true');
  };

  // Streamlined Navigation - Minimal & Elegant
  // Keep the Command Center/Console icon mapping as requested for demo week.
  const navItems: NavItem[] = [
    {
      name: 'Command Center',
      href: '/dashboard/command-center',
      icon: '/icons/chart-cured-increasing.svg',
      gradient: 'from-slate-600 to-slate-800',
      hoverGradient: 'from-slate-700 to-slate-900',
      shadowColor: 'slate-500/40',
    },
    {
      name: 'Downloads',
      href: '/dashboard/downloads',
      icon: '/icons/download.svg',
      gradient: 'from-cyan-500 to-blue-600',
      hoverGradient: 'from-cyan-600 to-blue-700',
      shadowColor: 'cyan-500/40',
    },
    {
      name: 'Billing',
      href: '/dashboard/billing',
      icon: '/icons/credit-card.svg',
      gradient: 'from-emerald-500 to-teal-600',
      hoverGradient: 'from-emerald-600 to-teal-700',
      shadowColor: 'emerald-500/40',
    },
    {
      name: 'Console',
      href: '/dashboard/console',
      icon: '/icons/crisis-response_center_person.svg',
      gradient: 'from-indigo-500 to-purple-600',
      hoverGradient: 'from-indigo-600 to-purple-700',
      shadowColor: 'indigo-500/40',
    },
  ];

  const handleSignOut = async () => {
    // Clear NextAuth session and return to login
    await signOut({ redirect: true, callbackUrl: '/auth/login' });
  };

  const hasMultipleOptions = (item: NavItem) => (item.subItems?.length || 0) > 1;

  // HoverTooltip moved to main render logic for portal-like behavior

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
          className={`fixed inset-y-0 left-0 z-50 ${sidebarCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-gray-800 shadow-sm transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
              <Link href="/dashboard" className="flex items-center gap-2.5">
                <Image
                  src="/logos/Logo 1_Light.svg"
                  alt="Holi Labs"
                  width={32}
                  height={32}
                />
                {!sidebarCollapsed && (
                  <div className="flex items-center gap-2">
                    <span
                      className="text-lg tracking-tight text-gray-900 dark:text-[#E5E4E2]"
                      style={{
                        fontWeight: 600,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      Holi Labs
                    </span>
                    <span className="inline-flex items-center rounded-full border border-emerald-600/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-700 dark:text-emerald-300">
                      BETA
                    </span>
                  </div>
                )}
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <button
                onClick={() => setSidebarCollapsed((v) => !v)}
                className="hidden lg:inline-flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-all duration-300 shadow-lg hover:shadow-cyan-500/20"
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? (
                  <Activity className="w-5 h-5 text-cyan-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400 rotate-180" />
                )}
              </button>
            </div>

            {/* Navigation - Beautiful Circular Gradient Tiles */}
            <nav className="flex-1 px-3 py-4 space-y-3 overflow-y-auto">
              {/* All Navigation Items - Clinical Tools First, Then Main Nav */}
              {navItems.map((item) => {
                const currentPath = pathname || '';
                const isActive = currentPath === item.href || (item.href !== '/dashboard' && currentPath.startsWith(item.href));

                const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
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
                  <div
                    key={item.href}
                    className="group relative flex items-center transition-all duration-300"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    <Link
                      href={item.href}
                      onClick={() => {
                        setSidebarOpen(false);
                        setSidebarPeekOpen(false);
                        bumpUsage(item.name);
                      }}
                      className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-2xl transition-all duration-300
                      ${isActive ? 'bg-gray-100 dark:bg-gray-700/40' : 'hover:bg-gray-100/70 dark:hover:bg-gray-700/25'}`}
                    >
                      {/* Circular Gradient Tile */}
                      <div
                        className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 backdrop-blur-sm shrink-0
                        ${item.name === 'Dashboard' ? 'bg-gradient-to-br from-blue-400/70 to-indigo-500/70 hover:from-blue-500 hover:to-indigo-600 hover:shadow-2xl hover:shadow-blue-400/50' : ''}
                        ${item.name === 'Command Center' ? 'bg-gradient-to-br from-slate-500/70 to-slate-700/70 hover:from-slate-600 hover:to-slate-800 hover:shadow-2xl hover:shadow-slate-400/30' : ''}
                        ${item.name === 'Downloads' ? 'bg-gradient-to-br from-cyan-400/70 to-blue-500/70 hover:from-cyan-500 hover:to-blue-600 hover:shadow-2xl hover:shadow-cyan-400/40' : ''}
                        ${item.name === 'Billing' ? 'bg-gradient-to-br from-emerald-400/70 to-teal-500/70 hover:from-emerald-500 hover:to-teal-600 hover:shadow-2xl hover:shadow-emerald-400/40' : ''}
                        ${item.name === 'Console' ? 'bg-gradient-to-br from-indigo-400/70 to-purple-500/70 hover:from-indigo-500 hover:to-purple-600 hover:shadow-2xl hover:shadow-indigo-400/40' : ''}
                        ${item.name === 'Patients' ? 'bg-gradient-to-br from-violet-400/70 to-purple-500/70 hover:from-violet-500 hover:to-purple-600 hover:shadow-2xl hover:shadow-violet-400/50' : ''}
                        ${item.name === 'Agenda' ? 'bg-gradient-to-br from-green-400/70 to-emerald-500/70 hover:from-green-500 hover:to-emerald-600 hover:shadow-2xl hover:shadow-green-400/50' : ''}
                        ${item.name === 'Co-Pilot' ? 'bg-gradient-to-br from-sky-400/70 to-cyan-500/70 hover:from-sky-500 hover:to-cyan-600 hover:shadow-2xl hover:shadow-sky-400/50' : ''}
                        ${item.name === 'Clinical Support' ? 'bg-gradient-to-br from-fuchsia-400/70 to-pink-500/70 hover:from-fuchsia-500 hover:to-pink-600 hover:shadow-2xl hover:shadow-fuchsia-400/50' : ''}
                        ${item.name === 'Prevention' ? 'bg-gradient-to-br from-orange-400/70 to-amber-500/70 hover:from-orange-500 hover:to-amber-600 hover:shadow-2xl hover:shadow-orange-400/50' : ''}
                        ${item.name === 'Forms' ? 'bg-gradient-to-br from-indigo-400/70 to-blue-500/70 hover:from-indigo-500 hover:to-blue-600 hover:shadow-2xl hover:shadow-indigo-400/50' : ''}
                        ${item.name === 'Governance' ? 'bg-gradient-to-br from-slate-500/70 to-slate-700/70 hover:from-slate-600 hover:to-slate-800 hover:shadow-2xl hover:shadow-slate-400/30' : ''}
                        ${item.name === 'Analytics' ? 'bg-gradient-to-br from-teal-400/70 to-emerald-500/70 hover:from-teal-500 hover:to-emerald-600 hover:shadow-2xl hover:shadow-teal-400/50' : ''}
                        ${item.name === 'Settings' ? 'bg-gradient-to-br from-gray-300/70 to-gray-500/70 hover:from-gray-400 hover:to-gray-600 hover:shadow-2xl hover:shadow-gray-400/40' : ''}
                        ${isActive ? 'scale-105 ring-4 ring-white/50 shadow-2xl' : 'shadow-md'}
                        hover:scale-105 hover:ring-4 hover:ring-white/30`}
                      >
                        <div className="relative w-6 h-6 transition-transform duration-300 group-hover:scale-125">
                          <Image
                            src={item.icon}
                            alt={item.name}
                            width={24}
                            height={24}
                            className="dark:invert brightness-0 invert"
                          />
                        </div>
                      </div>

                      {!sidebarCollapsed && (
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.name}</div>
                        </div>
                      )}
                    </Link>
                  </div>
                );
              })}

            </nav>

            {/* Portal-like Hover Menu/Tooltip */}
            {hoveredTool && hoveredRect && sidebarCollapsed && (
              <div
                className="fixed left-20 z-[60]"
                style={{ top: hoveredRect.top + (hoveredRect.height / 2) }}
                onMouseEnter={() => {
                  if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                }}
                onMouseLeave={() => {
                  hoverTimeoutRef.current = setTimeout(() => {
                    setHoveredTool(null);
                    setHoveredRect(null);
                  }, 200);
                }}
              >
                <div className="bg-white dark:bg-gray-800 backdrop-blur-xl border border-gray-200/80 dark:border-gray-700/80 rounded-xl shadow-2xl pointer-events-auto -translate-y-1/2 ml-2 animate-in fade-in slide-in-from-left-2 duration-200">
                  {(() => {
                    const item = navItems.find(i => i.name === hoveredTool);
                    if (!item) return null;
                    const showSubtitlesOnly = hasMultipleOptions(item);

                    return (
                      <div className="p-2 min-w-[180px]">
                        {showSubtitlesOnly ? (
                          <div className="flex flex-col gap-1">
                            <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 border-b border-gray-100 dark:border-gray-700 pb-1">
                              {item.name}
                            </div>
                            {(item.subItems || []).map((sub) => (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                onClick={() => setSidebarOpen(false)}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              >
                                <span>{sub.name}</span>
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <div className="px-3 py-1.5 font-semibold text-sm text-gray-900 dark:text-white">{item.name}</div>
                        )}

                        {/* Arrow pointer */}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-1 w-2 h-2 bg-white dark:bg-gray-800 border-l border-b border-gray-200/80 dark:border-gray-700/80 transform rotate-45" />
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Enhanced animations */}
            <style jsx>{`
            @keyframes textReveal {
              0% {
                opacity: 0;
                transform: translateX(-20px);
                letter-spacing: 0.2em;
              }
              60% {
                letter-spacing: 0.05em;
              }
              100% {
                opacity: 1;
                transform: translateX(0);
                letter-spacing: 0.025em;
              }
            }

            @keyframes glowPulse {
              0%, 100% {
                box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
              }
              50% {
                box-shadow: 0 0 30px rgba(139, 92, 246, 0.7);
              }
            }

            @keyframes slideIn {
              0% {
                opacity: 0;
                transform: translateX(-20px) scale(0.8);
              }
              60% {
                transform: translateX(2px) scale(1.05);
              }
              100% {
                opacity: 1;
                transform: translateX(0) scale(1);
              }
            }
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
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all group`}
              >
                <div className="relative w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform overflow-hidden">
                  {/* subtle "profile photo" background pattern */}
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.9),transparent_55%)]" />
                  <svg className="w-7 h-7 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 20.25a7.5 7.5 0 0115 0" />
                  </svg>
                </div>
                {!sidebarCollapsed && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        Dr. {user?.email?.split('@')[0]}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{user?.email}</p>
                    </div>
                    {/* Decorative - low contrast intentional for dropdown chevron icon */}
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${profileMenuOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
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
        <div className={(sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64') + ' min-h-[100dvh] flex flex-col'}>
          {/* Top Mobile Header */}
          <header className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 shadow-sm">
            <div className="flex items-center justify-between h-16 px-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
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
            <div className="flex items-center justify-end h-16 px-6 gap-4">
              <LanguageSelector currentLocale={locale} />
              <GlobalSearch />
              <NotificationCenter />
              <ThemeToggle />
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 min-h-0">
            {children}
          </main>
        </div>

        {/* Notification Permission Prompt */}
        <NotificationPrompt />

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
