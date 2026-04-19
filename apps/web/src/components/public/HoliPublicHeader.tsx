'use client';

/**
 * Holi Labs — Public Header.
 *
 * Sits at the top of patient-facing pages under /find-doctor/*. Pairs with the
 * authenticated dashboard layout (at /dashboard/*) — clinicians who sign in
 * are routed to the dashboard-integrated version of these same tools.
 *
 * Design posture: clean, confident, quiet. Sticky-translucent. No marketing
 * clutter, no drop-shadows. Matches the design language of the pre-op suite.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Stethoscope, HeartPulse, Leaf, Sparkles, LogIn } from 'lucide-react';
import React from 'react';

const NAV_ITEMS: Array<{
  href: string;
  label: string;
  icon: React.FC<{ className?: string; strokeWidth?: number | string }>;
  matchPrefix: string;
}> = [
  { href: '/find-doctor',                    label: 'Find care',           icon: Stethoscope, matchPrefix: '/find-doctor' },
  { href: '/find-doctor/preop-calculators',  label: 'Risk calculators',   icon: HeartPulse,  matchPrefix: '/find-doctor/preop-calculators' },
  { href: '/find-doctor/preop-screening',    label: 'Supplement screen',   icon: Leaf,        matchPrefix: '/find-doctor/preop-screening' },
  { href: '/find-doctor/cam-consult',        label: 'CAM consult',         icon: Sparkles,    matchPrefix: '/find-doctor/cam-consult' },
];

export default function HoliPublicHeader() {
  const pathname = usePathname() || '';

  // Suppress on authenticated dashboard routes — the dashboard sidebar already
  // provides the Holi Labs brand + navigation. Avoids duplicate chrome when a
  // page component is re-exported from /find-doctor/* into /dashboard/*.
  if (pathname.startsWith('/dashboard')) {
    return null;
  }

  // For /find-doctor exact match (not the sub-routes), we want the "Find care" item active
  // Others match on prefix.
  const isActive = (item: (typeof NAV_ITEMS)[number]) => {
    if (item.matchPrefix === '/find-doctor') {
      return pathname === '/find-doctor' || pathname === '/find-doctor/';
    }
    return pathname.startsWith(item.matchPrefix);
  };

  return (
    <header
      className="sticky top-0 z-30 w-full bg-white/85 dark:bg-slate-950/85 backdrop-blur-md border-b border-slate-200/70 dark:border-white/10"
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
        {/* Brand */}
        <Link
          href="/find-doctor"
          className="flex items-center gap-2 flex-shrink-0 select-none group"
          aria-label="Holi Labs home"
        >
          <span
            className="w-7 h-7 rounded-[8px] flex items-center justify-center text-white font-semibold text-[13px] tracking-tight shadow-sm"
            style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0891b2 100%)' }}
          >
            H
          </span>
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-slate-900 dark:text-white">
            Holi Labs
          </span>
        </Link>

        {/* Divider */}
        <span className="hidden md:inline-block w-px h-5 bg-slate-200 dark:bg-white/10" />

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1 min-w-0" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-[13px] font-medium transition-colors ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right — clinician entry */}
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/dashboard/my-day"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5 transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" strokeWidth={1.75} />
            For clinicians
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[13px] font-semibold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>

      {/* Mobile nav — horizontal scroll */}
      <nav className="md:hidden border-t border-slate-100 dark:border-white/5 overflow-x-auto" aria-label="Primary (mobile)">
        <div className="flex items-center px-4 gap-1 py-2 min-w-max">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-[13px] font-medium transition-colors ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
