'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface ActiveSkill {
  slug: string;
  name: string;
  icon: string;
  color: string;
  category: string;
  priority: number;
  treatmentApproach?: string | null;
}

interface SkillsTrayProps {
  open: boolean;
  onToggle: () => void;
  sessionSkills: string[];
  onSessionSkillToggle: (slug: string) => void;
  onPrefillPrompt?: (prompt: string) => void;
  onOpenSettings?: () => void;
}

const SKILL_PROMPTS: Record<string, string> = {
  'differential-dx': 'Top 5 differentials ranked by probability, red flags, and 3 clarifying questions',
  'rx-prescriptions': 'Review current medications — interactions, adjustments, and evidence-based alternatives',
  'pics-integrative': 'Suggest integrative complementary approaches (PICs/PNPIC) for the current condition',
  'prevention-screening': 'What screenings and preventive measures are due or overdue for this patient?',
  'clinical-notes-soap': 'Generate a complete SOAP note from the current session',
  'lab-imaging-orders': 'Recommend labs and imaging based on the current assessment',
  'referrals': 'Which specialist referrals should be considered and why?',
  'patient-education': 'Create patient-friendly education material for the current diagnosis',
};

export function SkillsTray({
  open,
  onToggle,
  sessionSkills,
  onSessionSkillToggle,
  onPrefillPrompt,
  onOpenSettings,
}: SkillsTrayProps) {
  const [skills, setSkills] = useState<ActiveSkill[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch('/api/clinical-skills/active')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.skills)) {
          setSkills(data.skills);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isActive = (slug: string) => sessionSkills.includes(slug);

  return (
    <>
      {/* Brain toggle button */}
      <button
        onClick={onToggle}
        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-200 ${
          open
            ? 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/25'
            : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
        }`}
        title="Clinical Skills"
        aria-label="Toggle clinical skills"
        aria-expanded={open}
      >
        {'\u{1F9E0}'}
      </button>

      {/* Skills tray */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="pt-2 pb-1">
              {loading ? (
                <div className="flex items-center gap-2 px-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-8 w-24 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse"
                    />
                  ))}
                </div>
              ) : skills.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 px-1">
                  No skills configured.{' '}
                  {onOpenSettings && (
                    <button
                      onClick={onOpenSettings}
                      className="underline hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      Set up skills
                    </button>
                  )}
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((skill) => {
                    const active = isActive(skill.slug);
                    return (
                      <motion.button
                        key={skill.slug}
                        layout
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          onSessionSkillToggle(skill.slug);
                          if (!active && onPrefillPrompt) {
                            const prompt = SKILL_PROMPTS[skill.slug];
                            if (prompt) onPrefillPrompt(prompt);
                          }
                        }}
                        className={`group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border ${
                          active
                            ? 'text-white border-transparent shadow-sm'
                            : 'text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                        style={
                          active
                            ? { backgroundColor: skill.color, borderColor: skill.color }
                            : { backgroundColor: `${skill.color}10` }
                        }
                        title={`${skill.name}${active ? ' (active)' : ''}`}
                      >
                        <span className="text-sm leading-none">{skill.icon}</span>
                        <span>{skill.name}</span>
                        {onOpenSettings && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenSettings();
                            }}
                            className="ml-0.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-pointer transition-opacity"
                            title="Configure skill"
                          >
                            {'\u2699'}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
