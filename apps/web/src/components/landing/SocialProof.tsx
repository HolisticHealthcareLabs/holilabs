'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLandingCopy } from '@/lib/i18n/landing';
import { Reveal } from './Reveal';

export function SocialProof() {
  const { locale } = useLanguage();
  const copy = getLandingCopy(locale);

  return (
    <section className="landing-social-proof">
      <Reveal>
        <p className="landing-tag" style={{ marginBottom: '24px' }}>{copy.socialProof.tag}</p>
      </Reveal>
      <Reveal delay={0.15}>
        <h2 className="landing-heading landing-heading-lg" style={{ maxWidth: '800px', margin: '0 auto' }}>
          {copy.socialProof.heading}
        </h2>
      </Reveal>
      <Reveal delay={0.3}>
        <p className="landing-social-proof-sub">{copy.socialProof.subheading}</p>
      </Reveal>
    </section>
  );
}
