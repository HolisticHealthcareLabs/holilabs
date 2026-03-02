'use client';

import { useState, useRef, useTransition } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Plus, Trash2, FileText } from 'lucide-react';
import { createTemplate } from '@/app/actions/templates';

const PLAN_TYPES = [
  { value: 'WELLNESS', label: 'Wellness' },
  { value: 'CHRONIC_DISEASE', label: 'Chronic Disease' },
  { value: 'POST_SURGICAL', label: 'Post-Surgical' },
  { value: 'MENTAL_HEALTH', label: 'Mental Health' },
  { value: 'PEDIATRIC', label: 'Pediatric' },
  { value: 'GERIATRIC', label: 'Geriatric' },
  { value: 'MATERNAL', label: 'Maternal' },
  { value: 'OCCUPATIONAL', label: 'Occupational' },
  { value: 'REHABILITATION', label: 'Rehabilitation' },
  { value: 'CUSTOM', label: 'Custom' },
] as const;

const EVIDENCE_LEVELS = ['Level A', 'Level B', 'Level C', 'Expert Consensus'] as const;
const CATEGORIES = ['Clinical', 'Behavioral', 'Preventive', 'Monitoring', 'Lifestyle'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

interface Goal {
  goal: string;
  category: string;
  timeframe: string;
  priority: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const panelVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 30 },
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.97,
    transition: { duration: 0.15 },
  },
};

export default function TemplateCreateModal({ isOpen, onClose, onCreated }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [goals, setGoals] = useState<Goal[]>([
    { goal: '', category: 'Clinical', timeframe: '', priority: 'MEDIUM' },
  ]);

  const addGoal = () => {
    setGoals(prev => [...prev, { goal: '', category: 'Clinical', timeframe: '', priority: 'MEDIUM' }]);
  };

  const removeGoal = (index: number) => {
    if (goals.length <= 1) return;
    setGoals(prev => prev.filter((_, i) => i !== index));
  };

  const updateGoal = (index: number, field: keyof Goal, value: string) => {
    setGoals(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSubmit = (formData: FormData) => {
    setError(null);
    setSuccess(null);

    const validGoals = goals.filter(g => g.goal.trim());
    if (validGoals.length === 0) {
      setError('At least one goal is required.');
      return;
    }

    formData.set('goals', JSON.stringify(validGoals));
    formData.set('recommendations', JSON.stringify([]));

    startTransition(async () => {
      const result = await createTemplate(formData);
      if (result.success) {
        setSuccess(`Template "${result.templateName}" created.`);
        setGoals([{ goal: '', category: 'Clinical', timeframe: '', priority: 'MEDIUM' }]);
        formRef.current?.reset();
        setTimeout(() => {
          setSuccess(null);
          onCreated();
          onClose();
        }, 1200);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-2xl max-h-[85vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    New Template
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Collaborative prevention plan template
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form ref={formRef} action={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Status messages */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300"
                  >
                    {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-700 dark:text-emerald-300"
                  >
                    {success}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Template Name */}
              <div>
                <label htmlFor="templateName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Template Name *
                </label>
                <input
                  id="templateName"
                  name="templateName"
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-shadow"
                  placeholder="e.g., Cardiometabolic Prevention Protocol"
                />
              </div>

              {/* Plan Type + Evidence Level */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="planType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Plan Type *
                  </label>
                  <select
                    id="planType"
                    name="planType"
                    required
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none"
                  >
                    {PLAN_TYPES.map(pt => (
                      <option key={pt.value} value={pt.value}>{pt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="evidenceLevel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Evidence Level
                  </label>
                  <select
                    id="evidenceLevel"
                    name="evidenceLevel"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none"
                  >
                    <option value="">Select...</option>
                    {EVIDENCE_LEVELS.map(el => (
                      <option key={el} value={el}>{el}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none resize-none"
                  placeholder="Describe the template purpose..."
                />
              </div>

              {/* Guideline Source + Target Population */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="guidelineSource" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Guideline Source
                  </label>
                  <input
                    id="guidelineSource"
                    name="guidelineSource"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none"
                    placeholder="e.g., AHA/ACC 2023"
                  />
                </div>
                <div>
                  <label htmlFor="targetPopulation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Target Population
                  </label>
                  <input
                    id="targetPopulation"
                    name="targetPopulation"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none"
                    placeholder="e.g., Adults 40+ with hypertension"
                  />
                </div>
              </div>

              {/* Goals */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Clinical Goals *
                  </label>
                  <button
                    type="button"
                    onClick={addGoal}
                    className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Goal
                  </button>
                </div>
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {goals.map((goal, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex gap-2 items-start p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex-1 space-y-2">
                          <input
                            value={goal.goal}
                            onChange={e => updateGoal(i, 'goal', e.target.value)}
                            className="w-full px-2.5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                            placeholder="Goal description..."
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <select
                              value={goal.category}
                              onChange={e => updateGoal(i, 'category', e.target.value)}
                              className="px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs outline-none"
                            >
                              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <input
                              value={goal.timeframe}
                              onChange={e => updateGoal(i, 'timeframe', e.target.value)}
                              className="px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs outline-none"
                              placeholder="e.g., 3 months"
                            />
                            <select
                              value={goal.priority}
                              onChange={e => updateGoal(i, 'priority', e.target.value)}
                              className="px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs outline-none"
                            >
                              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </div>
                        </div>
                        {goals.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeGoal(i)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors mt-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {isPending ? (
                    <>
                      <motion.div
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      />
                      Creating...
                    </>
                  ) : (
                    'Create Template'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
