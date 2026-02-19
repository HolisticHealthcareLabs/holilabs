'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, BarChart3, Activity } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLandingCopy } from '@/components/landing/copy';

const icons = [Shield, BarChart3, Activity];

export function Architecture() {
  const { locale } = useLanguage();
  const copy = getLandingCopy(locale);

  return (
    <section id="modules" className="bg-black text-white">
      {/* Section header */}
      <div className="max-w-[980px] mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-16 text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-4"
        >
          {copy.architecture.kicker}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6"
        >
          {copy.architecture.title}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-lg sm:text-xl text-white/60 leading-relaxed max-w-3xl mx-auto"
        >
          {copy.architecture.subtitle}
        </motion.p>
      </div>

      {/* Three module cards */}
      <div className="max-w-[980px] mx-auto px-4 sm:px-6 pb-24 sm:pb-32">
        <div className="grid md:grid-cols-3 gap-6">
          {copy.architecture.cards.map((card, index) => {
            const Icon = icons[index] ?? Activity;

            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
                className="group"
              >
                <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-8 h-full hover:bg-white/[0.07] transition-colors duration-300">
                  {/* Icon */}
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-6">
                    <Icon className="w-7 h-7 text-white" strokeWidth={1.5} />
                  </div>

                  <h3 className="text-xl font-bold mb-3">{card.title}</h3>
                  <p className="text-white/50 leading-relaxed mb-6 text-[15px]">{card.body}</p>

                  {/* Chips */}
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-medium text-blue-300">
                      {card.chipA}
                    </span>
                    <span className="inline-flex rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-300">
                      {card.chipB}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
