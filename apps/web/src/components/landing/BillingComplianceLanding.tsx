'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { motion, useScroll, useTransform, useInView, useMotionValue, useSpring, animate } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// Animation primitives
// ─────────────────────────────────────────────────────────────────────────────

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, ease: EASE_OUT_EXPO, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function CountUp({ target, suffix = '', className }: { target: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const motionVal = useMotionValue(0);
  const springVal = useSpring(motionVal, { damping: 40, stiffness: 100 });

  useEffect(() => {
    if (isInView) {
      animate(motionVal, target, { duration: 1.8, ease: EASE_OUT_EXPO as unknown as [number, number, number, number] });
    }
  }, [isInView, motionVal, target]);

  useEffect(() => {
    const unsubscribe = springVal.on('change', (v) => {
      if (ref.current) ref.current.textContent = `${Math.round(v)}${suffix}`;
    });
    return unsubscribe;
  }, [springVal, suffix]);

  return <span ref={ref} className={className}>0{suffix}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Locale config
// ─────────────────────────────────────────────────────────────────────────────

const LOCALE_OPTIONS = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'pt', label: 'PT', name: 'Português' },
  { code: 'es', label: 'ES', name: 'Español' },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Inline SVGs
// ─────────────────────────────────────────────────────────────────────────────

function HoliLogo({ className = 'h-5 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="20 100 555 670" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <line x1="244" y1="369" x2="350" y2="369" stroke="currentColor" strokeLinecap="round" strokeWidth="58" />
      <line x1="244" y1="454" x2="350" y2="454" stroke="currentColor" strokeLinecap="round" strokeWidth="58" />
      <path fill="currentColor" d="M545,412c0-21-9-42-22-54-15-15-24-36-24-57 0-1 0-2 0-3 0-21 14-43 24-57 10-13 23-34 23-55 0-43-35-77-78-76-41 1-74 35-75 76 0 22 13 43 23 55 12 15 24 36 24 57 0 1 0 2 0 2-1 22-15 43-24 57-11 16-22 33-22 54s8 40 22 54c15 15 24 35 24 57 0 0 0 1 0 1 0 22-12 42-24 57-9 12-22 33-22 54 0 41 33 75 75 76 43 1 78-34 78-76 0-21-14-42-23-54-13-17-23-35-24-57 0 0 0 0 0-1 0-22 9-42 24-58 14-14 22-33 22-54z" />
      <path fill="currentColor" d="M202,412c0-21-9-42-22-54-15-15-24-36-24-57 0-1 0-2 0-3 0-21 14-43 24-57 10-13 23-34 23-55 0-43-35-77-78-76-41 1-74 35-75 76 0 22 13 43 23 55 12 15 24 36 24 57 0 1 0 2 0 2-1 22-15 43-24 57-11 16-22 33-22 54s8 40 22 54c15 15 24 35 24 57 0 0 0 1 0 1 0 22-12 42-24 57-9 12-22 33-22 54 0 41 33 75 75 76 43 1 78-34 78-76 0-21-14-42-23-54-13-17-23-35-24-57 0 0 0 0 0-1 0-22 9-42 24-58 14-14 22-33 22-54z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5 text-zinc-500">
      <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function BillingComplianceLanding() {
  const t = useTranslations('landing.hero');
  const tNav = useTranslations('landing.nav');
  const tRoi = useTranslations('landing.roi');
  const tFin = useTranslations('landing.roiFinance');
  const tTime = useTranslations('landing.roiTime');
  const tHow = useTranslations('landing.howItWorks');
  const tSec = useTranslations('landing.security');
  const tCta = useTranslations('landing.cta');
  const tFoot = useTranslations('landing.footer');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [formState, setFormState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [formMsg, setFormMsg] = useState('');
  const [langOpen, setLangOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'physicians' | 'administrators'>('physicians');

  const currentLabel = LOCALE_OPTIONS.find((o) => o.code === locale)?.label ?? 'EN';

  // ── Scroll state ──────────────────────────────────────────────────────────
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroMockupY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.3]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  useEffect(() => {
    if (!langOpen) return;
    const close = () => setLangOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [langOpen]);

  // ── Waitlist form ─────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || formState === 'loading') return;
    setFormState('loading');
    setFormMsg('');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          organization: organization || undefined,
          plan: selectedRole || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFormState('success');
        setFormMsg(tCta('successMsg'));
        setEmail('');
        setOrganization('');
        setSelectedRole('');
      } else {
        setFormState('error');
        setFormMsg(data.error || tCta('errorDefault'));
      }
    } catch {
      setFormState('error');
      setFormMsg(tCta('errorNetwork'));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="bg-[#09090B] text-white font-body antialiased overflow-x-hidden selection:bg-zinc-700/50 selection:text-white noise-overlay">

        {/* ── Mobile full-screen menu ──────────────────────────────────────── */}
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-[#09090B] flex flex-col items-center justify-center gap-8"
          >
            {[
              { label: tNav('results'), href: '#roi' },
              { label: tNav('howItWorks'), href: '#how-it-works' },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="text-[28px] font-body font-light tracking-[-0.03em] text-white/80 hover:text-white transition-colors"
              >
                {item.label}
              </a>
            ))}
            <a
              href="/auth/login"
              onClick={() => setMenuOpen(false)}
              className="text-[28px] font-body font-light tracking-[-0.03em] text-white/80 hover:text-white transition-colors"
            >
              {tNav('signIn')}
            </a>
            <div className="flex gap-3 mt-4">
              {LOCALE_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  onClick={() => { router.replace(pathname, { locale: opt.code }); setMenuOpen(false); }}
                  className={`text-[13px] font-medium px-4 py-2 rounded-full transition-colors ${locale === opt.code ? 'bg-white text-[#09090B]' : 'text-zinc-500 hover:text-white border border-zinc-700'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <a
              href="#access"
              onClick={() => setMenuOpen(false)}
              className="mt-6 inline-flex rounded-full bg-white text-[#09090B] text-[16px] font-semibold px-9 py-4 hover:bg-zinc-200 transition-colors active:scale-[0.98]"
            >
              {tNav('requestAccess')}
            </a>
          </motion.div>
        )}

        {/* ── Navigation ──────────────────────────────────────────────────── */}
        <header
          className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${scrolled
            ? 'bg-[#09090B]/80 backdrop-blur-2xl border-b border-white/[0.06]'
            : 'bg-transparent'
          }`}
        >
          <nav className="relative flex items-center justify-between h-14 px-5 md:px-8 lg:px-10 max-w-7xl mx-auto">
            <a href="/" className="flex items-center gap-2.5 text-white shrink-0">
              <HoliLogo className="h-[20px] w-auto" />
              <span className="text-[15px] font-body font-semibold tracking-[-0.02em]">Holi Labs</span>
            </a>

            <div className="hidden md:flex items-center gap-8">
              {[
                { label: tNav('results'), href: '#roi' },
                { label: tNav('howItWorks'), href: '#how-it-works' },
              ].map((item) => (
                <a key={item.label} href={item.href} className="text-[13px] text-zinc-400 hover:text-white transition-colors duration-200">
                  {item.label}
                </a>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setLangOpen((v) => !v)}
                  className="flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-300 transition-colors"
                  aria-label={tNav('changeLanguage')}
                >
                  <GlobeIcon />
                  {currentLabel}
                </button>
                {langOpen && (
                  <div className="absolute right-0 top-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1 min-w-[130px] z-50">
                    {LOCALE_OPTIONS.map((opt) => (
                      <button
                        key={opt.code}
                        onClick={() => { router.replace(pathname, { locale: opt.code }); setLangOpen(false); }}
                        className={`w-full text-left px-3.5 py-2 text-[13px] transition-colors ${locale === opt.code ? 'text-white font-medium' : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'}`}
                      >
                        {opt.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <a href="/auth/login" className="text-[13px] text-zinc-400 hover:text-white transition-colors px-3 py-1.5">
                {tNav('signIn')}
              </a>
              <a
                href="#access"
                className="inline-flex items-center rounded-full bg-white text-[#09090B] text-[13px] font-semibold px-5 py-2 hover:bg-zinc-200 transition-colors active:scale-[0.98]"
              >
                {tNav('requestAccess')}
              </a>
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden flex flex-col gap-[5px] p-2 z-50"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? tNav('closeMenu') : tNav('openMenu')}
              aria-expanded={menuOpen}
            >
              <span className={`block h-[1.5px] w-5 bg-white origin-center transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-[6.5px]' : ''}`} />
              <span className={`block h-[1.5px] w-5 bg-white transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-[1.5px] w-5 bg-white origin-center transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-[6.5px]' : ''}`} />
            </button>
          </nav>
        </header>

        {/* ═══════════════════════════════════════════════════════════════════
            § 1 — HERO
        ═══════════════════════════════════════════════════════════════════ */}
        <section ref={heroRef} className="relative min-h-[100dvh] flex flex-col items-center pt-36 pb-16 px-5 overflow-hidden">

          <motion.div style={{ opacity: heroOpacity }} className="relative z-10 text-center max-w-4xl mx-auto">
            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: EASE_OUT_EXPO }}
              className="font-display text-[clamp(44px,8.5vw,96px)] tracking-[-0.045em] leading-[0.92] text-white mb-7 whitespace-pre-line"
            >
              {t('headline')}
            </motion.h1>

            {/* Subhead */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: EASE_OUT_EXPO }}
              className="font-body text-[clamp(16px,2vw,19px)] text-zinc-400 leading-relaxed max-w-xl mx-auto mb-10"
            >
              {t('subhead')}
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.45, ease: EASE_OUT_EXPO }}
              className="flex items-center justify-center mb-12"
            >
              <a
                href="#access"
                className="inline-flex items-center rounded-full bg-white text-[#09090B] text-[15px] font-semibold px-8 py-3.5 hover:bg-zinc-200 transition-all active:scale-[0.98]"
              >
                {t('ctaPrimary')}
              </a>
            </motion.div>

            {/* Trust strip — clean text pills, no icons */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="flex flex-wrap items-center justify-center gap-3"
            >
              {[t('trustLgpd'), t('trustAnvisa'), t('trustFhir'), t('trustSpeed'), t('trustPhi')].map((label, i) => (
                <span
                  key={i}
                  className="text-[11px] font-medium tracking-[0.04em] text-zinc-500 uppercase"
                >
                  {i > 0 && <span className="mr-3 text-zinc-700" aria-hidden="true">/</span>}
                  {label}
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* Product mockup */}
          <motion.div
            style={{ y: heroMockupY }}
            initial={{ opacity: 0, y: 60, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.5, ease: EASE_OUT_EXPO }}
            className="relative z-10 mt-20 w-full max-w-6xl mx-auto"
          >
            <div className="relative rounded-2xl overflow-hidden border border-zinc-800/60">
              <img
                src="/holilabsv2.jpeg"
                alt="Holi Labs Co-Pilot interface"
                className="w-full h-auto"
                loading="eager"
              />
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#09090B] to-transparent pointer-events-none" />
            </div>
          </motion.div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            § 2 — ROI
        ═══════════════════════════════════════════════════════════════════ */}
        <section id="roi" className="py-40 px-5">
          <div className="max-w-6xl mx-auto">
            <Reveal className="text-center mb-16">
              {/* Tab switcher */}
              <div className="inline-flex items-center gap-1 rounded-full bg-zinc-900/60 border border-zinc-800/60 p-1">
                {(['physicians', 'administrators'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative text-[14px] font-medium px-6 py-2.5 rounded-full transition-all duration-300 ${
                      activeTab === tab
                        ? 'text-white bg-white/[0.08]'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {tab === 'physicians' ? tRoi('tabPhysicians') : tRoi('tabAdministrators')}
                  </button>
                ))}
              </div>
            </Reveal>

            {/* Tab content: Physicians */}
            {activeTab === 'physicians' && (
              <motion.div
                key="physicians"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
              >
                <div className="grid md:grid-cols-[1fr_1.4fr] gap-16 items-start mb-16">
                  <div>
                    <p className="text-[12px] font-medium text-zinc-500 tracking-[0.1em] uppercase mb-6">{tTime('eyebrow')}</p>
                    <p className="font-display text-[clamp(72px,14vw,140px)] tracking-[-0.05em] leading-none text-white mb-3">
                      <CountUp target={90} suffix="s" className="font-display" />
                    </p>
                    <p className="text-[16px] text-zinc-500 max-w-[320px]">{tTime('statLabel')}</p>
                  </div>
                  <div>
                    <h2 className="font-display text-[clamp(28px,4vw,44px)] tracking-[-0.035em] leading-[1.05] text-white mb-6">
                      {tTime('headline')}
                    </h2>
                    <p className="text-[16px] text-zinc-400 leading-relaxed mb-8 max-w-lg">
                      {tTime('description')}
                    </p>
                    <ul className="space-y-3.5">
                      {[tTime('item1'), tTime('item2'), tTime('item3'), tTime('item4')].map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-[15px] text-zinc-300">
                          <CheckIcon />{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Before / After strip */}
                <div className="grid md:grid-cols-2 gap-px bg-zinc-800/50 rounded-2xl overflow-hidden">
                  <div className="bg-[#0C0C0F] p-8">
                    <p className="text-[11px] font-medium text-zinc-600 tracking-[0.1em] uppercase mb-3">{tRoi('beforeLabel')}</p>
                    <p className="text-[16px] text-zinc-500 leading-relaxed">{tRoi('physicianBefore')}</p>
                  </div>
                  <div className="bg-[#0C0C0F] p-8">
                    <p className="text-[11px] font-medium text-zinc-400 tracking-[0.1em] uppercase mb-3">{tRoi('afterLabel')}</p>
                    <p className="text-[16px] text-zinc-300 leading-relaxed">{tRoi('physicianAfter')}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tab content: Administrators */}
            {activeTab === 'administrators' && (
              <motion.div
                key="administrators"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
              >
                <div className="grid md:grid-cols-[1.4fr_1fr] gap-16 items-start mb-16">
                  <div>
                    <h2 className="font-display text-[clamp(28px,4vw,44px)] tracking-[-0.035em] leading-[1.05] text-white mb-6">
                      {tFin('headline')}
                    </h2>
                    <p className="text-[16px] text-zinc-400 leading-relaxed mb-8 max-w-lg">
                      {tFin('description')}
                    </p>
                    <ul className="space-y-3.5">
                      {[tFin('item1'), tFin('item2'), tFin('item3'), tFin('item4')].map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-[15px] text-zinc-300">
                          <CheckIcon />{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-zinc-500 tracking-[0.1em] uppercase mb-6">{tFin('eyebrow')}</p>
                    <p className="font-display text-[clamp(72px,14vw,140px)] tracking-[-0.05em] leading-none text-white mb-3">
                      <CountUp target={30} suffix="%" className="font-display" />
                    </p>
                    <p className="text-[16px] text-zinc-500 max-w-[320px]">{tFin('statLabel')}</p>
                  </div>
                </div>

                {/* Before / After strip */}
                <div className="grid md:grid-cols-2 gap-px bg-zinc-800/50 rounded-2xl overflow-hidden">
                  <div className="bg-[#0C0C0F] p-8">
                    <p className="text-[11px] font-medium text-zinc-600 tracking-[0.1em] uppercase mb-3">{tRoi('beforeLabel')}</p>
                    <p className="text-[16px] text-zinc-500 leading-relaxed">{tRoi('adminBefore')}</p>
                  </div>
                  <div className="bg-[#0C0C0F] p-8">
                    <p className="text-[11px] font-medium text-zinc-400 tracking-[0.1em] uppercase mb-3">{tRoi('afterLabel')}</p>
                    <p className="text-[16px] text-zinc-300 leading-relaxed">{tRoi('adminAfter')}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            § 3 — HOW IT WORKS
        ═══════════════════════════════════════════════════════════════════ */}
        <section id="how-it-works" className="py-40 px-5">
          <div className="max-w-5xl mx-auto">
            <Reveal className="text-center mb-20">
              <h2 className="font-display text-[clamp(32px,5vw,56px)] tracking-[-0.035em] leading-[1.05] text-white whitespace-pre-line mb-5">
                {tHow('headline')}
              </h2>
              <p className="text-[17px] text-zinc-400 leading-relaxed max-w-xl mx-auto">
                {tHow('subhead')}
              </p>
            </Reveal>

            {/* 3 staggered cards */}
            <div className="grid md:grid-cols-3 gap-4 mb-16">
              {[
                { num: '01', title: tHow('step1Title'), desc: tHow('step1Desc') },
                { num: '02', title: tHow('step2Title'), desc: tHow('step2Desc') },
                { num: '03', title: tHow('step3Title'), desc: tHow('step3Desc') },
              ].map((step, i) => (
                <Reveal key={step.num} delay={i * 0.12}>
                  <div className="group relative rounded-2xl bg-zinc-900/40 border border-zinc-800/50 p-8 h-full overflow-hidden hover:border-zinc-700/60 transition-colors duration-300">
                    <p className="text-[48px] font-body font-extralight tracking-[-0.04em] text-zinc-800 leading-none mb-6">{step.num}</p>
                    <h3 className="text-[17px] font-body font-semibold tracking-[-0.02em] text-white mb-3">{step.title}</h3>
                    <p className="text-[14px] text-zinc-400 leading-relaxed">{step.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* Differentiator */}
            <Reveal delay={0.3} className="text-center">
              <p className="text-[clamp(17px,2.2vw,22px)] text-zinc-500 tracking-[-0.01em] leading-snug max-w-2xl mx-auto">
                {tHow('differentiator')}
              </p>
            </Reveal>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            § 4 — TRUST & SECURITY
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="py-32 px-5">
          <Reveal className="max-w-[700px] mx-auto text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/[0.03] border border-zinc-800/50 mb-8">
              <LockIcon />
            </div>
            <h2 className="font-display text-[clamp(32px,5vw,52px)] tracking-[-0.035em] leading-[1.05] text-white mb-6">
              {tSec('headline')}
            </h2>
            <p className="text-[17px] text-zinc-400 leading-relaxed mb-12">
              {tSec('description')}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {[tSec('badge1'), tSec('badge2'), tSec('badge3'), tSec('badge4'), tSec('badge5'), tSec('badge6')].map((badge, i) => (
                <span key={i} className="text-[12px] font-medium text-zinc-500 bg-white/[0.02] border border-zinc-800/50 rounded-full px-4 py-2 hover:text-zinc-300 hover:border-zinc-700/60 transition-colors duration-200">
                  {badge}
                </span>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            § 5 — FINAL CTA
        ═══════════════════════════════════════════════════════════════════ */}
        <section id="access" className="relative py-36 px-5 overflow-hidden">
          <Reveal className="relative z-10 max-w-[560px] mx-auto text-center">
            <h2 className="font-display text-[clamp(32px,5.5vw,52px)] tracking-[-0.035em] leading-[1.05] text-white mb-5">
              {tCta('headline')}
            </h2>
            <p className="text-[17px] text-zinc-400 mb-12">
              {tCta('subhead')}
            </p>

            {formState === 'success' ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center gap-2.5 rounded-full bg-white/[0.04] border border-zinc-700 px-6 py-4 max-w-md mx-auto"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" className="text-white flex-shrink-0">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-[15px] text-zinc-300 font-medium">{formMsg}</span>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="max-w-md mx-auto mb-6 space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (formState === 'error') setFormState('idle'); }}
                  placeholder={tCta('placeholder')}
                  required
                  className="w-full rounded-full px-5 py-3.5 bg-white/[0.03] text-white placeholder-zinc-600 text-[15px] font-body border border-zinc-800/60 focus:outline-none focus:border-zinc-600 focus:bg-white/[0.05] transition-all"
                />
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder={tCta('orgPlaceholder')}
                  className="w-full rounded-full px-5 py-3.5 bg-white/[0.03] text-white placeholder-zinc-600 text-[15px] font-body border border-zinc-800/60 focus:outline-none focus:border-zinc-600 focus:bg-white/[0.05] transition-all"
                />

                {/* Role selector */}
                <div className="flex items-center justify-center gap-3 py-2">
                  {[
                    { value: 'physician', label: tCta('rolePhysician') },
                    { value: 'administrator', label: tCta('roleAdmin') },
                    { value: 'other', label: tCta('roleOther') },
                  ].map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setSelectedRole(role.value)}
                      className={`text-[13px] font-medium px-4 py-2 rounded-full transition-all duration-200 ${
                        selectedRole === role.value
                          ? 'text-white bg-white/[0.08] border border-zinc-600'
                          : 'text-zinc-500 border border-zinc-800/60 hover:text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={formState === 'loading'}
                  className="w-full rounded-full bg-white text-[#09090B] text-[15px] font-semibold px-7 py-3.5 hover:bg-zinc-200 transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formState === 'loading' ? tCta('sending') : tCta('submit')}
                </button>
              </form>
            )}

            {formState === 'error' && (
              <p className="text-[13px] text-red-400 mb-3">{formMsg}</p>
            )}

            <p className="text-[12px] text-zinc-600">{tCta('disclaimer')}</p>
          </Reveal>
        </section>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <footer className="border-t border-zinc-800/50 px-5 pt-16 pb-10">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
              <div className="col-span-2 md:col-span-1">
                <div className="flex items-center gap-2 mb-3">
                  <HoliLogo className="h-4 w-auto text-zinc-500" />
                  <span className="text-[14px] font-semibold text-white tracking-[-0.02em]">{tFoot('brand')}</span>
                </div>
                <p className="text-[13px] text-zinc-500 leading-relaxed">{tFoot('brandSub')}</p>
              </div>
              {[
                {
                  heading: tFoot('product'),
                  links: [
                    { label: tNav('howItWorks'), href: '#how-it-works' },
                    { label: tFoot('liveDemo'), href: '/demo' },
                    { label: tNav('signIn'), href: '/auth/login' },
                  ],
                },
                {
                  heading: tFoot('company'),
                  links: [
                    { label: tFoot('about'), href: '#' },
                    { label: tFoot('blog'), href: '#' },
                    { label: tFoot('careers'), href: '#' },
                    { label: tFoot('press'), href: '#' },
                  ],
                },
                {
                  heading: tFoot('legal'),
                  links: [
                    { label: tFoot('privacy'), href: '/legal/privacy-policy' },
                    { label: tFoot('terms'), href: '/legal/terms-of-service' },
                    { label: tFoot('hipaaPolicy'), href: '/legal/hipaa-notice' },
                    { label: tFoot('lgpdPolicy'), href: '/legal/consent' },
                  ],
                },
              ].map((col) => (
                <div key={col.heading}>
                  <p className="text-[12px] font-medium text-zinc-500 uppercase tracking-[0.06em] mb-4">{col.heading}</p>
                  <ul className="space-y-3">
                    {col.links.map((link) => (
                      <li key={link.label}>
                        <a href={link.href} className="text-[13px] text-zinc-500 hover:text-white transition-colors duration-200">
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="border-t border-zinc-800/50 pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-[12px] text-zinc-600">{tFoot('copyright')}</p>
              <p className="text-[12px] text-zinc-600">{tFoot('badges')}</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
