'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLandingCopy } from '@/lib/i18n/landing';
import { Reveal } from './Reveal';

export function BenefitCards() {
  const { locale } = useLanguage();
  const copy = getLandingCopy(locale);

  return (
    <section id="benefits" className="landing-benefits">
      {copy.benefits.items.map((item, i) => (
        <Reveal key={item.number} delay={i * 0.15}>
          <div className="landing-benefit-card">
            <div className="landing-benefit-number">{item.number}</div>
            <div>
              <h3 className="landing-benefit-title">{item.title}</h3>
              <p className="landing-benefit-desc">{item.description}</p>
            </div>
          </div>
        </Reveal>
      ))}
    </section>
  );
}
