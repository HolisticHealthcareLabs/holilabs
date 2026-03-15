'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLandingCopy } from '@/components/landing/copy';

const ICONS = {
  ownership: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  ),
  export: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  consent: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  erasure: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  history: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  access: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
};

const ICON_KEYS = ['ownership', 'export', 'consent', 'erasure', 'history', 'access'] as const;
type IconKey = typeof ICON_KEYS[number];

export function PatientDataRights() {
  const { locale } = useLanguage();
  const copy = getLandingCopy(locale);
  const c = copy.patientDataRights;

  return (
    <section className="relative overflow-hidden bg-gray-950">
      {/* Subtle green-teal gradient to signal "patient trust" distinct from clinical blue */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-emerald-950/30 to-gray-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_50%,rgba(16,185,129,0.06),transparent)]" />

      <div className="relative max-w-[980px] mx-auto px-4 sm:px-6 py-24 sm:py-32">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          {/* Patient-facing badge — deliberately different shade from provider sections */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <p className="text-emerald-300/80 text-xs font-semibold uppercase tracking-widest">
              {c.kicker}
            </p>
          </div>

          <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-6 max-w-3xl mx-auto">
            {c.title}
          </h2>
          <p className="text-lg text-white/50 leading-relaxed max-w-2xl mx-auto">
            {c.subtitle}
          </p>
        </motion.div>

        {/* Rights grid — 6 cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
          {c.rights.map((right, i) => (
            <motion.div
              key={right.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.07 * i }}
              className="group rounded-2xl bg-white/[0.04] border border-white/[0.07] p-6 hover:bg-white/[0.07] hover:border-emerald-500/20 transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-emerald-400 mb-4 group-hover:bg-emerald-500/15 transition-colors duration-300">
                {ICONS[ICON_KEYS[i] as IconKey]}
              </div>
              <h3 className="text-[17px] font-semibold text-white mb-2">{right.title}</h3>
              <p className="text-white/45 text-sm leading-relaxed">{right.body}</p>
            </motion.div>
          ))}
        </div>

        {/* Law compliance strip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="rounded-2xl bg-white/[0.04] border border-white/[0.07] p-8 text-center mb-8"
        >
          <p className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-5">
            {c.lawBadgeLabel}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {c.laws.map((law) => (
              <span
                key={law}
                className="px-4 py-1.5 rounded-full bg-emerald-500/8 border border-emerald-500/15 text-[13px] font-medium text-emerald-300/80"
              >
                {law}
              </span>
            ))}
          </div>
          <p className="mt-5 text-white/35 text-sm max-w-xl mx-auto">{c.lawNote}</p>
        </motion.div>

        {/* ── DATA FOR GOOD ─────────────────────────────────────────────────── */}

        {/* Manifesto — founding belief */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-2xl overflow-hidden mb-8"
        >
          {/* Background: deep violet gradient to signal a shift in register — from rights to purpose */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-950/80 via-indigo-950/60 to-emerald-950/40" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_20%_50%,rgba(167,139,250,0.08),transparent)]" />

          <div className="relative px-8 py-10 sm:px-12 sm:py-12">
            {/* Opening quote mark */}
            <div className="text-violet-400/30 text-8xl font-serif leading-none mb-2 select-none" aria-hidden="true">"</div>

            <blockquote className="text-2xl sm:text-3xl font-semibold text-white leading-snug max-w-3xl mb-6">
              {c.manifesto.quote}
            </blockquote>

            <p className="text-white/50 text-base leading-relaxed max-w-2xl">
              {c.manifesto.body}
            </p>
          </div>
        </motion.div>

        {/* Research participation + Future generations — side by side on desktop */}
        <div className="grid sm:grid-cols-2 gap-5 mb-8">

          {/* Research participation card */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl bg-white/[0.04] border border-white/[0.07] p-7 flex flex-col"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/15 flex items-center justify-center text-violet-400 flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-[17px] font-semibold text-white">{c.research.title}</h3>
            </div>

            <p className="text-white/45 text-sm leading-relaxed mb-6 flex-1">
              {c.research.body}
            </p>

            {/* Simulated opt-in toggle — purely decorative, signals the UX concept */}
            <div className="rounded-xl bg-white/[0.05] border border-white/[0.07] p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-medium text-white/70">{c.research.toggleLabel}</span>
                <div className="relative w-10 h-5 bg-violet-500/30 rounded-full border border-violet-500/40 flex items-center px-0.5">
                  <div className="w-4 h-4 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.6)] translate-x-[18px] transition-transform" />
                </div>
              </div>
              {c.research.studies.map((study, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5 border-t border-white/[0.05]">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400/60 flex-shrink-0" />
                  <span className="text-[12px] text-white/40">{study}</span>
                </div>
              ))}
              <p className="text-[11px] text-white/25 mt-3">{c.research.disclaimer}</p>
            </div>
          </motion.div>

          {/* Future generations card */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-2xl bg-white/[0.04] border border-white/[0.07] p-7 flex flex-col"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center text-amber-400 flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-[17px] font-semibold text-white">{c.futureGen.title}</h3>
            </div>

            <p className="text-white/45 text-sm leading-relaxed mb-6 flex-1">
              {c.futureGen.body}
            </p>

            {/* Timeline: self → children → grandchildren → science */}
            <div className="space-y-3">
              {c.futureGen.timeline.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex-shrink-0 flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold
                      ${i === 0 ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' :
                        i === 1 ? 'bg-amber-500/15 border border-amber-500/25 text-amber-300' :
                        i === 2 ? 'bg-violet-500/15 border border-violet-500/25 text-violet-300' :
                                  'bg-blue-500/15 border border-blue-500/25 text-blue-300'}`}>
                      {i + 1}
                    </div>
                    {i < c.futureGen.timeline.length - 1 && (
                      <div className="w-px h-3 bg-white/10 mt-1" />
                    )}
                  </div>
                  <div className="pt-1">
                    <p className="text-[13px] font-medium text-white/70">{step.label}</p>
                    <p className="text-[12px] text-white/35 leading-relaxed mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

        </div>

        {/* Coming soon signal — honest roadmap, no overpromise */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
        >
          <svg className="w-4 h-4 text-violet-400/60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-[13px] text-white/35 text-center">{c.comingSoon}</p>
        </motion.div>

      </div>
    </section>
  );
}
