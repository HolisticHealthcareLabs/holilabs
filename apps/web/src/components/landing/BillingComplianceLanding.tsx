'use client';

import React, { useState, useEffect, useRef } from 'react';

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

export function BillingComplianceLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [email, setEmail] = useState('');

  // ── Parallax refs ──────────────────────────────────────────────────────────
  const heroContentRef = useRef<HTMLDivElement>(null);
  const blob1Ref = useRef<HTMLDivElement>(null);
  const blob2Ref = useRef<HTMLDivElement>(null);
  const blob3Ref = useRef<HTMLDivElement>(null);

  // ── Fade-in hooks (all unconditional) ─────────────────────────────────────
  const featureALeft  = useFadeIn(0);
  const featureARight = useFadeIn(120);
  const featureBHead  = useFadeIn(0);
  const bCard1 = useFadeIn(0);
  const bCard2 = useFadeIn(130);
  const bCard3 = useFadeIn(260);
  const featureCHead  = useFadeIn(0);
  const cCard1 = useFadeIn(0);
  const cCard2 = useFadeIn(130);
  const cCard3 = useFadeIn(260);
  const ctaContent    = useFadeIn(0);

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
        if (blob1Ref.current) {
          blob1Ref.current.style.transform = `translateY(${y * 0.09}px)`;
        }
        if (blob2Ref.current) {
          blob2Ref.current.style.transform = `translateY(${y * 0.17}px)`;
        }
        if (blob3Ref.current) {
          blob3Ref.current.style.transform = `translateY(${y * -0.06}px)`;
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0px,  0px) scale(1);    }
          33%       { transform: translate(32px, -56px) scale(1.1); }
          66%       { transform: translate(-20px, 24px) scale(0.94);}
        }
        .animate-blob           { animation: blob 14s ease-in-out infinite; }
        .animate-blob-delay-2   { animation: blob 14s ease-in-out 2s infinite; }
        .animate-blob-delay-4   { animation: blob 14s ease-in-out 4s infinite; }
      `}</style>

      <div className="bg-white text-[#1d1d1f] font-sans antialiased overflow-x-hidden selection:bg-blue-100 selection:text-blue-900">

        {/* ── Mobile full-screen menu overlay ──────────────────────────────── */}
        {menuOpen && (
          <div className="fixed inset-0 z-40 bg-white flex flex-col items-center justify-center gap-10">
            {(['How it works', 'For hospitals', 'Trust'] as const).map((label) => (
              <a
                key={label}
                href="#"
                onClick={() => setMenuOpen(false)}
                className="text-[28px] font-semibold tracking-[-0.02em] text-[#1d1d1f] hover:text-[#0071e3] transition-colors"
              >
                {label}
              </a>
            ))}
            <a
              href="#access"
              onClick={() => setMenuOpen(false)}
              className="mt-4 inline-flex rounded-full bg-[#0071e3] text-white text-[17px] font-semibold px-9 py-4 hover:bg-[#0077ed] transition-colors active:scale-[0.98]"
            >
              Request access
            </a>
          </div>
        )}

        {/* ── 1. Navigation ──────────────────────────────────────────────── */}
        <header
          className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
            scrolled
              ? 'bg-white/90 backdrop-blur-xl shadow-[0_1px_0_0_rgba(0,0,0,0.08)]'
              : 'bg-transparent'
          }`}
        >
          <nav className="max-w-[980px] mx-auto flex items-center justify-between h-[52px] px-5">
            {/* Logo */}
            <span className="text-[17px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
              Cortex{' '}
              <span className="text-[#6e6e73] font-normal text-[15px]">by Holi Labs</span>
            </span>

            {/* Desktop center links */}
            <div className="hidden md:flex items-center gap-7">
              {(['How it works', 'For hospitals', 'Trust'] as const).map((label) => (
                <a
                  key={label}
                  href="#"
                  className="text-[14px] text-[#1d1d1f] hover:text-[#0071e3] transition-colors"
                >
                  {label}
                </a>
              ))}
            </div>

            {/* Desktop CTA */}
            <a
              href="#access"
              className="hidden md:inline-flex items-center rounded-full bg-[#0071e3] text-white text-[13px] font-semibold px-5 py-2 hover:bg-[#0077ed] transition-colors active:scale-[0.98]"
            >
              Request access
            </a>

            {/* Mobile hamburger */}
            <button
              className="md:hidden flex flex-col gap-[5px] p-2 z-50"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              <span
                className={`block h-[1.5px] w-5 bg-[#1d1d1f] origin-center transition-transform duration-200 ${
                  menuOpen ? 'rotate-45 translate-y-[6.5px]' : ''
                }`}
              />
              <span
                className={`block h-[1.5px] w-5 bg-[#1d1d1f] transition-opacity duration-200 ${
                  menuOpen ? 'opacity-0' : ''
                }`}
              />
              <span
                className={`block h-[1.5px] w-5 bg-[#1d1d1f] origin-center transition-transform duration-200 ${
                  menuOpen ? '-rotate-45 -translate-y-[6.5px]' : ''
                }`}
              />
            </button>
          </nav>
        </header>

        {/* ── 2. Hero ──────────────────────────────────────────────────────── */}
        <section
          className="relative min-h-svh flex flex-col items-center justify-center text-center px-5 pt-[52px] overflow-hidden"
          style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f5f5f7 100%)' }}
        >
          {/* Gradient blobs — outer div is parallax wrapper (no React style), inner keeps keyframe */}
          <div ref={blob1Ref} className="absolute top-1/4 left-1/3" aria-hidden="true">
            <div className="w-[640px] h-[640px] rounded-full bg-[#0071e3] opacity-[0.07] blur-[130px] animate-blob" />
          </div>
          <div ref={blob2Ref} className="absolute top-1/3 right-1/4" aria-hidden="true">
            <div className="w-[520px] h-[520px] rounded-full bg-indigo-500 opacity-[0.06] blur-[110px] animate-blob-delay-2" />
          </div>
          <div ref={blob3Ref} className="absolute bottom-1/4 left-1/4" aria-hidden="true">
            <div className="w-[440px] h-[440px] rounded-full bg-sky-400 opacity-[0.06] blur-[100px] animate-blob-delay-4" />
          </div>

          {/* Hero content — parallax wrapper (no React style prop, direct DOM only) */}
          <div ref={heroContentRef} className="relative z-10 max-w-[760px] mx-auto">
            {/* Eyebrow pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 backdrop-blur-sm px-4 py-[7px] mb-10 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#34c759] flex-shrink-0" aria-hidden="true" />
              <span className="text-[13px] font-medium text-[#6e6e73]">Now in pilot — Bolivia &amp; Brazil</span>
            </div>

            {/* Headline */}
            <h1 className="text-[clamp(52px,9vw,96px)] font-semibold tracking-[-0.03em] leading-[1.01] text-[#1d1d1f] mb-8">
              The safety layer<br />
              medicine was<br />
              missing.
            </h1>

            {/* Subhead */}
            <p className="text-[clamp(18px,2.5vw,24px)] text-[#6e6e73] tracking-[-0.01em] leading-[1.4] mb-12 max-w-[520px] mx-auto">
              Real-time clinical guardrails. Built for Latin America.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#access"
                className="inline-flex items-center rounded-full bg-[#0071e3] text-white text-[17px] font-semibold px-8 py-[14px] hover:bg-[#0077ed] transition-colors shadow-[0_4px_24px_rgba(0,113,227,0.28)] active:scale-[0.98]"
              >
                Request clinical access
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-1.5 text-[17px] text-[#0071e3] font-medium hover:text-[#0077ed] transition-colors active:scale-[0.98]"
              >
                See how it works
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </div>

          {/* Scroll hint line */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2" aria-hidden="true">
            <div className="w-px h-10 bg-gradient-to-b from-transparent to-[#d2d2d7]" />
          </div>
        </section>

        {/* ── 3. Trust bar ─────────────────────────────────────────────────── */}
        <div className="bg-[#f5f5f7] border-y border-black/[0.06]">
          <div className="max-w-[980px] mx-auto px-5 py-5">
            <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
              {[
                '1,587 tests passing',
                '14,200+ validations',
                'LGPD-native',
                'ANVISA-ready',
                '<90s median review',
              ].map((item, i) => (
                <React.Fragment key={item}>
                  {i > 0 && (
                    <span className="hidden sm:inline text-[#d2d2d7] select-none">·</span>
                  )}
                  <span className="text-[13px] font-medium text-[#6e6e73]">{item}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* ── 4. Feature A ─────────────────────────────────────────────────── */}
        <section id="how-it-works" className="py-36 px-5">
          <div className="max-w-[980px] mx-auto grid md:grid-cols-2 gap-16 lg:gap-24 items-center">
            {/* Copy — fade-in outer wrapper */}
            <div ref={featureALeft.ref} style={featureALeft.style}>
              <p className="text-[12px] font-semibold text-[#0071e3] uppercase tracking-[0.1em] mb-6">
                Clinical Intelligence
              </p>
              <h2 className="text-[clamp(36px,5vw,52px)] font-semibold tracking-[-0.03em] leading-[1.05] text-[#1d1d1f] mb-6">
                One look.<br />Everything you need.
              </h2>
              <p className="text-[19px] text-[#6e6e73] leading-[1.55] tracking-[-0.01em] mb-8">
                Cortex reads the chart, surfaces what matters, and flags what doesn&apos;t add up
                — before the order is placed.
              </p>
              <a
                href="#"
                className="inline-flex items-center gap-1.5 text-[16px] text-[#0071e3] font-medium hover:text-[#0077ed] transition-colors"
              >
                Learn more
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>

            {/* Signal card — fade-in outer, hover lift on inner (avoids transform conflict) */}
            <div ref={featureARight.ref} style={featureARight.style}>
              <div className="rounded-2xl bg-[#f5f5f7] p-7 ring-1 ring-black/[0.06] shadow-2xl shadow-black/[0.04] hover:shadow-[0_32px_64px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-500">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-[13px] font-semibold text-[#1d1d1f] tracking-[-0.01em]">
                    Clinical Signal
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#6e6e73]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#34c759]" aria-hidden="true" />
                    Live
                  </span>
                </div>
                <div className="space-y-2.5">
                  {[
                    {
                      label: 'ICD-10 match',
                      color: 'bg-[#34c759]',
                      msg: 'J18.9 — Pneumonia, unspecified',
                    },
                    {
                      label: 'Drug interaction',
                      color: 'bg-[#ff9f0a]',
                      msg: 'Azithromycin × warfarin — review',
                    },
                    {
                      label: 'Dosage check',
                      color: 'bg-[#34c759]',
                      msg: 'Within therapeutic range',
                    },
                    {
                      label: 'TUSS billing code',
                      color: 'bg-[#ff3b30]',
                      msg: 'Code mismatch — 40308052 expected',
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-start gap-3 rounded-xl bg-white p-3.5 ring-1 ring-black/[0.05]"
                    >
                      <span className={`mt-[3px] h-2 w-2 rounded-full flex-shrink-0 ${row.color}`} aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[#1d1d1f] leading-none mb-1">
                          {row.label}
                        </p>
                        <p className="text-[12px] text-[#6e6e73] leading-snug truncate">{row.msg}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 pt-5 border-t border-black/[0.06] flex items-center justify-between">
                  <span className="text-[12px] text-[#6e6e73]">Reviewed in</span>
                  <span className="text-[13px] font-semibold text-[#1d1d1f]">47 seconds</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. Feature B (dark) ──────────────────────────────────────────── */}
        <section
          className="py-36 px-5"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, #2c2c2e 0%, #1d1d1f 60%)' }}
        >
          <div className="max-w-[980px] mx-auto">
            {/* Heading — fade-in */}
            <div ref={featureBHead.ref} style={featureBHead.style} className="text-center mb-20">
              <p className="text-[12px] font-semibold text-[#0071e3] uppercase tracking-[0.1em] mb-6">
                Physician Experience
              </p>
              <h2 className="text-[clamp(36px,5.5vw,60px)] font-semibold tracking-[-0.03em] leading-[1.05] text-white mb-6">
                No extra clicks.<br />No extra time.
              </h2>
              <p className="text-[21px] text-[#a1a1a6] leading-[1.5] tracking-[-0.01em] max-w-[560px] mx-auto">
                Physicians validate in under 90 seconds. The system learns from every decision.
                The guardrail gets sharper.
              </p>
            </div>

            {/* Stat cards — staggered fade-in, hover ring + bg (no transform, no conflict) */}
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                {
                  stat: '< 90s',
                  label: 'Median physician review',
                  sub: 'From chart open to order confirmation',
                },
                {
                  stat: '0 PHI',
                  label: 'Data moved off-device',
                  sub: 'All processing runs on-premise',
                },
                {
                  stat: '24/7',
                  label: 'Audit trail coverage',
                  sub: 'Every decision logged and timestamped',
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

        {/* ── 6. Feature C ─────────────────────────────────────────────────── */}
        <section className="py-36 px-5">
          <div className="max-w-[980px] mx-auto">
            {/* Heading — fade-in */}
            <div ref={featureCHead.ref} style={featureCHead.style} className="text-center mb-20">
              <p className="text-[12px] font-semibold text-[#0071e3] uppercase tracking-[0.1em] mb-6">
                Geography
              </p>
              <h2 className="text-[clamp(36px,5.5vw,60px)] font-semibold tracking-[-0.03em] leading-[1.05] text-[#1d1d1f] mb-6">
                Built for where medicine<br />actually happens.
              </h2>
              <p className="text-[21px] text-[#6e6e73] leading-[1.5] tracking-[-0.01em] max-w-[560px] mx-auto">
                WhatsApp-first. Portuguese and Spanish. LGPD by default.
                No 18-month EHR integration.
              </p>
            </div>

            {/* Country cards — staggered fade-in outer, hover lift on inner (avoids transform conflict) */}
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                {
                  country: 'Brazil',
                  badge: 'Pilot active',
                  desc: 'LGPD-compliant, TUSS billing codes, ANVISA drug registry, and a Portuguese-first interface.',
                },
                {
                  country: 'Bolivia',
                  badge: 'Pilot active',
                  desc: 'Spanish-language workflows with Ministry of Health data standards and local formulary coverage.',
                },
                {
                  country: 'Argentina',
                  badge: 'Coming 2026',
                  desc: 'SNOMED CT mapping, provincial formulary integration, and IOMA billing code support.',
                },
              ].map((c, i) => (
                <div key={c.country} ref={cCards[i]!.ref} style={cCards[i]!.style}>
                  <div className="rounded-2xl bg-[#f5f5f7] p-8 ring-1 ring-black/[0.05] hover:ring-black/[0.10] hover:-translate-y-0.5 transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-[22px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
                        {c.country}
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
              Medicine is high-stakes.<br />Your tools should be too.
            </h2>
            <p className="text-[21px] text-[#a1a1a6] tracking-[-0.01em] mb-12">
              Request early clinical access.
            </p>

            {/* Inline email form */}
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex flex-col sm:flex-row gap-3 max-w-[440px] mx-auto mb-6"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@hospital.com"
                className="flex-1 min-w-0 rounded-full px-5 py-4 bg-white/10 text-white placeholder-[#6e6e73] text-[15px] border border-white/20 focus:outline-none focus:border-white/50 transition-colors"
              />
              <button
                type="submit"
                className="rounded-full bg-white text-black text-[15px] font-semibold px-7 py-4 hover:bg-[#f5f5f7] transition-colors whitespace-nowrap active:scale-[0.98]"
              >
                Request access
              </button>
            </form>

            <p className="text-[12px] text-[#6e6e73] leading-relaxed">
              HIPAA-aligned. LGPD-native. We never store PHI on form submit.
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
                  Cortex
                </p>
                <p className="text-[13px] text-[#6e6e73] leading-[1.55]">
                  Clinical decision support<br />for Latin America.
                </p>
              </div>
              {/* Link columns */}
              {[
                {
                  heading: 'Product',
                  links: ['How it works', 'For hospitals', 'Security', 'Changelog'],
                },
                {
                  heading: 'Company',
                  links: ['About', 'Blog', 'Careers', 'Press'],
                },
                {
                  heading: 'Legal',
                  links: ['Privacy', 'Terms', 'HIPAA policy', 'LGPD policy'],
                },
              ].map((col) => (
                <div key={col.heading}>
                  <p className="text-[13px] font-semibold text-white mb-4 tracking-[-0.01em]">
                    {col.heading}
                  </p>
                  <ul className="space-y-3">
                    {col.links.map((link) => (
                      <li key={link}>
                        <a
                          href="#"
                          className="text-[13px] text-[#6e6e73] hover:text-white transition-colors"
                        >
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-[12px] text-[#6e6e73]">
                Copyright © 2026 Holi Labs. All rights reserved.
              </p>
              <p className="text-[12px] text-[#6e6e73]">
                HIPAA-aligned · LGPD-native · ANVISA-ready
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
