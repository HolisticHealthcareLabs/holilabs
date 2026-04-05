'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLandingCopy } from '@/lib/i18n/landing';
import { Reveal } from './Reveal';

export function Hero() {
  const { locale } = useLanguage();
  const copy = getLandingCopy(locale);

  return (
    <section className="landing-hero">
      <Reveal>
        <h1 className="landing-heading landing-heading-hero" style={{ maxWidth: '900px' }}>
          {copy.hero.line1}
        </h1>
      </Reveal>
      <Reveal delay={0.2}>
        <h1
          className="landing-heading landing-heading-hero landing-accent"
          style={{ maxWidth: '900px', marginTop: '8px' }}
        >
          {copy.hero.line2}
        </h1>
      </Reveal>

      <div className="landing-scroll-indicator">
        <div className="landing-scroll-line" />
        <div className="landing-scroll-dot" />
        <span className="landing-scroll-label">{copy.hero.scrollLabel}</span>
      </div>
    </section>
  );
}
