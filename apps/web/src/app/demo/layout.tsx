import React from 'react';

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-[#1d1d1f] font-sans antialiased">
      {/* Minimal navigation */}
      <header className="fixed inset-x-0 top-0 z-50 bg-white/90 backdrop-blur-xl shadow-[0_1px_0_0_rgba(0,0,0,0.08)]">
        <nav className="max-w-[1120px] mx-auto flex items-center justify-between h-[52px] px-5">
          <a href="/" className="flex-shrink-0 text-[17px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
            Cortex{' '}
            <span className="text-[#6e6e73] font-normal text-[15px]">by Holi Labs</span>
          </a>
          <div className="flex items-center gap-3">
            <a
              href="/sign-in"
              className="text-[13px] text-[#1d1d1f] hover:text-[#0071e3] transition-colors border border-black/15 rounded-full px-4 py-1.5 hover:border-[#0071e3]/40"
            >
              Sign in
            </a>
            <a
              href="/#access"
              className="inline-flex items-center rounded-full bg-[#0071e3] text-white text-[13px] font-semibold px-5 py-2 hover:bg-[#0077ed] transition-colors active:scale-[0.98]"
            >
              Request access
            </a>
          </div>
        </nav>
      </header>

      {/* Page content */}
      <main className="pt-[52px]">
        {children}
      </main>

      {/* Minimal footer */}
      <footer className="bg-[#1d1d1f] border-t border-white/10 px-5 py-10">
        <div className="max-w-[980px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[13px] text-[#6e6e73]">
            &copy; 2026 Holi Labs. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="/" className="text-[13px] text-[#6e6e73] hover:text-white transition-colors">
              Home
            </a>
            <a href="/demo" className="text-[13px] text-[#6e6e73] hover:text-white transition-colors">
              Live Demo
            </a>
            <a href="/sign-in" className="text-[13px] text-[#6e6e73] hover:text-white transition-colors">
              Sign in
            </a>
            <a href="/#access" className="text-[13px] text-[#6e6e73] hover:text-white transition-colors">
              Request access
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
