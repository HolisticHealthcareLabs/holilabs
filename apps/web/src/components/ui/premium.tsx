'use client';

/**
 * Premium UI primitives — consistent across light + dark mode.
 *
 * Design tokens follow the Holi Labs design language established in the
 * perioperative suite (preop-calculators / preop-screening / find-doctor).
 *
 *  - Surface hierarchy: paper → surface → raised
 *  - Ink hierarchy:     primary → secondary → tertiary → muted
 *  - Accents:           rose / amber / emerald / sky / violet (semantic, not decorative)
 *  - Motion:            200–400ms ease-out, subtle lift on hover
 *
 * All components expose identical look in light + dark via paired Tailwind classes.
 */

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Minus, AlertCircle, AlertTriangle, Info,
  CheckCircle2, ArrowRight, ChevronRight, type LucideIcon,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Tokens (exported for consumer pages)
// ─────────────────────────────────────────────────────────────────────────────

export type AccentName = 'slate' | 'rose' | 'amber' | 'emerald' | 'sky' | 'violet' | 'teal';

export const ACCENT_TOKENS: Record<AccentName, {
  iconBg: string;
  iconText: string;
  ring: string;
  softBg: string;
}> = {
  slate:   { iconBg: 'bg-slate-100 dark:bg-slate-800',      iconText: 'text-slate-600 dark:text-slate-300',  ring: 'ring-slate-200 dark:ring-slate-700',    softBg: 'bg-slate-50 dark:bg-slate-800/40' },
  rose:    { iconBg: 'bg-rose-50 dark:bg-rose-500/10',      iconText: 'text-rose-600 dark:text-rose-300',    ring: 'ring-rose-200 dark:ring-rose-500/20',    softBg: 'bg-rose-50 dark:bg-rose-500/5' },
  amber:   { iconBg: 'bg-amber-50 dark:bg-amber-500/10',    iconText: 'text-amber-600 dark:text-amber-300',  ring: 'ring-amber-200 dark:ring-amber-500/20',  softBg: 'bg-amber-50 dark:bg-amber-500/5' },
  emerald: { iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',iconText: 'text-emerald-600 dark:text-emerald-300', ring: 'ring-emerald-200 dark:ring-emerald-500/20', softBg: 'bg-emerald-50 dark:bg-emerald-500/5' },
  sky:     { iconBg: 'bg-sky-50 dark:bg-sky-500/10',        iconText: 'text-sky-600 dark:text-sky-300',      ring: 'ring-sky-200 dark:ring-sky-500/20',      softBg: 'bg-sky-50 dark:bg-sky-500/5' },
  violet:  { iconBg: 'bg-violet-50 dark:bg-violet-500/10',  iconText: 'text-violet-600 dark:text-violet-300',ring: 'ring-violet-200 dark:ring-violet-500/20',softBg: 'bg-violet-50 dark:bg-violet-500/5' },
  teal:    { iconBg: 'bg-teal-50 dark:bg-teal-500/10',      iconText: 'text-teal-600 dark:text-teal-300',    ring: 'ring-teal-200 dark:ring-teal-500/20',    softBg: 'bg-teal-50 dark:bg-teal-500/5' },
};

// ─────────────────────────────────────────────────────────────────────────────
// MetricCard — replaces the broken analytics KPICard.
//
// Layout (top to bottom): icon · (optional delta) · label · value · sub-note.
// Never truncates the label. Value is the hero. Consistent across light+dark.
// ─────────────────────────────────────────────────────────────────────────────

export interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  /** Optional secondary metric line (e.g. "12 active"). */
  sub?: React.ReactNode;
  /** Growth percentage — positive/negative/zero rendered with semantic color. */
  delta?: number;
  /** Optional unit appended to value in smaller weight (e.g. "min", "per visit"). */
  unit?: string;
  accent?: AccentName;
  /** Optional click — renders as button with micro CTA affordance. */
  onClick?: () => void;
  /** Optional aria-label override. */
  ariaLabel?: string;
  /** Index for entrance stagger. */
  index?: number;
}

export function MetricCard({
  icon: Icon, label, value, sub, delta, unit, accent = 'slate', onClick, ariaLabel, index = 0,
}: MetricCardProps) {
  const tokens = ACCENT_TOKENS[accent];
  const reduce = useReducedMotion();

  const inner = (
    <div className="flex flex-col h-full">
      {/* Row 1: icon + optional delta — on their own line, no competing with content */}
      <div className="flex items-start justify-between gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tokens.iconBg}`}>
          <Icon className={`w-[18px] h-[18px] ${tokens.iconText}`} strokeWidth={1.75} />
        </div>
        {delta !== undefined && <DeltaBadge value={delta} />}
      </div>

      {/* Row 2: LABEL — small, uppercase, clearly secondary */}
      <div className="mt-5 text-[11px] uppercase tracking-[0.14em] font-medium text-slate-500 dark:text-slate-400 leading-snug">
        {label}
      </div>

      {/* Row 3: VALUE — hero number, very large, clearly primary */}
      <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
        <span className="text-[2rem] sm:text-[2.25rem] font-semibold tracking-tight tabular-nums text-slate-900 dark:text-white leading-none">
          {value}
        </span>
        {unit && (
          <span className="text-sm font-medium text-slate-400 dark:text-slate-500">
            {unit}
          </span>
        )}
      </div>

      {/* Row 4: sub-note + optional CTA arrow — tertiary, roomy */}
      {(sub || onClick) && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400 truncate">
            {sub || '\u00A0'}
          </span>
          {onClick && (
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-700 dark:group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
          )}
        </div>
      )}
    </div>
  );

  const baseClass = 'group relative flex flex-col rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white dark:bg-slate-900/60 p-5 min-h-[160px] transition-all duration-200';
  const interactiveClass = onClick
    ? ' hover:border-slate-300 dark:hover:border-white/20 hover:shadow-sm hover:-translate-y-0.5 cursor-pointer text-left w-full'
    : '';

  const motionProps = reduce ? {} : {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, delay: Math.min(index * 0.05, 0.3), ease: 'easeOut' as const },
  };

  if (onClick) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel ?? label}
        className={baseClass + interactiveClass}
        {...motionProps}
      >
        {inner}
      </motion.button>
    );
  }
  return (
    <motion.div className={baseClass} {...motionProps}>
      {inner}
    </motion.div>
  );
}

function DeltaBadge({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
        <TrendingUp className="w-3 h-3" strokeWidth={2.5} />
        +{value}%
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
        <TrendingDown className="w-3 h-3" strokeWidth={2.5} />
        {value}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 tabular-nums">
      <Minus className="w-3 h-3" strokeWidth={2.5} />
      0%
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Alert — semantic messaging banner (info / success / warning / danger).
// Uniform in light + dark.
// ─────────────────────────────────────────────────────────────────────────────

export interface AlertProps {
  tone: 'info' | 'success' | 'warning' | 'danger';
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: { label: string; onClick: () => void };
}

export function Alert({ tone, title, children, action }: AlertProps) {
  const m = {
    info:    { Icon: Info,            bg: 'bg-sky-50 dark:bg-sky-500/10',         border: 'border-sky-200 dark:border-sky-500/20',         iconText: 'text-sky-600 dark:text-sky-400',         titleText: 'text-sky-900 dark:text-sky-100',         body: 'text-sky-800 dark:text-sky-200' },
    success: { Icon: CheckCircle2,    bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/20', iconText: 'text-emerald-600 dark:text-emerald-400', titleText: 'text-emerald-900 dark:text-emerald-100', body: 'text-emerald-800 dark:text-emerald-200' },
    warning: { Icon: AlertTriangle,   bg: 'bg-amber-50 dark:bg-amber-500/10',     border: 'border-amber-200 dark:border-amber-500/20',     iconText: 'text-amber-600 dark:text-amber-400',     titleText: 'text-amber-900 dark:text-amber-100',     body: 'text-amber-800 dark:text-amber-200' },
    danger:  { Icon: AlertCircle,     bg: 'bg-rose-50 dark:bg-rose-500/10',       border: 'border-rose-200 dark:border-rose-500/20',       iconText: 'text-rose-600 dark:text-rose-400',       titleText: 'text-rose-900 dark:text-rose-100',       body: 'text-rose-800 dark:text-rose-200' },
  }[tone];
  return (
    <div className={`rounded-xl border ${m.border} ${m.bg} px-4 py-3 flex items-start gap-2.5`} role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}>
      <m.Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${m.iconText}`} strokeWidth={1.75} />
      <div className="flex-1 min-w-0">
        {title && <p className={`text-sm font-semibold ${m.titleText}`}>{title}</p>}
        {children && <div className={`text-[13px] leading-relaxed ${m.body} ${title ? 'mt-0.5' : ''}`}>{children}</div>}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className={`text-xs font-semibold ${m.titleText} hover:opacity-80 whitespace-nowrap inline-flex items-center gap-1`}
        >
          {action.label}
          <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EmptyState — for zero-data displays (inbox empty, no results, etc.)
// ─────────────────────────────────────────────────────────────────────────────

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: { label: string; onClick?: () => void; href?: string };
  accent?: AccentName;
}

export function EmptyState({ icon: Icon, title, description, action, accent = 'slate' }: EmptyStateProps) {
  const tokens = ACCENT_TOKENS[accent];
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      {Icon && (
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${tokens.iconBg}`}>
          <Icon className={`w-6 h-6 ${tokens.iconText}`} strokeWidth={1.75} />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        action.href ? (
          <a
            href={action.href}
            className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
          >
            {action.label}
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        ) : (
          <button
            onClick={action.onClick}
            className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
          >
            {action.label}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionHeader — consistent page-section heading
// ─────────────────────────────────────────────────────────────────────────────

export function SectionHeader({
  eyebrow, title, description, action,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[11px] uppercase tracking-[0.14em] font-medium text-slate-500 dark:text-slate-400 mb-2">
            {eyebrow}
          </div>
        )}
        <h1 className="text-[2rem] leading-[1.15] font-semibold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
