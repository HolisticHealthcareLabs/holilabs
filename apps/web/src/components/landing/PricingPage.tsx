'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';

// ─── Fade-in hook (reused from landing page) ─────────────────────────────────
function useFadeIn(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) { setVisible(true); return; }
    const el = ref.current;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          obs.disconnect();
        }
      },
      { threshold: 0.05, rootMargin: '0px 0px 200px 0px' }
    );
    obs.observe(el);
    // Fallback: if not triggered after 1.2s, show anyway (handles SSR, headless, etc.)
    const fallback = setTimeout(() => setVisible(true), 1200 + delay);
    return () => { obs.disconnect(); clearTimeout(fallback); };
  }, [delay]);
  const style: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'none' : 'translateY(28px)',
    transition: 'opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1)',
  };
  return { ref, style };
}

const LOCALE_OPTIONS = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'pt-BR', label: 'PT', name: 'Portugues' },
] as const;

// ─── Check icon ───────────────────────────────────────────────────────────────
function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#34c759] flex-shrink-0 mt-0.5" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Arrow icon ───────────────────────────────────────────────────────────────
function Arrow() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="inline-block">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PricingPage() {
  const t = useTranslations('pricing');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [annual, setAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const navText = scrolled ? 'text-[#1d1d1f]' : 'text-white';
  const navMuted = scrolled ? 'text-[#6e6e73]' : 'text-white/60';
  const navBurger = scrolled ? 'bg-[#1d1d1f]' : 'bg-white';
  const currentLabel = LOCALE_OPTIONS.find((o) => o.code === locale)?.label ?? 'EN';

  const heroFade = useFadeIn(100);
  const tiersFade = useFadeIn(200);
  const faqFade = useFadeIn(100);
  const ctaFade = useFadeIn(100);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
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

  const localePrefix = locale === 'en' ? '' : `/${locale}`;

  // Feature lists from i18n
  const safetyFeatures = t.raw('tiers.safety.features') as string[];
  const completeFeatures = t.raw('tiers.complete.features') as string[];
  const governanceFeatures = t.raw('tiers.governance.features') as string[];
  const faqItems = t.raw('faq.items') as { question: string; answer: string }[];

  return (
    <>
      <div className="bg-white text-[#1d1d1f] font-sans antialiased overflow-x-hidden selection:bg-blue-100 selection:text-blue-900">

        {/* ── Mobile menu overlay ────────────────────────────────────────── */}
        {menuOpen && (
          <div className="fixed inset-0 z-40 bg-white flex flex-col items-center justify-center gap-8">
            {[
              { label: 'Product', href: `${localePrefix}/` },
              { label: 'Pricing', href: `${localePrefix}/pricing` },
              { label: 'Demo', href: '/demo' },
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
              href="/sign-in"
              onClick={() => setMenuOpen(false)}
              className="text-[28px] font-semibold tracking-[-0.02em] text-[#1d1d1f] hover:text-[#0071e3] transition-colors"
            >
              Sign in
            </a>
            <div className="flex gap-3 mt-2">
              {LOCALE_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  onClick={() => { router.replace(pathname, { locale: opt.code }); setMenuOpen(false); }}
                  className={`text-[15px] font-medium px-3 py-1.5 rounded-full transition-colors ${
                    locale === opt.code ? 'bg-[#0071e3] text-white' : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Nav ────────────────────────────────────────────────────────── */}
        <header
          className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
            scrolled
              ? 'bg-white/90 backdrop-blur-xl shadow-[0_1px_0_0_rgba(0,0,0,0.08)]'
              : 'bg-transparent'
          }`}
        >
          <nav className="max-w-[1120px] mx-auto flex items-center justify-between h-[52px] px-5">
            <a href={`${localePrefix}/`} className={`flex-shrink-0 text-[17px] font-semibold tracking-[-0.02em] ${navText} transition-colors duration-300`}>
              Cortex{' '}
              <span className={`${navMuted} font-normal text-[15px] transition-colors duration-300`}>by Holi Labs</span>
            </a>

            <div className="hidden md:flex items-center gap-7">
              {[
                { label: 'Product', href: `${localePrefix}/` },
                { label: 'Pricing', href: `${localePrefix}/pricing` },
                { label: 'Demo', href: '/demo' },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className={`text-[14px] ${item.label === 'Pricing' ? 'text-[#0071e3] font-medium' : `${navText} transition-colors duration-300`} hover:text-[#0071e3]`}
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              {/* Language switcher */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setLangOpen((v) => !v)}
                  className={`flex items-center gap-1 text-[13px] font-medium ${navMuted} transition-colors duration-300 px-2 py-1 rounded-md hover:bg-white/[0.08]`}
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
                        className={`w-full text-left px-3 py-1.5 text-[13px] transition-colors ${
                          locale === opt.code ? 'text-[#0071e3] font-semibold bg-blue-50/60' : 'text-[#1d1d1f] hover:bg-black/[0.04]'
                        }`}
                      >
                        {opt.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <a
                href="/sign-in"
                className={`text-[13px] ${navText} hover:text-[#0071e3] transition-colors duration-300 border ${scrolled ? 'border-black/15 hover:border-[#0071e3]/40' : 'border-white/25 hover:border-white/50'} rounded-full px-4 py-1.5`}
              >
                Sign in
              </a>
              <a
                href={`${localePrefix}/#access`}
                className="inline-flex items-center rounded-full bg-[#0071e3] text-white text-[13px] font-semibold px-5 py-2 hover:bg-[#0077ed] transition-colors active:scale-[0.98]"
              >
                Request access
              </a>
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden flex flex-col gap-[5px] p-2 z-50"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`block h-[1.5px] w-5 ${menuOpen ? 'bg-[#1d1d1f]' : navBurger} origin-center transition-all duration-200 ${
                    i === 0 && menuOpen ? 'rotate-45 translate-y-[6.5px]' :
                    i === 1 && menuOpen ? 'opacity-0' :
                    i === 2 && menuOpen ? '-rotate-45 -translate-y-[6.5px]' : ''
                  }`}
                />
              ))}
            </button>
          </nav>
        </header>

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section
          className="relative flex flex-col items-center justify-center text-center px-5 pt-[52px] pb-16"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, #2c2c2e 0%, #1d1d1f 60%)',
          }}
        >
          <div ref={heroFade.ref} style={heroFade.style} className="relative z-10 max-w-[700px] mx-auto pt-24 pb-4 sm:pt-28">
            <p className="text-[12px] font-semibold text-[#0071e3] uppercase tracking-[0.1em] mb-6">
              {t('hero.eyebrow')}
            </p>
            <h1 className="text-[clamp(36px,6vw,60px)] font-semibold tracking-[-0.035em] leading-[1.05] text-white mb-6">
              {t('hero.headline')}
            </h1>
            <p className="text-[clamp(17px,2vw,21px)] text-[#a1a1a6] tracking-[-0.01em] leading-[1.45] max-w-[520px] mx-auto">
              {t('hero.subhead')}
            </p>
          </div>
        </section>

        {/* ── Pricing Cards ──────────────────────────────────────────────── */}
        <section className="py-20 px-5 -mt-8">
          <div ref={tiersFade.ref} style={tiersFade.style} className="max-w-[1040px] mx-auto">

            {/* Monthly / Annually toggle */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className={`text-[14px] font-medium ${!annual ? 'text-[#1d1d1f]' : 'text-[#6e6e73]'}`}>
                {t('toggle.monthly')}
              </span>
              <button
                onClick={() => setAnnual((v) => !v)}
                className={`relative w-[52px] h-[28px] rounded-full transition-colors duration-200 ${annual ? 'bg-[#0071e3]' : 'bg-[#d1d1d6]'}`}
                aria-label="Toggle billing period"
                role="switch"
                aria-checked={annual}
              >
                <span
                  className={`absolute top-[2px] left-[2px] w-[24px] h-[24px] bg-white rounded-full shadow-sm transition-transform duration-200 ${annual ? 'translate-x-[24px]' : ''}`}
                />
              </button>
              <span className={`text-[14px] font-medium ${annual ? 'text-[#1d1d1f]' : 'text-[#6e6e73]'}`}>
                {t('toggle.annually')}
              </span>
              {annual && (
                <span className="inline-flex items-center rounded-full bg-[#34c759]/10 border border-[#34c759]/20 px-2.5 py-0.5 text-[12px] font-semibold text-[#34c759]">
                  {t('toggle.save')}
                </span>
              )}
            </div>

            {/* Currency disclaimer */}
            <p className="text-center text-[12px] text-[#6e6e73] mb-12">
              {t('currency')}
            </p>

            {/* Tier cards */}
            <div className="grid sm:grid-cols-3 gap-5 items-start">

              {/* Safety */}
              <div className="rounded-2xl bg-[#f5f5f7] p-8 ring-1 ring-black/[0.05] hover:ring-black/[0.10] hover:-translate-y-0.5 transition-all duration-300">
                <h3 className="text-[20px] font-semibold tracking-[-0.02em] text-[#1d1d1f] mb-2">
                  {t('tiers.safety.name')}
                </h3>
                <p className="text-[14px] text-[#6e6e73] leading-[1.5] mb-6">
                  {t('tiers.safety.description')}
                </p>
                <div className="mb-6">
                  <span className="text-[48px] font-semibold tracking-[-0.03em] text-[#1d1d1f] leading-none">
                    {annual ? t('tiers.safety.priceAnnual') : t('tiers.safety.priceMonthly')}
                  </span>
                  <span className="text-[15px] text-[#6e6e73] ml-1">{t('tiers.safety.period')}</span>
                </div>
                {annual && (
                  <p className="text-[12px] text-[#6e6e73] mb-6 -mt-4">billed annually</p>
                )}
                <a
                  href={`${localePrefix}/#access?plan=safety`}
                  className="block text-center rounded-full bg-[#1d1d1f] text-white text-[15px] font-semibold px-6 py-3.5 hover:bg-[#333] transition-colors active:scale-[0.98] mb-8"
                >
                  {t('tiers.safety.cta')}
                </a>
                <ul className="space-y-3">
                  {safetyFeatures.map((f: string) => (
                    <li key={f} className="flex items-start gap-2.5 text-[14px] text-[#1d1d1f] leading-snug">
                      <Check /> {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Complete (featured) */}
              <div className="relative rounded-2xl bg-white p-8 ring-2 ring-[#0071e3] hover:-translate-y-1 transition-all duration-300 shadow-[0_8px_40px_rgba(0,113,227,0.12)]">
                {/* Most popular badge */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span
                    className="inline-flex items-center rounded-full px-4 py-1.5 text-[12px] font-semibold text-white"
                    style={{
                      background: 'linear-gradient(135deg, #0071e3 0%, #00b4d8 50%, #0071e3 100%)',
                      boxShadow: '0 2px 12px rgba(0,113,227,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
                    }}
                  >
                    {t('tiers.complete.badge')}
                  </span>
                </div>
                <h3 className="text-[20px] font-semibold tracking-[-0.02em] text-[#1d1d1f] mb-2 mt-2">
                  {t('tiers.complete.name')}
                </h3>
                <p className="text-[14px] text-[#6e6e73] leading-[1.5] mb-6">
                  {t('tiers.complete.description')}
                </p>
                <div className="mb-6">
                  <span className="text-[48px] font-semibold tracking-[-0.03em] text-[#1d1d1f] leading-none">
                    {annual ? t('tiers.complete.priceAnnual') : t('tiers.complete.priceMonthly')}
                  </span>
                  <span className="text-[15px] text-[#6e6e73] ml-1">{t('tiers.complete.period')}</span>
                </div>
                {annual && (
                  <p className="text-[12px] text-[#6e6e73] mb-6 -mt-4">billed annually</p>
                )}
                <a
                  href={`${localePrefix}/#access?plan=complete`}
                  className="block text-center rounded-full bg-[#0071e3] text-white text-[15px] font-semibold px-6 py-3.5 hover:bg-[#0077ed] transition-colors shadow-[0_4px_16px_rgba(0,113,227,0.25)] active:scale-[0.98] mb-8"
                >
                  {t('tiers.complete.cta')}
                </a>
                <ul className="space-y-3">
                  {completeFeatures.map((f: string) => (
                    <li key={f} className="flex items-start gap-2.5 text-[14px] text-[#1d1d1f] leading-snug">
                      <Check /> {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Governance */}
              <div className="rounded-2xl bg-[#f5f5f7] p-8 ring-1 ring-black/[0.05] hover:ring-black/[0.10] hover:-translate-y-0.5 transition-all duration-300">
                <h3 className="text-[20px] font-semibold tracking-[-0.02em] text-[#1d1d1f] mb-2">
                  {t('tiers.governance.name')}
                </h3>
                <p className="text-[14px] text-[#6e6e73] leading-[1.5] mb-6">
                  {t('tiers.governance.description')}
                </p>
                <div className="mb-6">
                  <span className="text-[48px] font-semibold tracking-[-0.03em] text-[#1d1d1f] leading-none">
                    {t('tiers.governance.price')}
                  </span>
                </div>
                <a
                  href="mailto:sales@holilabs.com?subject=Cortex%20Governance%20inquiry"
                  className="block text-center rounded-full bg-[#1d1d1f] text-white text-[15px] font-semibold px-6 py-3.5 hover:bg-[#333] transition-colors active:scale-[0.98] mb-8"
                >
                  {t('tiers.governance.cta')}
                </a>
                <ul className="space-y-3">
                  {governanceFeatures.map((f: string) => (
                    <li key={f} className="flex items-start gap-2.5 text-[14px] text-[#1d1d1f] leading-snug">
                      <Check /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────────────────────────── */}
        <section className="py-24 px-5">
          <div ref={faqFade.ref} style={faqFade.style} className="max-w-[680px] mx-auto">
            <h2 className="text-[clamp(28px,4vw,40px)] font-semibold tracking-[-0.03em] leading-[1.1] text-[#1d1d1f] text-center mb-14">
              {t('faq.title')}
            </h2>
            <div className="divide-y divide-black/[0.06]">
              {faqItems.map((item: { question: string; answer: string }, i: number) => (
                <div key={i}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between py-5 text-left group"
                    aria-expanded={openFaq === i}
                  >
                    <span className="text-[16px] font-medium text-[#1d1d1f] pr-4 group-hover:text-[#0071e3] transition-colors">
                      {item.question}
                    </span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className={`text-[#6e6e73] flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-45' : ''}`}
                      aria-hidden="true"
                    >
                      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-40 opacity-100 pb-5' : 'max-h-0 opacity-0'}`}
                  >
                    <p className="text-[15px] text-[#6e6e73] leading-[1.55]">
                      {item.answer}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Bottom CTA ─────────────────────────────────────────────────── */}
        <section className="bg-black py-28 px-5">
          <div ref={ctaFade.ref} style={ctaFade.style} className="max-w-[600px] mx-auto text-center">
            <h2 className="text-[clamp(28px,4.5vw,44px)] font-semibold tracking-[-0.03em] leading-[1.1] text-white mb-4">
              {t('cta.headline')}
            </h2>
            <p className="text-[19px] text-[#a1a1a6] tracking-[-0.01em] mb-10">
              {t('cta.subhead')}
            </p>
            <a
              href="/demo"
              className="inline-flex items-center gap-2 rounded-full bg-[#0071e3] text-white text-[17px] font-semibold px-8 py-[14px] hover:bg-[#0077ed] transition-colors shadow-[0_4px_24px_rgba(0,113,227,0.28)] active:scale-[0.98]"
            >
              {t('cta.button')} <Arrow />
            </a>
          </div>
        </section>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <footer className="bg-black border-t border-white/10 px-5 pt-16 pb-10">
          <div className="max-w-[980px] mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
              <div className="col-span-2 md:col-span-1">
                <p className="text-[15px] font-semibold text-white tracking-[-0.02em] mb-3">Cortex</p>
                <p className="text-[13px] text-[#6e6e73] leading-[1.55]">
                  Clinical decision support<br />for Latin America.
                </p>
              </div>
              {[
                {
                  heading: 'Product',
                  links: [
                    { label: 'How it works', href: `${localePrefix}/` },
                    { label: 'Pricing', href: `${localePrefix}/pricing` },
                    { label: 'Live Demo', href: '/demo' },
                    { label: 'Sign in', href: '/sign-in' },
                  ],
                },
                {
                  heading: 'Company',
                  links: [
                    { label: 'About', href: '#' },
                    { label: 'Blog', href: '#' },
                    { label: 'Careers', href: '#' },
                  ],
                },
                {
                  heading: 'Legal',
                  links: [
                    { label: 'Privacy', href: '#' },
                    { label: 'Terms', href: '#' },
                    { label: 'LGPD policy', href: '#' },
                  ],
                },
              ].map((col) => (
                <div key={col.heading}>
                  <p className="text-[13px] font-semibold text-white mb-4 tracking-[-0.01em]">{col.heading}</p>
                  <ul className="space-y-3">
                    {col.links.map((link) => (
                      <li key={link.label}>
                        <a href={link.href} className="text-[13px] text-[#6e6e73] hover:text-white transition-colors">{link.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-[12px] text-[#6e6e73]">Copyright &copy; 2026 Holi Labs. All rights reserved.</p>
              <p className="text-[12px] text-[#6e6e73]">LGPD-native &middot; ANVISA-ready</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
