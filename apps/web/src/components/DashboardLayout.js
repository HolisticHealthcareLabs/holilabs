"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardLayout;
const link_1 = __importDefault(require("next/link"));
const image_1 = __importDefault(require("next/image"));
const navigation_1 = require("next/navigation");
const react_1 = require("react");
function DashboardLayout({ children }) {
    const pathname = (0, navigation_1.usePathname)();
    const [navMode, setNavMode] = (0, react_1.useState)('top');
    // Load saved preference
    (0, react_1.useEffect)(() => {
        const saved = localStorage.getItem('navMode');
        if (saved === 'sidebar' || saved === 'top') {
            setNavMode(saved);
        }
    }, []);
    // Save preference
    const toggleNavMode = () => {
        const newMode = navMode === 'sidebar' ? 'top' : 'sidebar';
        setNavMode(newMode);
        localStorage.setItem('navMode', newMode);
    };
    const isActive = (path) => pathname === path || pathname?.startsWith(path + '/');
    const navItems = [
        {
            href: '/dashboard',
            label: 'Panel',
            emoji: '📊',
            icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
        </svg>),
        },
        {
            href: '/dashboard/patients',
            label: 'Pacientes',
            emoji: '👥',
            icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
        </svg>),
        },
        {
            href: '/dashboard/upload',
            label: 'Subir Datos',
            emoji: '📤',
            icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
        </svg>),
        },
        {
            href: '/dashboard/ai',
            label: 'IA',
            emoji: '🤖',
            icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
        </svg>),
        },
        {
            href: '/dashboard/admin',
            label: 'Administración',
            emoji: '🔧',
            icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>),
        },
    ];
    if (navMode === 'top') {
        return (<div className="flex flex-col h-screen bg-gray-50">
        {/* Top Navigation */}
        <header className="bg-primary text-white shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <link_1.default href="/dashboard" className="flex items-center">
                <image_1.default src="/logos/holi-light.svg" alt="Holi Labs" width={32} height={32} className="mr-2"/>
                <h1 className="text-xl font-bold">VidaBanq</h1>
              </link_1.default>

              {/* Navigation Tabs */}
              <nav className="flex items-center space-x-1">
                {navItems.map((item) => (<link_1.default key={item.href} href={item.href} className={`px-4 py-2 rounded-lg transition flex items-center space-x-2 ${pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href))
                    ? 'bg-accent text-primary font-bold'
                    : 'hover:bg-white/10 hover:text-accent'}`}>
                    <span className="text-lg">{item.emoji}</span>
                    <span className="hidden md:inline">{item.label}</span>
                  </link_1.default>))}
              </nav>

              {/* User & Toggle */}
              <div className="flex items-center space-x-3">
                {/* HIPAA Badge */}
                <div className="hidden lg:flex items-center bg-white/10 border border-white/20 px-3 py-1 rounded-lg">
                  <svg className="w-4 h-4 mr-2 text-accent" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-xs font-semibold">HIPAA</span>
                </div>

                {/* User Profile */}
                <div className="flex items-center bg-white/10 px-3 py-1 rounded-lg">
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-primary font-bold text-sm">
                    DR
                  </div>
                  <div className="ml-2 hidden lg:block">
                    <p className="text-xs font-semibold">Dr. Isabella Rossi</p>
                  </div>
                </div>

                {/* Layout Toggle */}
                <button onClick={toggleNavMode} className="p-2 hover:bg-white/10 rounded-lg transition" title="Switch to sidebar navigation">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>);
    }
    // Sidebar mode
    return (<div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 min-h-screen bg-primary text-white p-4 flex flex-col justify-between">
        <div>
          {/* Logo */}
          <link_1.default href="/dashboard" className="flex items-center mb-8">
            <image_1.default src="/logos/holi-light.svg" alt="Holi Labs" width={40} height={40} className="mr-3"/>
            <h1 className="text-2xl font-bold">VidaBanq</h1>
          </link_1.default>

          {/* Navigation */}
          <nav>
            <ul className="space-y-2">
              {navItems.map((item) => (<li key={item.href}>
                  <link_1.default href={item.href} className={`flex items-center p-3 rounded-lg transition ${pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href))
                ? 'bg-accent text-primary font-bold'
                : 'hover:bg-white/10 hover:text-accent'}`}>
                    <span className="mr-3">{item.icon}</span>
                    {item.label}
                  </link_1.default>
                </li>))}
            </ul>
          </nav>

          {/* Layout Toggle */}
          <button onClick={toggleNavMode} className="mt-6 w-full p-3 bg-white/10 hover:bg-white/20 rounded-lg transition flex items-center justify-center space-x-2" title="Switch to top navigation">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
            <span className="text-sm">Vista Superior</span>
          </button>
        </div>

        {/* Bottom Section */}
        <div className="mt-auto space-y-4">
          {/* HIPAA Badge */}
          <div className="bg-white/10 border border-white/20 p-3 rounded-lg text-center">
            <p className="text-sm font-semibold flex items-center justify-center">
              <svg className="w-4 h-4 mr-2 text-accent" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              HIPAA Compliant
            </p>
            <p className="text-xs text-gray-300 mt-1">Safe Harbor Method</p>
          </div>

          {/* User Profile */}
          <div className="flex items-center p-3 rounded-lg bg-white/10">
            <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center text-primary font-bold">
              DR
            </div>
            <div className="ml-3">
              <p className="font-semibold text-white text-sm">Dr. Isabella Rossi</p>
              <p className="text-xs text-gray-300">Cardiologist</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>);
}
//# sourceMappingURL=DashboardLayout.js.map