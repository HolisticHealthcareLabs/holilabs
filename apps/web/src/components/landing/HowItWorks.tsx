'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { VerificationWorkflow } from '@/components/landing/VerificationWorkflow';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLandingCopy } from '@/components/landing/copy';

export function HowItWorks() {
  const { locale } = useLanguage();
  const copy = getLandingCopy(locale);

  return (
    <section id="how-it-works" className="bg-background">
      {/* Header */}
      <div className="max-w-[980px] mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-16 text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-blue-600 dark:text-blue-400 text-sm font-semibold uppercase tracking-widest mb-4"
        >
          {copy.howItWorks.kicker}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-tight mb-6"
        >
          {copy.howItWorks.title}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto"
        >
          {copy.howItWorks.subtitle}
        </motion.p>
      </div>

      {/* Interactive workflow - forced dark container so zinc palette always works */}
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 pb-16">
        <div className="rounded-2xl sm:rounded-3xl bg-zinc-950 p-1">
          <VerificationWorkflow />
        </div>
      </div>

      {/* Built For cards */}
      <div className="bg-secondary/50 dark:bg-white/[0.02]">
        <div className="max-w-[980px] mx-auto px-4 sm:px-6 py-20">
          <div className="grid md:grid-cols-3 gap-px bg-border/50 rounded-2xl overflow-hidden">
            {copy.howItWorks.cards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.08 * index }}
                className="bg-background p-8 sm:p-10"
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                  {copy.howItWorks.builtFor}
                </p>
                <h3 className="text-2xl font-bold text-foreground mb-3">{card.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{card.body}</p>
              </motion.div>
            ))}
          </div>

          <p className="mt-10 text-sm text-muted-foreground/70 max-w-3xl">
            {copy.howItWorks.note}
          </p>
        </div>
      </div>
    </section>
  );
}
