'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { IntroAnimation } from '@/components/IntroAnimation';
import { useTheme } from '@/hooks/useTheme';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Architecture } from '@/components/landing/Architecture';
import { Governance } from '@/components/landing/Governance';
import { HighStakes } from '@/components/landing/HighStakes';
import { DemoRequest } from '@/components/landing/DemoRequest';
import { Footer } from '@/components/landing/Footer';

export default function Home() {
  const [showIntro, setShowIntro] = useState(false);
  useTheme();

  return (
    <>
      {showIntro && <IntroAnimation onComplete={() => setShowIntro(false)} duration={1500} />}

      <div className="min-h-screen font-sans tracking-tight text-foreground transition-colors duration-300 overflow-x-hidden selection:bg-blue-500/30">
        <LandingHeader />

        <main>
          <Hero />
          <HowItWorks />
          <Architecture />
          <Governance />
          <HighStakes />
          <DemoRequest />
        </main>

        <Footer />
      </div>
    </>
  );
}
