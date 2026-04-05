'use client';

import Link from 'next/link';
import { Shield, BarChart3, Heart, ChevronRight, X } from 'lucide-react';

const FEATURES = [
  {
    icon: Shield,
    badge: 'Safety',
    title: 'Real-Time Safety Engine',
    description:
      'Traffic-light alerts for drug interactions, renal dosing, and formulary compliance — running deterministic rules in real time as you work.',
    color: 'from-blue-500/20 to-blue-600/10',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    badgeColor: 'bg-blue-500/20 text-blue-300',
  },
  {
    icon: BarChart3,
    badge: 'Governance',
    title: 'Live Governance Console',
    description:
      'Every clinical decision logged in a tamper-evident audit trail. Fleet-wide trust scores, override intelligence, and protocol drift — in real time.',
    color: 'from-purple-500/20 to-purple-600/10',
    borderColor: 'border-purple-500/30',
    iconColor: 'text-purple-400',
    badgeColor: 'bg-purple-500/20 text-purple-300',
  },
  {
    icon: Heart,
    badge: 'Prevention',
    title: 'Longitudinal Care Hub',
    description:
      'Longitudinal care across 7 health domains with 50+ evidence-based protocols. Dynamic risk scoring and automated reminders that keep patients on track.',
    color: 'from-rose-500/20 to-rose-600/10',
    borderColor: 'border-rose-500/30',
    iconColor: 'text-rose-400',
    badgeColor: 'bg-rose-500/20 text-rose-300',
  },
] as const;

interface FirstRunWelcomeProps {
  userName: string;
  onDismiss: () => void;
}

export function FirstRunWelcome({ userName, onDismiss }: FirstRunWelcomeProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 border border-white/10 p-8 md:p-12 mb-8" style={{ borderRadius: 'var(--radius-xl)' }}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent" />

        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-2 text-white/40 hover:text-white/70 transition-colors hover:bg-white/5"
          style={{ borderRadius: 'var(--radius-lg)' }}
          aria-label="Dismiss welcome"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative">
          <p className="text-blue-400 text-sm font-medium mb-2">Welcome to Cortex</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Hey {userName}, your clinical command center is ready.
          </h1>
          <p className="text-blue-200/70 text-lg max-w-2xl mb-8">
            Your dashboard will populate as you use the platform. In the meantime,
            explore an interactive demo to see Cortex in action.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
              style={{ borderRadius: 'var(--radius-xl)' }}
            >
              Try Interactive Demo
              <ChevronRight className="w-4 h-4" />
            </Link>
            <button
              onClick={onDismiss}
              className="inline-flex items-center gap-2 px-6 py-3 text-blue-300 hover:text-white border border-white/10 hover:border-white/20 transition-colors"
              style={{ borderRadius: 'var(--radius-xl)' }}
            >
              Skip — go to dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {FEATURES.map((feature) => (
          <div
            key={feature.badge}
            className={`border ${feature.borderColor} bg-gradient-to-br ${feature.color} p-6`}
            style={{ borderRadius: 'var(--radius-xl)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 bg-white/5 ${feature.iconColor}`} style={{ borderRadius: 'var(--radius-lg)' }}>
                <feature.icon className="w-5 h-5" />
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 ${feature.badgeColor}`} style={{ borderRadius: 'var(--radius-full)' }}>
                {feature.badge}
              </span>
            </div>
            <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
            <p className="text-sm text-white/60 leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
