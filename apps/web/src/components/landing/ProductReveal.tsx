'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLandingCopy } from '@/lib/i18n/landing';
import { Reveal } from './Reveal';

export function ProductReveal() {
  const { locale } = useLanguage();
  const copy = getLandingCopy(locale);

  return (
    <section id="product" className="landing-product-reveal">
      <Reveal>
        <p className="landing-product-pre">{copy.productReveal.pre}</p>
      </Reveal>
      <Reveal delay={0.15}>
        <h2 className="landing-heading landing-heading-xl landing-gradient-text">
          {copy.productReveal.main}
        </h2>
      </Reveal>
    </section>
  );
}
