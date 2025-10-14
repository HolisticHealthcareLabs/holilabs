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
import { ThemeProvider } from '@/contexts/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';

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

  const navItems: NavItem[] = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: '📊', emoji: '📊' },
    { name: t('nav.patients'), href: '/dashboard/patients', icon: '👥', emoji: '👥' },
    { name: t('nav.appointments'), href: '/dashboard/appointments', icon: '📅', emoji: '📅' },
    { name: t('nav.forms'), href: '/dashboard/forms', icon: '📝', emoji: '📝' },
    { name: t('nav.messages'), href: '/dashboard/messages', icon: '💬', emoji: '💬' },
    { name: t('nav.scribe'), href: '/dashboard/scribe', icon: '🎙️', emoji: '🎙️' },
    { name: t('nav.documents'), href: '/dashboard/upload', icon: '📄', emoji: '📄' },
    { name: t('nav.prescriptions'), href: '/dashboard/prescriptions', icon: '💊', emoji: '💊' },
    { name: t('nav.prevention'), href: '/dashboard/prevention', icon: '🛡️', emoji: '🛡️' },
    { name: t('nav.aiCopilot'), href: '/dashboard/ai', icon: '🦾', emoji: '🦾' },
    { name: t('nav.analysis'), href: '/dashboard/doc-intelligence', icon: '🧠', emoji: '🧠' },
    { name: t('nav.settings'), href: '/dashboard/settings', icon: '⚙️', emoji: '⚙️' },
  ];

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
              <Image src="/logos/Logo 1_Light.svg" alt="Holi Labs" width={32} height={32} />
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

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group relative flex items-center px-3 py-2.5 rounded-lg transition-all duration-300 overflow-hidden ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="text-xl flex-shrink-0 z-10">{item.emoji}</span>
                  <span
                    className={`absolute left-12 whitespace-nowrap font-medium transition-all duration-500 ease-out transform ${
                      isActive ? 'font-semibold' : ''
                    } opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0`}
                    style={{
                      animation: 'wave 0.6s ease-out forwards',
                      animationPlayState: 'paused'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.animationPlayState = 'running';
                    }}
                  >
                    {item.name}
                  </span>
                  {item.badge && (
                    <span className="ml-auto flex items-center justify-center min-w-[1.5rem] h-6 px-2 text-xs font-bold text-white bg-red-500 rounded-full z-10">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <style jsx>{`
            @keyframes wave {
              0% {
                opacity: 0;
                transform: translateX(-16px) translateY(8px);
              }
              50% {
                transform: translateX(0px) translateY(-4px);
              }
              100% {
                opacity: 1;
                transform: translateX(0px) translateY(0px);
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
              <Image src="/logos/Logo 1_Light.svg" alt="Holi Labs" width={32} height={32} />
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
