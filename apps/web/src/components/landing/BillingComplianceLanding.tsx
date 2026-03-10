'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';

// ─── useFadeIn hook ────────────────────────────────────────────────────────────
function useFadeIn(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [delay]);
  const style: React.CSSProperties = visible
    ? {
      opacity: 1,
      transform: 'none',
      transition:
        'opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1)',
    }
    : { opacity: 0, transform: 'translateY(28px)' };
  return { ref, style };
}

const LOCALE_OPTIONS = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'pt-BR', label: 'PT', name: 'Portugues' },
] as const;

export function BillingComplianceLanding() {
  const t = useTranslations('landing.hero');
  const tNav = useTranslations('landing.nav');
  const tA = useTranslations('landing.featureA');
  const tB = useTranslations('landing.featureB');
  const tC = useTranslations('landing.featureC');
  const tCta = useTranslations('landing.cta');
  const tFoot = useTranslations('landing.footer');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [email, setEmail] = useState('');
  const [formState, setFormState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [formMsg, setFormMsg] = useState('');
  const [langOpen, setLangOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Capture ?plan= from hash fragment (e.g. /#access?plan=safety)
  useEffect(() => {
    const hash = window.location.hash; // e.g. "#access?plan=safety"
    if (hash.includes('plan=')) {
      const match = hash.match(/plan=([^&]+)/);
      if (match) setSelectedPlan(match[1]);
    }
  }, []);

  // Nav text adapts to dark hero vs white scrolled background
  const navText = scrolled ? 'text-[#1d1d1f]' : 'text-white';
  const navMuted = scrolled ? 'text-[#6e6e73]' : 'text-white/60';
  const navBurger = scrolled ? 'bg-[#1d1d1f]' : 'bg-white';
  const currentLabel = LOCALE_OPTIONS.find((o) => o.code === locale)?.label ?? 'EN';

  // ── Parallax refs ──────────────────────────────────────────────────────────
  const heroContentRef = useRef<HTMLDivElement>(null);

  // ── Fade-in hooks (all unconditional) ─────────────────────────────────────
  const featureALeft = useFadeIn(0);
  const featureARight = useFadeIn(120);
  const featureBHead = useFadeIn(0);
  const bCard1 = useFadeIn(0);
  const bCard2 = useFadeIn(130);
  const bCard3 = useFadeIn(260);
  const featureCHead = useFadeIn(0);
  const cCard1 = useFadeIn(0);
  const cCard2 = useFadeIn(130);
  const cCard3 = useFadeIn(260);
  const ctaContent = useFadeIn(0);

  const bCards = [bCard1, bCard2, bCard3];
  const cCards = [cCard1, cCard2, cCard3];

  // ── Nav scroll effect ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Prevent body scroll when mobile menu open ──────────────────────────────
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  // ── Parallax scroll loop ───────────────────────────────────────────────────
  useEffect(() => {
    let rafId: number;

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (heroContentRef.current) {
          heroContentRef.current.style.transform = `translateY(${y * 0.13}px)`;
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // ── Close lang dropdown on outside click ───────────────────────────────────
  useEffect(() => {
    if (!langOpen) return;
    const close = () => setLangOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [langOpen]);

  // ── Form submission ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || formState === 'loading') return;

    setFormState('loading');
    setFormMsg('');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plan: selectedPlan }),
      });

      const data = await res.json();

      if (res.ok) {
        setFormState('success');
        setFormMsg(tCta('successMsg'));
        setEmail('');
      } else {
        setFormState('error');
        setFormMsg(data.error || tCta('errorDefault'));
      }
    } catch {
      setFormState('error');
      setFormMsg(tCta('errorNetwork'));
    }
  };

  return (
    <>
      <style>{`
        @keyframes float-tag { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        .float-tag-1 { animation: float-tag 3s ease-in-out infinite; }
        .float-tag-2 { animation: float-tag 3s ease-in-out 0.5s infinite; }
        .float-tag-3 { animation: float-tag 3s ease-in-out 1s infinite; }
        .float-tag-4 { animation: float-tag 3s ease-in-out 1.5s infinite; }
        .float-tag-5 { animation: float-tag 3s ease-in-out 2s infinite; }
        .float-tag-6 { animation: float-tag 3s ease-in-out 2.5s infinite; }
      `}</style>

      <div className="bg-white text-[#1d1d1f] font-sans antialiased overflow-x-hidden selection:bg-blue-100 selection:text-blue-900">

        {/* ── Mobile full-screen menu overlay ──────────────────────────────── */}
        {menuOpen && (
          <div className="fixed inset-0 z-40 bg-white flex flex-col items-center justify-center gap-8">
            {[
              { label: tNav('howItWorks'), href: '#how-it-works' },
              { label: tNav('forHospitals'), href: '#' },
              { label: tNav('pricing'), href: '/pricing' },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="text-[28px] font-semibold tracking-[-0.02em] text-[#1d1d1f] hover:text-[#0071e3] transition-colors"
              >
                {item.label}
              </a>
            ))}
            <a
              href="/auth/login"
              onClick={() => setMenuOpen(false)}
              className="text-[28px] font-semibold tracking-[-0.02em] text-[#1d1d1f] hover:text-[#0071e3] transition-colors"
            >
              {tNav('signIn')}
            </a>
            <div className="flex gap-3 mt-2">
              {LOCALE_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  onClick={() => { router.replace(pathname, { locale: opt.code }); setMenuOpen(false); }}
                  className={`text-[15px] font-medium px-3 py-1.5 rounded-full transition-colors ${locale === opt.code ? 'bg-[#0071e3] text-white' : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <a
              href="#access"
              onClick={() => setMenuOpen(false)}
              className="mt-4 inline-flex rounded-full bg-[#0071e3] text-white text-[17px] font-semibold px-9 py-4 hover:bg-[#0077ed] transition-colors active:scale-[0.98]"
            >
              {tNav('requestAccess')}
            </a>
          </div>
        )}

        {/* ── 1. Navigation ──────────────────────────────────────────────── */}
        <header
          className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled
              ? 'bg-white/90 backdrop-blur-xl shadow-[0_1px_0_0_rgba(0,0,0,0.08)]'
              : 'bg-transparent'
            }`}
        >
          <nav className="relative w-full flex items-center h-[52px] px-5 md:px-8 lg:px-10">
            {/* Logo */}
            <a href="/" className={`flex-shrink-0 flex items-center gap-2 text-[17px] font-semibold tracking-[-0.02em] ${navText} transition-colors duration-300`}>
              {/* Double-helix H mark — uses currentColor so it inherits scroll-aware nav text color */}
              <svg className="h-[22px] w-auto" viewBox="20 100 555 670" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <line x1="244.03" y1="369.32" x2="350.47" y2="369.32" stroke="currentColor" strokeLinecap="round" strokeWidth="58"/>
                <line x1="244.03" y1="453.65" x2="350.47" y2="453.65" stroke="currentColor" strokeLinecap="round" strokeWidth="58"/>
                <path fill="currentColor" d="m545.36,412.45h.28c-.09-.09-.18-.19-.28-.29,0-.23.01-.46,0-.69-.26-20.4-12.91-39.54-22.09-52.6-10.57-15.03-23.66-36.05-24.12-56.82-.03-1.47-.02-1.18,0-2.65.12-21.37,11.74-41.35,23.85-56.95,9.78-12.59,22.88-33.63,22.63-55.23-.47-40.95-33.71-74.6-74.64-75.57-43.09-1.02-78.34,33.61-78.34,76.48h-.04s.03.03.04.04c.01,20.95,11.14,39.39,22.09,53.74,11.78,15.43,24.2,35.7,24.35,57.25,0,.78,0,1.56,0,2.34-.16,21.55-14.59,43.3-24.39,57.22-10.89,15.48-22.1,32.77-22.1,53.72s8.39,39.83,21.99,53.62c15.01,15.22,24.01,35.43,24.12,56.81,0,.38,0,.77,0,1.15-.04,21.55-12.4,42.24-24.14,57.31-8.95,11.5-22.03,32.85-21.97,53.83.12,41.15,33.4,75.17,74.54,76.14,43.03,1.02,78.23-33.56,78.23-76.36,0-21.19-13.73-42.38-22.56-54.2-12.69-16.97-23.47-35.3-23.55-56.49,0-.19,0-.37,0-.56,0-21.6,8.9-42.21,24.08-57.58,13.62-13.79,22.02-32.75,22.02-53.67Z"/>
                <path fill="currentColor" d="m202.39,412.45h.28c-.09-.09-.18-.19-.28-.29,0-.23.01-.46,0-.69-.26-20.4-12.91-39.54-22.09-52.6-10.57-15.03-23.66-36.05-24.12-56.82-.03-1.47-.02-1.18,0-2.65.12-21.37,11.74-41.35,23.85-56.95,9.78-12.59,22.88-33.63,22.63-55.23-.47-40.95-33.71-74.6-74.64-75.57-43.09-1.02-78.34,33.61-78.34,76.48h-.04s.03.03.04.04c.01,20.95,11.14,39.39,22.09,53.74,11.78,15.43,24.2,35.7,24.35,57.25,0,.78,0,1.56,0,2.34-.16,21.55-14.59,43.3-24.39,57.22-10.89,15.48-22.1,32.77-22.1,53.72s8.39,39.83,21.99,53.62c15.01,15.22,24.01,35.43,24.12,56.81,0,.38,0,.77,0,1.15-.04,21.55-12.4,42.24-24.14,57.31-8.95,11.5-22.03,32.85-21.97,53.83.12,41.15,33.4,75.17,74.54,76.14,43.03,1.02,78.23-33.56,78.23-76.36,0-21.19-13.73-42.38-22.56-54.2-12.69-16.97-23.47-35.3-23.55-56.49,0-.19,0-.37,0-.56,0-21.6,8.9-42.21,24.08-57.58,13.62-13.79,22.02-32.75,22.02-53.67Z"/>
              </svg>
              Holi Labs
            </a>

            {/* Desktop center links */}
            <div className="hidden md:flex items-center gap-7 absolute left-1/2 -translate-x-1/2">
              {[
                { label: tNav('howItWorks'), href: '#how-it-works' },
                { label: tNav('forHospitals'), href: '#' },
                { label: tNav('pricing'), href: '/pricing' },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className={`text-[14px] ${navText} hover:text-[#0071e3] transition-colors duration-300`}
                >
                  {item.label}
                </a>
              ))}
            </div>

            {/* Desktop right: lang + sign in + CTA */}
            <div className="hidden md:flex items-center gap-3 ml-auto">
              {/* Language switcher */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setLangOpen((v) => !v)}
                  className={`flex items-center gap-1 text-[13px] font-medium ${navMuted} hover:${navText} transition-colors duration-300 px-2 py-1 rounded-md hover:bg-white/[0.08]`}
                  aria-label="Change language"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  {currentLabel}
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className={`opacity-40 transition-transform ${langOpen ? 'rotate-180' : ''}`}>
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {langOpen && (
                  <div className="absolute right-0 top-full mt-1.5 bg-white rounded-lg shadow-lg border border-black/[0.08] py-1 min-w-[100px] z-50">
                    {LOCALE_OPTIONS.map((opt) => (
                      <button
                        key={opt.code}
                        onClick={() => { router.replace(pathname, { locale: opt.code }); setLangOpen(false); }}
                        className={`w-full text-left px-3 py-1.5 text-[13px] transition-colors ${locale === opt.code ? 'text-[#0071e3] font-semibold bg-blue-50/60' : 'text-[#1d1d1f] hover:bg-black/[0.04]'
                          }`}
                      >
                        {opt.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <a
                href="/auth/login"
                className={`text-[13px] ${navText} hover:text-[#0071e3] transition-colors duration-300 border ${scrolled ? 'border-black/15 hover:border-[#0071e3]/40' : 'border-white/25 hover:border-white/50'} rounded-full px-4 py-1.5`}
              >
                {tNav('signIn')}
              </a>
              <a
                href="#access"
                className="inline-flex items-center rounded-full bg-[#0071e3] text-white text-[13px] font-semibold px-5 py-2 hover:bg-[#0077ed] transition-colors active:scale-[0.98]"
              >
                {tNav('requestAccess')}
              </a>
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden ml-auto flex flex-col gap-[5px] p-2 z-50"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              <span
                className={`block h-[1.5px] w-5 ${menuOpen ? 'bg-[#1d1d1f]' : navBurger} origin-center transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-[6.5px]' : ''
                  }`}
              />
              <span
                className={`block h-[1.5px] w-5 ${menuOpen ? 'bg-[#1d1d1f]' : navBurger} transition-all duration-200 ${menuOpen ? 'opacity-0' : ''
                  }`}
              />
              <span
                className={`block h-[1.5px] w-5 ${menuOpen ? 'bg-[#1d1d1f]' : navBurger} origin-center transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-[6.5px]' : ''
                  }`}
              />
            </button>
          </nav>
        </header>

        {/* ── 2. Hero (dark with background image + integrated trust bar) ── */}
        <section
          className="relative flex flex-col items-start justify-between text-left w-full min-h-[100dvh] px-12 md:px-24 pt-[52px] overflow-hidden"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(15,15,20,0.95) 0%, rgba(15,15,20,0.60) 50%, rgba(15,15,20,0.20) 100%), url('/holilabsv2.jpeg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Hero content — parallax wrapper */}
          <div ref={heroContentRef} className="relative z-10 max-w-3xl pt-24 pb-8 sm:pt-32 sm:pb-12 lg:pt-40 lg:pb-16">
            {/* Eyebrow pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 backdrop-blur-sm px-4 py-[7px] mb-8 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#34c759] flex-shrink-0" aria-hidden="true" />
              <span className="text-[13px] font-medium text-white/70">{t('eyebrow')}</span>
            </div>

            {/* Headline */}
            <h1 className="text-[clamp(40px,7.5vw,76px)] font-semibold tracking-[-0.035em] leading-[1.05] text-white mb-6 whitespace-pre-line">
              {t('headline')}
            </h1>

            {/* Subhead — forced line breaks on lg+, natural wrap on mobile */}
            <p className="text-[clamp(17px,2.2vw,22px)] text-white/55 tracking-[-0.01em] leading-[1.45] mb-10 max-w-[620px] lg:whitespace-pre-line">
              {t('subhead')}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-start gap-4 mb-4">
              <a
                href="#access"
                className="inline-flex items-center rounded-full bg-[#0071e3] text-white text-[17px] font-semibold px-8 py-[14px] hover:bg-[#0077ed] transition-colors shadow-[0_4px_24px_rgba(0,113,227,0.28)] active:scale-[0.98]"
              >
                {t('ctaPrimary')}
              </a>
              <a
                href="/demo"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/25 text-[17px] text-white/80 font-medium px-7 py-[12px] hover:bg-white/10 hover:text-white transition-colors active:scale-[0.98]"
              >
                {t('ctaSecondary')}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </div>

          {/* ── Trust bar (inside hero, dark-themed, seamless) ─────────── */}
          <div className="relative z-10 w-full border-t border-white/[0.08]">
            <div className="max-w-[980px] mx-auto px-5 py-4">
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                {([
                  t('trustLgpd'),
                  t('trustAnvisa'),
                  t('trustDeterministic'),
                  t('trustSpeed'),
                  t('trustPhi'),
                ] as string[]).map((item, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <span className="hidden sm:inline text-white/15 select-none">&middot;</span>
                    )}
                    <span className="text-[12px] font-medium text-white/40 tracking-wide uppercase">{item}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. Feature A — Cross-Reference Engine ──────────────────────── */}
        <section id="how-it-works" className="py-36 px-5">
          <div className="max-w-[980px] mx-auto grid md:grid-cols-2 gap-16 lg:gap-24 items-center">
            {/* Copy */}
            <div ref={featureALeft.ref} style={featureALeft.style}>
              <p className="text-[12px] font-semibold text-[#0071e3] uppercase tracking-[0.1em] mb-6">
                {tA('eyebrow')}
              </p>
              <h2 className="text-[clamp(36px,5vw,52px)] font-semibold tracking-[-0.03em] leading-[1.05] text-[#1d1d1f] mb-6">
                {tA('headline')}
              </h2>
              <p className="text-[19px] text-[#6e6e73] leading-[1.55] tracking-[-0.01em] mb-8">
                {tA('description')}
              </p>
              <a
                href="#"
                className="inline-flex items-center gap-1.5 text-[16px] text-[#0071e3] font-medium hover:text-[#0077ed] transition-colors"
              >
                {tA('link')}
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>

            {/* Engine image with floating tags */}
            <div ref={featureARight.ref} style={featureARight.style}>
              <div className="relative">
                {/* Image wrapper with cropped top and radial fade */}
                <div className="rounded-2xl overflow-hidden ring-1 ring-black/[0.06] shadow-2xl shadow-black/[0.04]">
                  <div className="relative -mt-12">
                    <img
                      src="/cortex-engine.jpeg"
                      alt="Cortex Cross-Reference Engine"
                      className="w-full block"
                    />
                    {/* Radial gradient mask to blend edges */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(255,255,255,0.8) 100%)',
                      }}
                    />
                  </div>
                </div>

                {/* Floating code tags */}
                {[
                  { label: 'ICD-10', cls: 'float-tag-1', pos: 'top-4 left-4' },
                  { label: 'TUSS', cls: 'float-tag-2', pos: 'top-4 right-6' },
                  { label: 'ANVISA', cls: 'float-tag-3', pos: 'top-1/3 -left-2' },
                  { label: 'SNOMED CT', cls: 'float-tag-4', pos: 'top-1/3 -right-2' },
                  { label: 'Dosage Limits', cls: 'float-tag-5', pos: 'bottom-16 left-6' },
                  { label: 'Drug Interactions', cls: 'float-tag-6', pos: 'bottom-8 right-4' },
                ].map((tag) => (
                  <span
                    key={tag.label}
                    className={`absolute ${tag.pos} ${tag.cls} bg-cyan-500/15 border border-cyan-400/30 text-cyan-700 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium shadow-[0_0_12px_rgba(0,200,170,0.15)]`}
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. Feature B — For Physicians (dark) ───────────────────────── */}
        <section
          className="py-36 px-5"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, #2c2c2e 0%, #1d1d1f 60%)' }}
        >
          <div className="max-w-[980px] mx-auto">
            {/* Heading */}
            <div ref={featureBHead.ref} style={featureBHead.style} className="text-center mb-20">
              <p className="text-[12px] font-semibold text-[#0071e3] uppercase tracking-[0.1em] mb-6">
                {tB('eyebrow')}
              </p>
              <h2 className="text-[clamp(36px,5.5vw,60px)] font-semibold tracking-[-0.03em] leading-[1.05] text-white mb-6">
                {tB('headline')}
              </h2>
              <p className="text-[21px] text-[#a1a1a6] leading-[1.5] tracking-[-0.01em] max-w-[560px] mx-auto">
                {tB('description')}
              </p>
            </div>

            {/* Stat cards */}
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                {
                  stat: tB('stat1Value'),
                  label: tB('stat1Label'),
                  sub: tB('stat1Sub'),
                },
                {
                  stat: tB('stat2Value'),
                  label: tB('stat2Label'),
                  sub: tB('stat2Sub'),
                },
                {
                  stat: tB('stat3Value'),
                  label: tB('stat3Label'),
                  sub: tB('stat3Sub'),
                },
              ].map((card, i) => (
                <div key={card.stat} ref={bCards[i]!.ref} style={bCards[i]!.style}>
                  <div className="rounded-2xl bg-[#2c2c2e] p-8 ring-1 ring-white/[0.08] hover:ring-white/[0.14] hover:bg-[#333335] transition-all duration-300">
                    <p className="text-[52px] font-semibold tracking-[-0.03em] text-white leading-none mb-4">
                      {card.stat}
                    </p>
                    <p className="text-[16px] font-semibold text-white mb-2">{card.label}</p>
                    <p className="text-[13px] text-[#a1a1a6] leading-snug">{card.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 6. Feature C — Latin America First ─────────────────────────── */}
        <section className="py-36 px-5">
          <div className="max-w-[980px] mx-auto">
            {/* Heading */}
            <div ref={featureCHead.ref} style={featureCHead.style} className="text-center mb-12">
              <p className="text-[12px] font-semibold text-[#0071e3] uppercase tracking-[0.1em] mb-6">
                {tC('eyebrow')}
              </p>
              <h2 className="text-[clamp(36px,5.5vw,60px)] font-semibold tracking-[-0.03em] leading-[1.05] text-[#1d1d1f] mb-6">
                {tC('headline')}
              </h2>
              <p className="text-[21px] text-[#6e6e73] leading-[1.5] tracking-[-0.01em] max-w-[620px] mx-auto mb-4">
                {tC('description1')}
              </p>
              <p className="text-[17px] text-[#6e6e73] leading-[1.5] tracking-[-0.01em] max-w-[560px] mx-auto mb-8">
                {tC('description2')}
              </p>
              <a
                href="/demo"
                className="inline-flex items-center gap-1.5 text-[16px] text-[#0071e3] font-medium hover:text-[#0077ed] transition-colors"
              >
                {tC('link')}
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>

            {/* Country cards */}
            <div className="grid sm:grid-cols-3 gap-4 mt-16">
              {[
                {
                  country: tC('brazilName'),
                  flag: '🇧🇷',
                  badge: tC('brazilBadge'),
                  desc: tC('brazilDesc'),
                },
                {
                  country: tC('boliviaName'),
                  flag: '🇧🇴',
                  badge: tC('boliviaBadge'),
                  desc: tC('boliviaDesc'),
                },
                {
                  country: tC('argentinaName'),
                  flag: '🇦🇷',
                  badge: tC('argentinaBadge'),
                  desc: tC('argentinaDesc'),
                },
              ].map((c, i) => (
                <div key={c.country} ref={cCards[i]!.ref} style={cCards[i]!.style}>
                  <div className="rounded-2xl bg-[#f5f5f7] p-8 ring-1 ring-black/[0.05] hover:ring-black/[0.10] hover:-translate-y-0.5 transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-[22px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
                        <span className="mr-2" aria-hidden="true">{c.flag}</span>{c.country}
                      </h3>
                      <span className="text-[11px] font-medium text-[#6e6e73] bg-white rounded-full px-2.5 py-1 ring-1 ring-black/[0.06] whitespace-nowrap ml-3 mt-0.5">
                        {c.badge}
                      </span>
                    </div>
                    <p className="text-[15px] text-[#6e6e73] leading-[1.55]">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 7. CTA ───────────────────────────────────────────────────────── */}
        <section id="access" className="bg-black py-36 px-5">
          <div ref={ctaContent.ref} style={ctaContent.style} className="max-w-[700px] mx-auto text-center">
            <h2 className="text-[clamp(36px,5.5vw,60px)] font-semibold tracking-[-0.03em] leading-[1.05] text-white mb-6">
              {tCta('headline')}
            </h2>
            <p className="text-[21px] text-[#a1a1a6] tracking-[-0.01em] mb-12">
              {tCta('subhead')}
            </p>

            {/* Inline email form */}
            {formState === 'success' ? (
              <div className="max-w-[440px] mx-auto mb-6">
                <div className="flex items-center justify-center gap-2 rounded-full bg-[#34c759]/10 border border-[#34c759]/20 px-6 py-4">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" className="text-[#34c759] flex-shrink-0">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-[15px] text-[#34c759] font-medium">{formMsg}</span>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row gap-3 max-w-[440px] mx-auto mb-6"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (formState === 'error') setFormState('idle'); }}
                  placeholder={tCta('placeholder')}
                  required
                  className="flex-1 min-w-0 rounded-full px-5 py-4 bg-white/10 text-white placeholder-[#6e6e73] text-[15px] border border-white/20 focus:outline-none focus:border-white/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={formState === 'loading'}
                  className="rounded-full bg-white text-black text-[15px] font-semibold px-7 py-4 hover:bg-[#f5f5f7] transition-colors whitespace-nowrap active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {formState === 'loading' ? tCta('sending') : tCta('submit')}
                </button>
              </form>
            )}

            {formState === 'error' && (
              <p className="text-[13px] text-red-400 mb-3">{formMsg}</p>
            )}

            <p className="text-[12px] text-[#6e6e73] leading-relaxed">
              {tCta('disclaimer')}
            </p>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <footer className="bg-black border-t border-white/10 px-5 pt-16 pb-10">
          <div className="max-w-[980px] mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
              {/* Brand column */}
              <div className="col-span-2 md:col-span-1">
                <p className="text-[15px] font-semibold text-white tracking-[-0.02em] mb-3">
                  {tFoot('brand')}
                </p>
                <p className="text-[13px] text-[#6e6e73] leading-[1.55]">
                  {tFoot('brandSub')}
                </p>
              </div>
              {/* Link columns */}
              {[
                {
                  heading: tFoot('product'),
                  links: [
                    { label: tNav('howItWorks'), href: '#how-it-works' },
                    { label: tNav('pricing'), href: '/pricing' },
                    { label: tFoot('liveDemo'), href: '/demo' },
                    { label: tNav('forHospitals'), href: '#' },
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
                  <p className="text-[13px] font-semibold text-white mb-4 tracking-[-0.01em]">
                    {col.heading}
                  </p>
                  <ul className="space-y-3">
                    {col.links.map((link) => (
                      <li key={link.label}>
                        <a
                          href={link.href}
                          className="text-[13px] text-[#6e6e73] hover:text-white transition-colors"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-[12px] text-[#6e6e73]">
                {tFoot('copyright')}
              </p>
              <p className="text-[12px] text-[#6e6e73]">
                {tFoot('badges')}
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
