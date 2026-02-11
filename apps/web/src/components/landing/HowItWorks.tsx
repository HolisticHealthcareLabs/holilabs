'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { VerificationWorkflow } from '@/components/landing/VerificationWorkflow';

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6 bg-card border-t border-border">
      <div className="container mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400 mb-4 block">
            How it works
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            The AI pre-fills the safety check. You just sign off.
          </h2>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            Cortex analyzes the chart and drafts the logic. You verify the reasoning in seconds, not minutes.
          </p>
        </motion.div>

        <VerificationWorkflow />

        <div className="mt-14 rounded-[2rem] bg-secondary border border-border p-10">
          <div className="grid md:grid-cols-3 gap-8 items-start">
            <div>
              <div className="text-sm font-semibold text-muted-foreground mb-2">Built for</div>
              <div className="text-2xl font-bold text-foreground">Clinicians</div>
              <p className="mt-2 text-muted-foreground">
                A fast, predictable workflow that reduces risk without turning into alert fatigue.
              </p>
            </div>
            <div>
              <div className="text-sm font-semibold text-muted-foreground mb-2">Built for</div>
              <div className="text-2xl font-bold text-foreground">Quality & leadership</div>
              <p className="mt-2 text-muted-foreground">
                Evidence of what was verified, what was overridden, and where protocols drift in real practice.
              </p>
            </div>
            <div>
              <div className="text-sm font-semibold text-muted-foreground mb-2">Built for</div>
              <div className="text-2xl font-bold text-foreground">LATAM workflows</div>
              <p className="mt-2 text-muted-foreground">
                Works alongside basic EHRs and messaging-first care coordination without waiting for perfect integration.
                Optional lightweight desktop companion for workstation-level rollout.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-10 text-sm text-muted-foreground/80 max-w-4xl">
          Note: Cortex is a verification and documentation layer. Clinicians remain responsible for clinical decisions.
          Patient messaging is opt-in and should be configured to minimize sensitive content.
        </p>
      </div>
    </section>
  );
}

