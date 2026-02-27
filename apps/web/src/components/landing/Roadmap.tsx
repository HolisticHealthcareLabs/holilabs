'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLandingCopy } from '@/components/landing/copy';

export function Roadmap() {
  const { locale } = useLanguage();
  const copy = getLandingCopy(locale);

  return (
    <section id="roadmap" className="bg-black text-white">
      {/* Header */}
      <div className="max-w-[980px] mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-16 text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-4"
        >
          {copy.roadmap.kicker}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6"
        >
          {copy.roadmap.title}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-lg sm:text-xl text-white/60 leading-relaxed max-w-3xl mx-auto"
        >
          {copy.roadmap.subtitle}
        </motion.p>
      </div>

      {/* Phase cards - horizontal scroll on mobile, grid on desktop */}
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 pb-24 sm:pb-32">
        <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-visible md:pb-0 scrollbar-hide">
          {copy.roadmap.phases.map((phase, index) => {
            const isLive = index === 0;

            return (
              <motion.div
                key={phase.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
                className="snap-center shrink-0 w-[85vw] sm:w-[340px] md:w-auto"
              >
                <div className={`h-full rounded-2xl border p-7 flex flex-col ${
                  isLive
                    ? 'bg-white/[0.06] border-emerald-500/30'
                    : 'bg-white/[0.03] border-white/[0.08]'
                }`}>
                  {/* Badge + Timeline */}
                  <div className="flex items-center justify-between mb-5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide ${
                      isLive
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : index === 1
                          ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                          : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                    }`}>
                      {isLive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                      {phase.badge}
                    </span>
                    <span className="text-xs text-white/40 font-medium">{phase.timeline}</span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold mb-3">{phase.title}</h3>

                  {/* Challenge */}
                  <p className="text-white/40 text-sm leading-relaxed mb-6 italic">
                    &ldquo;{phase.challenge}&rdquo;
                  </p>

                  {/* Features */}
                  <ul className="space-y-3 mt-auto">
                    {phase.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm text-white/70">
                        <svg className={`w-4 h-4 mt-0.5 shrink-0 ${
                          isLive ? 'text-emerald-400' : index === 1 ? 'text-blue-400' : 'text-purple-400'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
