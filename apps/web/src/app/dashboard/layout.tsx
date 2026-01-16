'use client';

// Force dynamic rendering for dashboard (requires authentication)
export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import NotificationPrompt from '@/components/NotificationPrompt';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import LanguageSelector from '@/components/LanguageSelector';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { SessionTimeoutWarning } from '@/components/SessionTimeoutWarning';
import { LoadingScreen } from '@/components/LoadingScreen';
import ThemeToggle from '@/components/ThemeToggle';

interface NavItem {
  name: string;
  href: string;
  icon: string;
  emoji: string;
  badge?: number;
  gradient?: string;
  hoverGradient?: string;
  shadowColor?: string;
  subItems?: NavItem[];
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [sidebarPeekOpen, setSidebarPeekOpen] = useState(false);
  const sidebarPeekCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false); // Disabled by default
  const [isInitialLoad, setIsInitialLoad] = useState(false);
  const { locale, t } = useLanguage();

  // Session timeout (15 min idle for HIPAA compliance)
  const { showWarning, timeRemaining, extendSession, logout } = useSessionTimeout({
    timeoutMs: 15 * 60 * 1000, // 15 minutes
    warningMs: 2 * 60 * 1000,  // 2 minute warning
  });

  useEffect(() => {
    // Demo mode - no authentication required
    setUser({ email: 'demo@holilabs.com', name: 'Demo User' });

    // Check if this is the initial load (after sign in)
    const hasSeenLoading = sessionStorage.getItem('hasSeenLoadingScreen');
    if (hasSeenLoading) {
      setShowLoadingScreen(false);
      setIsInitialLoad(false);
    }
  }, [router]);

  const handleLoadingComplete = () => {
    setShowLoadingScreen(false);
    sessionStorage.setItem('hasSeenLoadingScreen', 'true');
  };

  // Streamlined Navigation - Minimal & Elegant
  const navItems: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: '/icons/chart-cured-increasing.svg',
      emoji: '📊',
      gradient: 'from-blue-500 to-indigo-600',
      hoverGradient: 'from-blue-600 to-indigo-700',
      shadowColor: 'blue-500/50'
    },
    {
      name: 'Patients',
      href: '/dashboard/patients',
      icon: '/icons/people (1).svg',
      emoji: '👥',
      gradient: 'from-violet-500 to-purple-600',
      hoverGradient: 'from-violet-600 to-purple-700',
      shadowColor: 'violet-500/50'
    },
    {
      name: 'Calendar',
      href: '/dashboard/appointments',
      icon: '/icons/calendar.svg',
      emoji: '📅',
      gradient: 'from-green-500 to-emerald-600',
      hoverGradient: 'from-green-600 to-emerald-700',
      shadowColor: 'green-500/50'
    },
    {
      name: 'Messages',
      href: '/dashboard/messages',
      icon: '/icons/communication.svg',
      emoji: '💬',
      gradient: 'from-sky-500 to-cyan-600',
      hoverGradient: 'from-sky-600 to-cyan-700',
      shadowColor: 'sky-500/50'
    },
    {
      name: 'Clinical Suite',
      href: '/dashboard/co-pilot',
      icon: '/icons/crisis-response_center_person.svg',
      emoji: '⚡',
      gradient: 'from-yellow-500 to-amber-600',
      hoverGradient: 'from-yellow-600 to-amber-700',
      shadowColor: 'yellow-500/50',
      subItems: [
        { name: 'Co-Pilot', href: '/dashboard/co-pilot', icon: '/icons/artificial-intelligence (1).svg', emoji: '⚡', gradient: 'from-yellow-500 to-amber-600' },
        { name: 'Scribe', href: '/dashboard/scribe', icon: '/icons/i-note_action (1).svg', emoji: '🎙️', gradient: 'from-purple-500 to-pink-600' },
        { name: 'Prevention', href: '/dashboard/prevention', icon: '/icons/health (1).svg', emoji: '🛡️', gradient: 'from-emerald-500 to-teal-600' },
        { name: 'Diagnosis', href: '/dashboard/diagnosis', icon: '/icons/stethoscope (1).svg', emoji: '🩺', gradient: 'from-cyan-500 to-blue-600' },
        { name: 'Prescriptions', href: '/dashboard/prescriptions', icon: '/icons/rx (1).svg', emoji: '💊', gradient: 'from-orange-500 to-red-600' },
        { name: 'Forms', href: '/dashboard/forms', icon: '/icons/clinical-f.svg', emoji: '📋', gradient: 'from-indigo-500 to-purple-600' },
        { name: 'Templates', href: '/dashboard/templates', icon: '/icons/clinical-f (1).svg', emoji: '📝', gradient: 'from-rose-500 to-red-600' },
        { name: 'Analytics', href: '/dashboard/analytics', icon: '/icons/diagnostics (1).svg', emoji: '📈', gradient: 'from-blue-500 to-cyan-600' },
        { name: 'Share Profile', href: '/dashboard/share-profile', icon: '/icons/telemedicine (1).svg', emoji: '🔗', gradient: 'from-teal-500 to-green-600' },
        { name: 'Credentials', href: '/dashboard/credentials', icon: '/icons/doctor (1).svg', emoji: '🏅', gradient: 'from-yellow-500 to-amber-600' },
      ]
    },
  ];

  const handleSignOut = async () => {
    router.push('/auth/login');
  };

  const openPeek = () => {
    if (!sidebarCollapsed) return;
    if (sidebarPeekCloseTimerRef.current) clearTimeout(sidebarPeekCloseTimerRef.current);
    setSidebarPeekOpen(true);
  };

  const closePeekSoon = () => {
    if (!sidebarCollapsed) return;
    if (sidebarPeekCloseTimerRef.current) clearTimeout(sidebarPeekCloseTimerRef.current);
    sidebarPeekCloseTimerRef.current = setTimeout(() => setSidebarPeekOpen(false), 150);
  };

  return (
    <>
      {/* Loading Screen - shown only on initial load after sign in */}
      {showLoadingScreen && isInitialLoad && (
        <LoadingScreen onComplete={handleLoadingComplete} />
      )}

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 ${sidebarCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-gray-800 shadow-sm transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        onMouseEnter={openPeek}
        onMouseLeave={closePeekSoon}
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
              <span
                className="text-lg tracking-tight text-gray-900 dark:text-[#E5E4E2]"
                style={{
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                }}
              >
                Holi Labs
              </span>
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
              className="hidden lg:inline-flex text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg className={`w-6 h-6 transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Navigation - Beautiful Circular Gradient Tiles */}
          <nav className="flex-1 px-3 py-4 space-y-3 overflow-y-auto">
            {/* Peek panel: when collapsed, hovering any circle reveals ALL options at once */}
            {sidebarCollapsed && sidebarPeekOpen && (
              <div
                className="absolute left-20 top-16 bottom-24 w-64 z-[70] pointer-events-auto"
                onMouseEnter={openPeek}
                onMouseLeave={closePeekSoon}
              >
                <div className="h-full overflow-y-auto rounded-2xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/80 dark:border-gray-700/80 shadow-2xl p-2">
                  <div className="px-3 py-2">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Navigation
                    </div>
                  </div>
                  <div className="space-y-1">
                    {navItems.map((ni) => (
                      <div key={`peek-${ni.href}`} className="rounded-xl">
                        <Link
                          href={ni.href}
                          onClick={() => {
                            setSidebarOpen(false);
                            setSidebarPeekOpen(false);
                          }}
                          className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {ni.name}
                          </span>
                          <span className="text-xs text-gray-600 dark:text-gray-300">
                            {ni.href.replace('/dashboard', '') || '/'}
                          </span>
                        </Link>
                        {ni.subItems && (
                          <div className="ml-3 pl-3 border-l border-gray-200 dark:border-gray-700 py-1 space-y-1">
                            {ni.subItems.map((si) => (
                              <Link
                                key={`peek-sub-${si.href}`}
                                href={si.href}
                                onClick={() => {
                                  setSidebarOpen(false);
                                  setSidebarPeekOpen(false);
                                }}
                                className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              >
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                  {si.name}
                                </span>
                                <span className="text-xs text-gray-600 dark:text-gray-300">
                                  {si.href.replace('/dashboard', '')}
                                </span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* All Navigation Items - Clinical Tools First, Then Main Nav */}
            {navItems.map((item) => {
              const currentPath = pathname || '';
              const isActive = currentPath === item.href || (item.href !== '/dashboard' && currentPath.startsWith(item.href));

              return item.subItems ? (
                // Parent with submenu - use div instead of Link to avoid nested links
                <div
                  key={item.href}
                  className="group relative flex items-center gap-0 hover:gap-3 transition-all duration-300"
                  onMouseEnter={openPeek}
                >
                  {/* Circular Gradient Tile */}
                  <Link
                    href={item.href}
                    onClick={() => {
                      setSidebarOpen(false);
                      setSidebarPeekOpen(false);
                    }}
                    className={`flex items-center justify-center w-14 h-14 rounded-full transition-all duration-300 backdrop-blur-sm
                      ${item.name === 'Dashboard' ? 'bg-gradient-to-br from-blue-400/70 to-indigo-500/70 hover:from-blue-500 hover:to-indigo-600 hover:shadow-2xl hover:shadow-blue-400/50' : ''}
                      ${item.name === 'Patients' ? 'bg-gradient-to-br from-violet-400/70 to-purple-500/70 hover:from-violet-500 hover:to-purple-600 hover:shadow-2xl hover:shadow-violet-400/50' : ''}
                      ${item.name === 'Calendar' ? 'bg-gradient-to-br from-green-400/70 to-emerald-500/70 hover:from-green-500 hover:to-emerald-600 hover:shadow-2xl hover:shadow-green-400/50' : ''}
                      ${item.name === 'Messages' ? 'bg-gradient-to-br from-sky-400/70 to-cyan-500/70 hover:from-sky-500 hover:to-cyan-600 hover:shadow-2xl hover:shadow-sky-400/50' : ''}
                      ${item.name === 'Clinical Suite' ? 'bg-gradient-to-br from-fuchsia-400/70 to-pink-500/70 hover:from-fuchsia-500 hover:to-pink-600 hover:shadow-2xl hover:shadow-fuchsia-400/50' : ''}
                      ${item.name === 'Clinical Toolkit' ? 'bg-gradient-to-br from-orange-400/70 to-amber-500/70 hover:from-orange-500 hover:to-amber-600 hover:shadow-2xl hover:shadow-orange-400/50' : ''}
                      ${!['Dashboard', 'Patients', 'Calendar', 'Messages', 'Clinical Suite', 'Clinical Toolkit'].includes(item.name) ? 'bg-gradient-to-br from-gray-300/70 to-gray-400/70' : ''}
                      ${isActive ? 'scale-110 ring-4 ring-white/60 shadow-2xl' : 'shadow-md'}
                      hover:scale-110 hover:ring-4 hover:ring-white/40`}
                  >
                    <div className="relative w-7 h-7 transition-transform duration-300 group-hover:scale-125">
                      <Image
                        src={item.icon}
                        alt={item.name}
                        width={28}
                        height={28}
                        className="dark:invert brightness-0 invert"
                      />
                    </div>
                  </Link>

                  {/* Floating Text Label or Submenu - Appears on Hover */}
                  <div className="absolute left-20 top-1/2 -translate-y-1/2 pointer-events-none z-50">
                    {item.subItems ? (
                      /* Toolkit Submenu */
                      <div className="opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-out bg-white dark:bg-gray-800 backdrop-blur-xl border border-gray-200/80 dark:border-gray-700/80 rounded-xl shadow-2xl overflow-hidden">
                        <div className="p-3 bg-gradient-to-r from-fuchsia-500/10 to-pink-500/10 border-b border-gray-200/50 dark:border-gray-700/50">
                          <p className="font-bold text-sm text-gray-900 dark:text-white">
                            {item.name}
                          </p>
                        </div>
                        <div className="p-2 space-y-1 max-h-96 overflow-y-auto pointer-events-auto">
                          {item.subItems.map((subItem) => (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group/sub"
                            >
                              <div className="relative w-5 h-5 flex-shrink-0">
                                <Image
                                  src={subItem.icon}
                                  alt={subItem.name}
                                  width={20}
                                  height={20}
                                  className="dark:invert"
                                />
                              </div>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover/sub:text-gray-900 dark:group-hover/sub:text-white whitespace-nowrap">
                                {subItem.name}
                              </span>
                            </Link>
                          ))}
                        </div>
                        {/* Arrow pointer */}
                        <div className="absolute right-full top-8 -mr-1">
                          <div className="w-2 h-2 bg-white dark:bg-gray-800 border-l border-t border-gray-200/80 dark:border-gray-700/80 transform rotate-[-45deg]" />
                        </div>
                      </div>
                    ) : (
                      /* Regular Label */
                      <div className="opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-out bg-white dark:bg-gray-800 backdrop-blur-xl border border-gray-200/80 dark:border-gray-700/80 px-4 py-2 rounded-xl shadow-2xl whitespace-nowrap">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">
                          {item.name}
                        </p>
                        {item.badge && (
                          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                            {item.badge}
                          </span>
                        )}
                        {/* Arrow pointer */}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-1">
                          <div className="w-2 h-2 bg-white dark:bg-gray-800 border-l border-t border-gray-200/80 dark:border-gray-700/80 transform rotate-[-45deg]" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Regular nav item - use Link
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className="group relative flex items-center gap-0 hover:gap-3 transition-all duration-300"
                >
                  {/* Circular Gradient Tile */}
                  <div
                    className={`flex items-center justify-center w-14 h-14 rounded-full transition-all duration-300 backdrop-blur-sm
                      ${item.name === 'Dashboard' ? 'bg-gradient-to-br from-blue-400/70 to-indigo-500/70 hover:from-blue-500 hover:to-indigo-600 hover:shadow-2xl hover:shadow-blue-400/50' : ''}
                      ${item.name === 'Patients' ? 'bg-gradient-to-br from-violet-400/70 to-purple-500/70 hover:from-violet-500 hover:to-purple-600 hover:shadow-2xl hover:shadow-violet-400/50' : ''}
                      ${item.name === 'Calendar' ? 'bg-gradient-to-br from-green-400/70 to-emerald-500/70 hover:from-green-500 hover:to-emerald-600 hover:shadow-2xl hover:shadow-green-400/50' : ''}
                      ${item.name === 'Messages' ? 'bg-gradient-to-br from-sky-400/70 to-cyan-500/70 hover:from-sky-500 hover:to-cyan-600 hover:shadow-2xl hover:shadow-sky-400/50' : ''}
                      ${!['Dashboard', 'Patients', 'Calendar', 'Messages'].includes(item.name) ? 'bg-gradient-to-br from-gray-300/70 to-gray-400/70' : ''}
                      ${isActive ? 'scale-110 ring-4 ring-white/60 shadow-2xl' : 'shadow-md'}
                      hover:scale-110 hover:ring-4 hover:ring-white/40`}
                  >
                    <div className="relative w-7 h-7 transition-transform duration-300 group-hover:scale-125">
                      <Image
                        src={item.icon}
                        alt={item.name}
                        width={28}
                        height={28}
                        className="dark:invert brightness-0 invert"
                      />
                    </div>
                  </div>

                  {/* Floating Text Label */}
                  <div className="absolute left-20 top-1/2 -translate-y-1/2 pointer-events-none z-50">
                    <div className="opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-out bg-white dark:bg-gray-800 backdrop-blur-xl border border-gray-200/80 dark:border-gray-700/80 px-4 py-2 rounded-xl shadow-2xl whitespace-nowrap">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">
                        {item.name}
                      </p>
                      {item.badge && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                          {item.badge}
                        </span>
                      )}
                      {/* Arrow pointer */}
                      <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-1">
                        <div className="w-2 h-2 bg-white dark:bg-gray-800 border-l border-t border-gray-200/80 dark:border-gray-700/80 transform rotate-[-45deg]" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}

          </nav>

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
                  className={`absolute bottom-full mb-2 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 animate-slideUp ${
                    sidebarCollapsed
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
      <div className={sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}>
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
        <main className="min-h-screen">
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
