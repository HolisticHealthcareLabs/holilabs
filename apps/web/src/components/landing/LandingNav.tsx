'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLandingCopy } from '@/lib/i18n/landing';
import type { Locale } from '@/i18n/shared';

const LANGS: Locale[] = ['en', 'es', 'pt'];

export function LandingNav() {
  const { locale, setLocale } = useLanguage();
  const copy = getLandingCopy(locale);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="landing-nav" role="navigation" aria-label="Main navigation">
      <div className="landing-nav-inner">
        <Link href="/" className="landing-footer-logo" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Image
            src="/logos/holilabs-helix-blue-dark.svg"
            alt="Holi Labs"
            width={28}
            height={28}
            priority
          />
          <span>Holi Labs</span>
        </Link>

        <div className="landing-nav-links">
          <a href="#vision" className="landing-nav-link">{copy.nav.vision}</a>
          <a href="#product" className="landing-nav-link">{copy.nav.product}</a>
          <a href="#benefits" className="landing-nav-link">{copy.nav.benefits}</a>
          <a href="#contact" className="landing-nav-link">{copy.nav.contact}</a>
        </div>

        <div className="landing-nav-right">
          <div style={{ display: 'flex', gap: '4px' }}>
            {LANGS.map((lang) => (
              <button
                key={lang}
                className={`landing-lang-btn ${locale === lang ? 'active' : ''}`}
                onClick={() => setLocale(lang)}
                aria-label={`Switch to ${lang.toUpperCase()}`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
          <a href="#contact" className="landing-cta-pill desktop-only">{copy.nav.requestDemo}</a>

          <button
            className="landing-nav-hamburger"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              {mobileOpen ? (
                <>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="6" y1="18" x2="18" y2="6" />
                </>
              ) : (
                <>
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      <div className={`landing-nav-mobile ${mobileOpen ? 'open' : ''}`}>
        <a href="#vision" className="landing-nav-link" onClick={() => setMobileOpen(false)}>{copy.nav.vision}</a>
        <a href="#product" className="landing-nav-link" onClick={() => setMobileOpen(false)}>{copy.nav.product}</a>
        <a href="#benefits" className="landing-nav-link" onClick={() => setMobileOpen(false)}>{copy.nav.benefits}</a>
        <a href="#contact" className="landing-nav-link" onClick={() => setMobileOpen(false)}>{copy.nav.contact}</a>
        <a href="#contact" className="landing-cta-pill" onClick={() => setMobileOpen(false)} style={{ textAlign: 'center' }}>{copy.nav.requestDemo}</a>
      </div>
    </nav>
  );
}
