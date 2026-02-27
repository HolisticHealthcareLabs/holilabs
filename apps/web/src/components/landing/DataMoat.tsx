'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLandingCopy } from '@/components/landing/copy';

export function DataMoat() {
  const { locale } = useLanguage();
  const copy = getLandingCopy(locale);

  return (
    <section className="relative overflow-hidden">
      {/* Clinical trust gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900 via-indigo-900 to-teal-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center_top,rgba(255,255,255,0.06),transparent_70%)]" />

      <div className="relative max-w-[980px] mx-auto px-4 sm:px-6 py-24 sm:py-32">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <p className="text-teal-300/70 text-sm font-semibold uppercase tracking-widest mb-4">
            {copy.dataMoat.kicker}
          </p>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight mb-6 max-w-3xl mx-auto">
            {copy.dataMoat.title}
          </h2>
          <p className="text-lg sm:text-xl text-white/50 leading-relaxed max-w-3xl mx-auto">
            {copy.dataMoat.subtitle}
          </p>
        </motion.div>

        {/* Three moat cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {copy.dataMoat.cards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
              className="rounded-2xl bg-white/[0.07] backdrop-blur-sm border border-white/[0.08] p-7 hover:bg-white/[0.11] transition-colors duration-300 flex flex-col"
            >
              {/* Metric badge */}
              <div className="mb-5">
                <span className="inline-flex px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-xs font-bold text-teal-300 tracking-wide">
                  {card.metric}
                </span>
              </div>

              <h3 className="text-xl font-bold text-white mb-3">{card.title}</h3>
              <p className="text-white/50 leading-relaxed text-[15px] flex-1">{card.body}</p>
            </motion.div>
          ))}
        </div>

        {/* Flywheel statement */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/[0.06] border border-white/[0.1]">
            <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-sm font-semibold text-white/80">{copy.dataMoat.flywheel}</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
