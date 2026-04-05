'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLandingCopy } from '@/lib/i18n/landing';

export function ValueCarousel() {
  const { locale } = useLanguage();
  const copy = getLandingCopy(locale);
  const cards = copy.carousel.cards;

  return (
    <section className="landing-carousel" aria-label="Value propositions">
      <div className="landing-carousel-track">
        {/* Original + duplicate for seamless loop */}
        {[...cards, ...cards].map((card, i) => (
          <div key={`${card.label}-${i}`} className="landing-carousel-card">
            <div className="landing-carousel-card-label">{card.label}</div>
            <p className="landing-carousel-card-desc">{card.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
