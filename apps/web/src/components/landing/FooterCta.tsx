'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLandingCopy } from '@/lib/i18n/landing';
import { Reveal } from './Reveal';

export function FooterCta() {
  const { locale } = useLanguage();
  const copy = getLandingCopy(locale);

  return (
    <section className="landing-footer-cta">
      <Reveal>
        <h2 className="landing-footer-cta-heading">{copy.footerCta.heading}</h2>
      </Reveal>
      <Reveal delay={0.15}>
        <a href="#contact" className="landing-cta-pill">{copy.footerCta.cta}</a>
      </Reveal>
    </section>
  );
}
