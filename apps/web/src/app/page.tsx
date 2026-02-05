'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { IntroAnimation } from '@/components/IntroAnimation';
import { useTheme } from '@/hooks/useTheme';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { Hero } from '@/components/landing/Hero';
import { ParadigmShift } from '@/components/landing/ParadigmShift';
import { Architecture } from '@/components/landing/Architecture';
import { CoPilot } from '@/components/landing/CoPilot';
import { Governance } from '@/components/landing/Governance';
import { HighStakes } from '@/components/landing/HighStakes';
import { DemoRequest } from '@/components/landing/DemoRequest';
import { Footer } from '@/components/landing/Footer';

export default function Home() {
  const [showIntro, setShowIntro] = useState(false);
  // Theme hook is used for side-effects (applying class to document)
  useTheme();

  return (
    <>
      {showIntro && <IntroAnimation onComplete={() => setShowIntro(false)} duration={1500} />}

      {/* Background & Theme Wrapper */}
      <div className="min-h-screen font-sans tracking-tight text-foreground transition-colors duration-300 overflow-x-hidden selection:bg-blue-500/30 bg-background">

        {/* Subtle grid pattern */}
        <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }} />
        </div>

        <LandingHeader />

        <main className="relative z-10">
          <Hero />
          <ParadigmShift />
          <Architecture />
          <CoPilot />
          <Governance />
          <HighStakes />
          <DemoRequest />
        </main>

        <Footer />
      </div>
    </>
  );
}