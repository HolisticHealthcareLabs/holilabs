'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLandingCopy } from '@/components/landing/copy';

export function HighStakes() {
  const { locale } = useLanguage();
  const copy = getLandingCopy(locale);

  return (
    <section id="security" className="relative overflow-hidden">
      {/* Clinical-trust gradient: deep blue to teal (not consumer purple) */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900 via-indigo-900 to-teal-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center_bottom,rgba(255,255,255,0.08),transparent_70%)]" />

      <div className="relative max-w-[980px] mx-auto px-4 sm:px-6 py-24 sm:py-32">
        {/* Left-aligned header for rhythm variation */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16 max-w-2xl"
        >
          <p className="text-blue-300/70 text-sm font-semibold uppercase tracking-widest mb-4">
            {copy.safety.kicker}
          </p>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight">
            {copy.safety.title}
          </h2>
        </motion.div>

        {/* Three feature cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {copy.safety.cards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
              className="rounded-2xl bg-white/[0.07] backdrop-blur-sm border border-white/[0.08] p-8 hover:bg-white/[0.11] transition-colors duration-300"
            >
              <h3 className="text-xl font-bold text-white mb-3">{card.title}</h3>
              <p className="text-white/50 leading-relaxed mb-6 text-[15px]">{card.body}</p>

              <ul className="space-y-3">
                <li className="flex items-start gap-2.5 text-sm text-white/70">
                  <svg className="w-4 h-4 mt-0.5 text-teal-400/70 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{card.bulletA}</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-white/70">
                  <svg className="w-4 h-4 mt-0.5 text-teal-400/70 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{card.bulletB}</span>
                </li>
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
