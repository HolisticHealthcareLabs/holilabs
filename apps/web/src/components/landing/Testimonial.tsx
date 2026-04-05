'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLandingCopy } from '@/lib/i18n/landing';
import { Reveal } from './Reveal';

export function Testimonial() {
  const { locale } = useLanguage();
  const copy = getLandingCopy(locale);

  return (
    <section className="landing-testimonial">
      <Reveal>
        <blockquote>{copy.testimonial.quote}</blockquote>
      </Reveal>
      <Reveal delay={0.15}>
        <p className="landing-testimonial-author">{copy.testimonial.author}</p>
        <p className="landing-testimonial-role">{copy.testimonial.role}</p>
      </Reveal>
    </section>
  );
}
