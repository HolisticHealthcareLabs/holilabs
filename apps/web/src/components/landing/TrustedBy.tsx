'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLandingCopy } from '@/lib/i18n/landing';
import { Reveal } from './Reveal';

export function TrustedBy() {
  const { locale } = useLanguage();
  const copy = getLandingCopy(locale);

  return (
    <section className="landing-trusted">
      <Reveal>
        <p className="landing-tag" style={{ marginBottom: '24px' }}>{copy.trustedBy.tag}</p>
      </Reveal>
      <Reveal delay={0.15}>
        <h2 className="landing-heading landing-heading-lg" style={{ maxWidth: '700px', margin: '0 auto' }}>
          {copy.trustedBy.heading}
        </h2>
      </Reveal>
    </section>
  );
}
