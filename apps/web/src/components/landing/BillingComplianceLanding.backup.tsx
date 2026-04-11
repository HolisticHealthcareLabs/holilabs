'use client';

import React from 'react';
import './landing.css';
import { LandingNav } from './LandingNav';
import { Hero } from './Hero';
import { Vision } from './Vision';
import { ValueCarousel } from './ValueCarousel';
import { ProductReveal } from './ProductReveal';
import { BenefitCards } from './BenefitCards';
import { SocialProof } from './SocialProof';
import { Testimonial } from './Testimonial';
import { TrustedBy } from './TrustedBy';
import { HowItWorksNew } from './HowItWorksNew';
import { ContactSection } from './ContactSection';
import { FooterCta } from './FooterCta';
import { LandingFooter } from './LandingFooter';

export function BillingComplianceLanding() {
  return (
    <div className="landing-page">
      <div className="landing-grid-bg" aria-hidden="true" />

      <LandingNav />

      <main>
        <Hero />
        <Vision />
        <ValueCarousel />
        <ProductReveal />
        <BenefitCards />
        <SocialProof />
        <Testimonial />
        <TrustedBy />
        <HowItWorksNew />
        <ContactSection />
        <FooterCta />
      </main>

      <LandingFooter />
    </div>
  );
}
