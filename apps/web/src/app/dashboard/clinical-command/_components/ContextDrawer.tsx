'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  RotateCw,
  ChevronRight,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import type {
  ClinicalEntity,
  EntityCategory,
} from '../../../../../../../packages/shared-kernel/src/types/clinical-ui';

// ---------------------------------------------------------------------------
// Category visual config
// ---------------------------------------------------------------------------

const CATEGORY_CONFIG: Record<
  EntityCategory,
  { label: string; accent: string; chipBg: string; chipBorder: string; chipText: string }
> = {
  'ICD-10': {
    label: 'icd10Conditions',
    accent: 'text-amber-600 dark:text-amber-400',
    chipBg: 'bg-amber-50 dark:bg-amber-500/10',
    chipBorder: 'border-amber-200 dark:border-amber-500/25',
    chipText: 'text-amber-800 dark:text-amber-300',
  },
  ATC: {
    label: 'atcMedications',
    accent: 'text-blue-600 dark:text-blue-400',
    chipBg: 'bg-blue-50 dark:bg-blue-500/10',
    chipBorder: 'border-blue-200 dark:border-blue-500/25',
    chipText: 'text-blue-800 dark:text-blue-300',
  },
  LOINC: {
    label: 'loincLabs',
    accent: 'text-emerald-600 dark:text-emerald-400',
    chipBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    chipBorder: 'border-emerald-200 dark:border-emerald-500/25',
    chipText: 'text-emerald-800 dark:text-emerald-300',
  },
  SNOMED: {
    label: 'snomedFindings',
    accent: 'text-violet-600 dark:text-violet-400',
    chipBg: 'bg-violet-50 dark:bg-violet-500/10',
    chipBorder: 'border-violet-200 dark:border-violet-500/25',
    chipText: 'text-violet-800 dark:text-violet-300',
  },
};

const CATEGORY_ORDER: EntityCategory[] = ['ICD-10', 'ATC', 'LOINC', 'SNOMED'];

const CONFIDENCE_DOT: Record<string, string> = {
  high: 'bg-emerald-500',
  medium: 'bg-yellow-500',
  low: 'bg-red-400',
};

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const chipVariants = {
  initial: { opacity: 0, scale: 0.85, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.85, x: -12 },
};

const sectionVariants = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0 },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ContextDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entities: ClinicalEntity[];
  onRejectEntity: (id: string) => void;
  onRestoreEntity: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContextDrawer({
  isOpen,
  onClose,
  entities,
  onRejectEntity,
  onRestoreEntity,
}: ContextDrawerProps) {
  const t = useTranslations('dashboard.clinicalCommand');
  const activeEntities = useMemo(
    () => entities.filter((e) => e.status === 'active'),
    [entities],
  );
  const rejectedEntities = useMemo(
    () => entities.filter((e) => e.status === 'rejected'),
    [entities],
  );

  const groupedActive = useMemo(() => {
    const groups: Partial<Record<EntityCategory, ClinicalEntity[]>> = {};
    for (const entity of activeEntities) {
      if (!groups[entity.category]) groups[entity.category] = [];
      groups[entity.category]!.push(entity);
    }
    return groups;
  }, [activeEntities]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="ctx-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40"
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <motion.aside
            key="ctx-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="
              fixed top-0 right-0 z-50 h-full w-[400px] max-w-[90vw]
              flex flex-col
              bg-white dark:bg-slate-900
              border-l border-slate-200 dark:border-slate-700/60
              shadow-2xl
            "
            role="complementary"
            aria-label="Clinical Context Drawer"
          >
            {/* Header */}
            <div className="
              flex items-center justify-between px-5 py-4 flex-shrink-0
              border-b border-slate-200 dark:border-slate-700/60
            ">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-cyan-500" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t('clinicalContext')}
                </h2>
                {activeEntities.length > 0 && (
                  <span className="
                    text-[10px] font-bold px-2 py-0.5 rounded-full
                    bg-cyan-100 dark:bg-cyan-500/15
                    text-cyan-700 dark:text-cyan-400
                    border border-cyan-200 dark:border-cyan-500/25
                  ">
                    {t('activeCount', { count: activeEntities.length })}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="
                  p-1.5 rounded-lg
                  text-slate-400 dark:text-slate-500
                  hover:text-slate-600 dark:hover:text-slate-300
                  hover:bg-slate-100 dark:hover:bg-slate-800
                  transition-colors
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
                "
                aria-label="Close context drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 space-y-5">
              {activeEntities.length === 0 && rejectedEntities.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <ShieldCheck className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm text-slate-400 dark:text-slate-500 text-center">
                    {t('noEntitiesYet')}
                    <br />
                    {t('startRecordingContext')}
                  </p>
                </div>
              )}

              {/* Active entity sections grouped by category */}
              {CATEGORY_ORDER.map((category) => {
                const items = groupedActive[category];
                if (!items || items.length === 0) return null;
                const config = CATEGORY_CONFIG[category];

                return (
                  <motion.section
                    key={category}
                    variants={sectionVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.25 }}
                  >
                    <div className="flex items-center gap-2 mb-2.5">
                      <ChevronRight className={`w-3 h-3 ${config.accent}`} />
                      <h3 className={`text-[11px] font-bold uppercase tracking-wider ${config.accent}`}>
                        {t(config.label)}
                      </h3>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        ({items.length})
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <AnimatePresence mode="popLayout">
                        {items.map((entity) => (
                          <motion.div
                            key={entity.id}
                            layout
                            variants={chipVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={{ duration: 0.2, layout: { duration: 0.25 } }}
                            className={`
                              group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                              border text-xs font-medium
                              ${config.chipBg} ${config.chipBorder} ${config.chipText}
                              transition-shadow hover:shadow-md
                            `}
                          >
                            {/* Confidence dot */}
                            <span
                              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${CONFIDENCE_DOT[entity.confidence]}`}
                              title={`Confidence: ${entity.confidence}`}
                            />

                            {/* Code badge */}
                            <span className="
                              text-[10px] font-mono font-bold opacity-60
                              bg-black/5 dark:bg-white/5 px-1 py-0.5 rounded
                            ">
                              {entity.code}
                            </span>

                            {/* Label */}
                            <span className="truncate max-w-[160px]" title={entity.label}>
                              {entity.label}
                            </span>

                            {/* Reject button */}
                            <button
                              onClick={() => onRejectEntity(entity.id)}
                              className="
                                ml-1 p-0.5 rounded
                                opacity-0 group-hover:opacity-100
                                text-red-400 dark:text-red-500
                                hover:text-red-600 dark:hover:text-red-400
                                hover:bg-red-50 dark:hover:bg-red-500/10
                                transition-all
                                focus-visible:opacity-100
                                focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400
                              "
                              aria-label={`Reject entity: ${entity.label}`}
                              title={t('rejectEntityHint')}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.section>
                );
              })}

              {/* Discarded Context section (ELENA: negative space heuristic) */}
              <AnimatePresence>
                {rejectedEntities.length > 0 && (
                  <motion.section
                    key="discarded"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="pt-4 border-t border-slate-200 dark:border-slate-700/40"
                  >
                    <div className="flex items-center gap-2 mb-2.5">
                      <Trash2 className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {t('discardedContext')}
                      </h3>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        ({rejectedEntities.length})
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 dark:text-slate-600 mb-2.5">
                      {t('discardedContextDesc')}
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      <AnimatePresence mode="popLayout">
                        {rejectedEntities.map((entity) => (
                          <motion.div
                            key={entity.id}
                            layout
                            variants={chipVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={{ duration: 0.2 }}
                            className="
                              group flex items-center gap-1.5 px-2 py-1 rounded-lg
                              border text-xs font-medium
                              bg-slate-50 dark:bg-slate-800/40
                              border-slate-200 dark:border-slate-700/40
                              text-slate-400 dark:text-slate-500
                              line-through decoration-slate-300 dark:decoration-slate-600
                            "
                          >
                            <span className="text-[10px] font-mono opacity-50">
                              {entity.code}
                            </span>
                            <span className="truncate max-w-[140px]" title={entity.label}>
                              {entity.label}
                            </span>

                            {/* Restore button */}
                            <button
                              onClick={() => onRestoreEntity(entity.id)}
                              className="
                                ml-1 p-0.5 rounded
                                opacity-0 group-hover:opacity-100
                                text-emerald-500 dark:text-emerald-400
                                hover:text-emerald-600 dark:hover:text-emerald-300
                                hover:bg-emerald-50 dark:hover:bg-emerald-500/10
                                transition-all
                                focus-visible:opacity-100
                                focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400
                              "
                              aria-label={`Restore entity: ${entity.label}`}
                              title={t('restoreEntityHint')}
                            >
                              <RotateCw className="w-3 h-3" />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="
              flex-shrink-0 px-5 py-3
              border-t border-slate-200 dark:border-slate-700/60
              bg-slate-50/50 dark:bg-slate-800/30
            ">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                {t('contextFooter')}
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
