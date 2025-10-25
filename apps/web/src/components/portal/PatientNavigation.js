"use strict";
/**
 * Patient Portal Navigation
 *
 * Industry-grade navigation component for patient portal
 * Features:
 * - Mobile hamburger menu
 * - Desktop sidebar
 * - Active route highlighting
 * - User profile menu
 * - Logout functionality
 * - Smooth animations
 */
'use client';
/**
 * Patient Portal Navigation
 *
 * Industry-grade navigation component for patient portal
 * Features:
 * - Mobile hamburger menu
 * - Desktop sidebar
 * - Active route highlighting
 * - User profile menu
 * - Logout functionality
 * - Smooth animations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PatientNavigation;
const react_1 = require("react");
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const framer_motion_1 = require("framer-motion");
const NotificationCenter_1 = __importDefault(require("@/components/notifications/NotificationCenter"));
const GlobalSearch_1 = __importDefault(require("@/components/search/GlobalSearch"));
const navigationItems = [
    {
        name: 'Inicio',
        href: '/portal/dashboard',
        icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
      </svg>),
    },
    {
        name: 'Mis Registros',
        href: '/portal/records',
        icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>),
    },
    {
        name: 'Medicamentos',
        href: '/portal/medications',
        icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
      </svg>),
    },
    {
        name: 'Citas',
        href: '/portal/appointments',
        icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
      </svg>),
    },
    {
        name: 'Documentos',
        href: '/portal/documents',
        icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
      </svg>),
    },
    {
        name: 'Mensajes',
        href: '/portal/messages',
        icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
      </svg>),
        badge: 3, // Example: unread messages
    },
    {
        name: 'Mis Métricas',
        href: '/portal/metrics',
        icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
      </svg>),
    },
];
function PatientNavigation() {
    const pathname = (0, navigation_1.usePathname)();
    const router = (0, navigation_1.useRouter)();
    const [mobileMenuOpen, setMobileMenuOpen] = (0, react_1.useState)(false);
    const [userMenuOpen, setUserMenuOpen] = (0, react_1.useState)(false);
    const handleLogout = async () => {
        try {
            await fetch('/api/auth/patient/logout', { method: 'POST' });
            router.push('/portal/login');
        }
        catch (error) {
            console.error('Logout error:', error);
        }
    };
    return (<>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-gray-200 px-6 pb-4">
          {/* Logo & Notifications */}
          <div className="flex h-16 shrink-0 items-center justify-between">
            <link_1.default href="/portal/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
                <span className="text-xl">🌿</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                Holi Labs
              </span>
            </link_1.default>
            <div className="flex items-center gap-2">
              <GlobalSearch_1.default />
              <NotificationCenter_1.default />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            return (<li key={item.name}>
                        <link_1.default href={item.href} className={`
                            group flex gap-x-3 rounded-md p-3 text-sm leading-6 font-semibold transition-all
                            ${isActive
                    ? 'bg-gradient-to-r from-green-50 to-green-100 text-green-600'
                    : 'text-gray-700 hover:text-green-600 hover:bg-gray-50'}
                          `}>
                          {item.icon}
                          {item.name}
                          {item.badge && (<span className="ml-auto inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-600">
                              {item.badge}
                            </span>)}
                        </link_1.default>
                      </li>);
        })}
                </ul>
              </li>

              {/* Settings */}
              <li className="mt-auto">
                <link_1.default href="/portal/settings" className="group -mx-2 flex gap-x-3 rounded-md p-3 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-green-600">
                  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  Configuración
                </link_1.default>
              </li>
            </ul>
          </nav>

          {/* User Profile */}
          <div className="relative">
            <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="-mx-2 flex items-center gap-x-4 px-2 py-3 text-sm font-semibold leading-6 text-gray-900 hover:bg-gray-50 rounded-lg transition-colors w-full">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold">
                MG
              </div>
              <span className="flex-1 text-left">
                <span className="block">María González</span>
                <span className="text-xs text-gray-500">Ver perfil</span>
              </span>
              <svg className={`h-5 w-5 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            <framer_motion_1.AnimatePresence>
              {userMenuOpen && (<framer_motion_1.motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                  <link_1.default href="/portal/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Mi Perfil
                  </link_1.default>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                    Cerrar Sesión
                  </button>
                </framer_motion_1.motion.div>)}
            </framer_motion_1.AnimatePresence>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <link_1.default href="/portal/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
              <span className="text-xl">🌿</span>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
              Holi Labs
            </span>
          </link_1.default>

          <div className="flex items-center gap-2">
            <GlobalSearch_1.default />
            <NotificationCenter_1.default />
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>) : (<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>)}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <framer_motion_1.AnimatePresence>
          {mobileMenuOpen && (<framer_motion_1.motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="border-t border-gray-200 bg-white">
              <nav className="px-4 py-4 space-y-1">
                {navigationItems.map((item) => {
                const isActive = pathname === item.href;
                return (<link_1.default key={item.name} href={item.href} onClick={() => setMobileMenuOpen(false)} className={`
                        flex items-center gap-x-3 rounded-lg p-3 text-sm font-semibold transition-all
                        ${isActive
                        ? 'bg-gradient-to-r from-green-50 to-green-100 text-green-600'
                        : 'text-gray-700 hover:text-green-600 hover:bg-gray-50'}
                      `}>
                      {item.icon}
                      {item.name}
                      {item.badge && (<span className="ml-auto inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-600">
                          {item.badge}
                        </span>)}
                    </link_1.default>);
            })}

                <link_1.default href="/portal/settings" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-x-3 rounded-lg p-3 text-sm font-semibold text-gray-700 hover:text-green-600 hover:bg-gray-50">
                  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  Configuración
                </link_1.default>

                <button onClick={handleLogout} className="w-full flex items-center gap-x-3 rounded-lg p-3 text-sm font-semibold text-red-600 hover:bg-red-50">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                  </svg>
                  Cerrar Sesión
                </button>
              </nav>
            </framer_motion_1.motion.div>)}
        </framer_motion_1.AnimatePresence>
      </div>

      {/* Mobile Spacer */}
      <div className="lg:hidden h-16"/>
    </>);
}
//# sourceMappingURL=PatientNavigation.js.map