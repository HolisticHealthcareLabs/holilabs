'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLandingCopy } from '@/lib/i18n/landing';
import { Reveal } from './Reveal';

export function HowItWorksNew() {
  const { locale } = useLanguage();
  const copy = getLandingCopy(locale);

  return (
    <section className="landing-how-it-works">
      <Reveal>
        <p className="landing-tag">{copy.howItWorks.tag}</p>
      </Reveal>
      <Reveal delay={0.15}>
        <h2 className="landing-heading landing-heading-lg landing-how-heading">
          {copy.howItWorks.heading}
        </h2>
      </Reveal>
      <Reveal delay={0.3}>
        <a href="#contact" className="landing-cta-outline">{copy.howItWorks.cta}</a>
      </Reveal>
    </section>
  );
}
