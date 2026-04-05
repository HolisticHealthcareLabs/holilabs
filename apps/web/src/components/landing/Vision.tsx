'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLandingCopy } from '@/lib/i18n/landing';
import { Reveal } from './Reveal';

export function Vision() {
  const { locale } = useLanguage();
  const copy = getLandingCopy(locale);

  return (
    <section id="vision" className="landing-vision">
      <Reveal>
        <p className="landing-heading" style={{ color: 'var(--landing-text)', fontWeight: 400 }}>
          {copy.vision.before}
          <span className="highlight">{copy.vision.highlight}</span>
          {copy.vision.after}
        </p>
      </Reveal>
    </section>
  );
}
