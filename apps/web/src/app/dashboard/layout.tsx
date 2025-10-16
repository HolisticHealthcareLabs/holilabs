'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import NotificationPrompt from '@/components/NotificationPrompt';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import GlobalSearch from '@/components/search/GlobalSearch';
import LanguageSelector from '@/components/LanguageSelector';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { SessionTimeoutWarning } from '@/components/SessionTimeoutWarning';

interface NavItem {
  name: string;
  href: string;
  icon: string;
  emoji: string;
  badge?: number;
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { locale, t } = useLanguage();
  const { theme } = useTheme();

  // Session timeout (15 min idle for HIPAA compliance)
  const { showWarning, timeRemaining, extendSession, logout } = useSessionTimeout({
    timeoutMs: 15 * 60 * 1000, // 15 minutes
    warningMs: 2 * 60 * 1000,  // 2 minute warning
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/auth/login');
      } else {
        setUser(user);
      }
    });
  }, [router]);

  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Main navigation items
  const mainNavItems: NavItem[] = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: '📊', emoji: '📊' },
    { name: t('nav.patients'), href: '/dashboard/patients', icon: '👥', emoji: '👥' },
    { name: t('nav.appointments'), href: '/dashboard/appointments', icon: '📅', emoji: '📅' },
    { name: t('nav.forms'), href: '/dashboard/forms', icon: '📝', emoji: '📝' },
    { name: t('nav.messages'), href: '/dashboard/messages', icon: '💬', emoji: '💬' },
    { name: t('nav.documents'), href: '/dashboard/upload', icon: '📄', emoji: '📄' },
    { name: t('nav.settings'), href: '/dashboard/settings', icon: '⚙️', emoji: '⚙️' },
  ];

  // Clinical Tools Group (Spider Tree) - includes Copilot
  const clinicalToolsGroup = {
    id: 'clinical-tools',
    name: 'Clinical Tools',
    emoji: '🏥',
    children: [
      { name: 'Prevention', href: '/dashboard/prevention', emoji: '🛡️' },
      { name: 'Diagnosis', href: '/dashboard/diagnosis', emoji: '🩺' },
      { name: 'Prescription', href: '/dashboard/prescriptions', emoji: '💊' },
      { name: 'Scribe', href: '/dashboard/scribe', emoji: '🎙️' },
      { name: 'Copilot', href: '/dashboard/ai', emoji: '🦾' },
      { name: 'Forms', href: '/dashboard/forms', emoji: '📝' },
      { name: 'Documents', href: '/dashboard/upload', emoji: '📄' },
    ],
  };

  const navItems = mainNavItems;

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <Image
                src={theme === 'dark' ? "/logos/Logo 1_Dark (1).svg" : "/logos/Logo 1_Light.svg"}
                alt="Holi Labs"
                width={32}
                height={32}
              />
              <span className="font-bold text-xl text-gray-900 dark:text-white">
                Holi Labs
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation - Futuristic Floating Emoji Tiles */}
          <nav className="flex-1 px-3 py-4 space-y-3 overflow-y-auto">
            {/* Main Navigation Items */}
            {navItems.map((item, index) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <div key={item.href} className="relative">
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`group relative flex items-center justify-center w-14 h-14 rounded-full transition-all duration-500 ${
                      isActive
                        ? 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/50 scale-110 ring-2 ring-blue-400 dark:ring-blue-500'
                        : 'bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:scale-110 hover:shadow-xl hover:shadow-blue-500/30 dark:hover:shadow-blue-400/20'
                    }`}
                    style={{
                      transitionDelay: `${index * 30}ms`
                    }}
                  >
                    <span className={`text-2xl transition-transform duration-300 group-hover:scale-125 ${
                      isActive ? 'filter drop-shadow-lg' : ''
                    }`}>
                      {item.emoji}
                    </span>

                    {/* Floating Text Label */}
                    <div className="absolute left-20 top-1/2 -translate-y-1/2 pointer-events-none z-50">
                      <div className={`
                        opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0
                        transition-all duration-500 ease-out
                        bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900
                        backdrop-blur-xl border border-gray-200/80 dark:border-gray-700/80
                        px-4 py-2 rounded-xl shadow-2xl
                        whitespace-nowrap
                      `}>
                        <p className={`font-semibold text-sm tracking-wide ${
                          isActive
                            ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {item.name}
                        </p>
                        <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-1">
                          <div className="w-2 h-2 bg-white dark:bg-gray-800 border-l border-t border-gray-200/80 dark:border-gray-700/80 transform rotate-[-45deg]" />
                        </div>
                      </div>
                    </div>

                    {isActive && (
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 opacity-20 animate-pulse" />
                    )}

                    {item.badge && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full shadow-lg z-10 animate-bounce">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </div>
              );
            })}

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent my-2" />

            {/* Clinical Tools Group - Spider Tree */}
            <div
              className="relative"
              onMouseEnter={() => setExpandedGroup('clinical-tools')}
              onMouseLeave={() => setExpandedGroup(null)}
            >
              <button
                className="group relative flex items-center justify-center w-14 h-14 rounded-full transition-all duration-500 bg-gradient-to-br from-green-500 to-teal-600 hover:scale-110 hover:shadow-xl hover:shadow-green-500/30 dark:hover:shadow-green-400/20"
              >
                <span className="text-2xl transition-transform duration-300 group-hover:scale-125">
                  {clinicalToolsGroup.emoji}
                </span>

                {/* Floating Text Label */}
                <div className="absolute left-20 top-1/2 -translate-y-1/2 pointer-events-none z-50">
                  <div className="opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 ease-out bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 backdrop-blur-xl border border-gray-200/80 dark:border-gray-700/80 px-4 py-2 rounded-xl shadow-2xl whitespace-nowrap">
                    <p className="font-semibold text-sm tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-teal-600 dark:from-green-400 dark:to-teal-400">
                      {clinicalToolsGroup.name}
                    </p>
                    <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-1">
                      <div className="w-2 h-2 bg-white dark:bg-gray-800 border-l border-t border-gray-200/80 dark:border-gray-700/80 transform rotate-[-45deg]" />
                    </div>
                  </div>
                </div>
              </button>

              {/* Spider Tree Sub-Items */}
              {expandedGroup === 'clinical-tools' && (
                <div className="absolute left-20 top-0 z-40 flex flex-col gap-2 pl-6">
                  {clinicalToolsGroup.children.map((child, idx) => {
                    const isActive = pathname === child.href || pathname.startsWith(child.href + '/');
                    return (
                      <div
                        key={child.href}
                        className="relative"
                        style={{
                          animation: `slideIn 0.3s ease-out forwards`,
                          animationDelay: `${idx * 50}ms`,
                          opacity: 0
                        }}
                      >
                        {/* Connecting Line */}
                        <svg className="absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-0.5" xmlns="http://www.w3.org/2000/svg">
                          <line x1="0" y1="1" x2="24" y2="1" stroke="url(#gradient)" strokeWidth="2" strokeDasharray="2,2" />
                          <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.5" />
                              <stop offset="100%" stopColor="rgb(20, 184, 166)" stopOpacity="0.8" />
                            </linearGradient>
                          </defs>
                        </svg>

                        <Link
                          href={child.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`group/child flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
                            isActive
                              ? 'bg-gradient-to-br from-green-500 to-teal-600 shadow-md shadow-green-500/50 scale-110 ring-2 ring-green-400'
                              : 'bg-white/70 dark:bg-gray-800/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 hover:scale-110 hover:shadow-lg'
                          }`}
                        >
                          <span className="text-lg">{child.emoji}</span>

                          {/* Child Text Label */}
                          <div className="absolute left-14 top-1/2 -translate-y-1/2 pointer-events-none z-50">
                            <div className="opacity-0 -translate-x-4 group-hover/child:opacity-100 group-hover/child:translate-x-0 transition-all duration-300 ease-out bg-white dark:bg-gray-800 backdrop-blur-xl border border-gray-200/80 dark:border-gray-700/80 px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
                              <p className="font-medium text-xs text-gray-900 dark:text-white">
                                {child.name}
                              </p>
                            </div>
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

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

          {/* User Profile */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                {user?.email?.[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  Dr. {user?.email?.split('@')[0]}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <span className="text-lg">🚪</span>
              <span>{t('nav.logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Mobile Header */}
        <header className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center space-x-2">
              <Image
                src={theme === 'dark' ? "/logos/Logo 1_Dark (1).svg" : "/logos/Logo 1_Light.svg"}
                alt="Holi Labs"
                width={32}
                height={32}
              />
              <span className="font-bold text-lg text-gray-900 dark:text-white">Holi Labs</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageSelector currentLocale={locale} />
              <GlobalSearch />
              <NotificationCenter />
            </div>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:block bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
          <div className="flex items-center justify-end h-16 px-6 gap-4">
            <ThemeToggle />
            <LanguageSelector currentLocale={locale} />
            <GlobalSearch />
            <NotificationCenter />
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
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <DashboardContent>{children}</DashboardContent>
      </LanguageProvider>
    </ThemeProvider>
  );
}
