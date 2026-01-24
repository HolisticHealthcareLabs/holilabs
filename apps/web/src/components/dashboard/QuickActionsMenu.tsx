'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

interface QuickAction {
  id: string;
  name: string;
  icon: string;
  href: string;
  gradient: string;
  hoverGradient: string;
}

const PRIMARY_ACTIONS: QuickAction[] = [
  {
    id: 'new-patient',
    name: 'New Patient',
    icon: '/icons/people (1).svg',
    href: '/dashboard/patients/new',
    gradient: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30',
    hoverGradient: 'from-green-100 to-green-200 dark:hover:from-green-900/30 dark:hover:to-green-900/40',
  },
  {
    id: 'co-pilot',
    name: 'Co-Pilot',
    icon: '/icons/artificial-intelligence.svg',
    href: '/dashboard/co-pilot',
    gradient: 'from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-900/30',
    hoverGradient: 'from-yellow-100 to-yellow-200 dark:hover:from-yellow-900/30 dark:hover:to-yellow-900/40',
  },
  {
    id: 'clinical-support',
    name: 'Clinical Support',
    icon: '/icons/crisis-response_center_person.svg',
    href: '/dashboard/clinical-support',
    gradient: 'from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-900/30',
    hoverGradient: 'from-emerald-100 to-emerald-200 dark:hover:from-emerald-900/30 dark:hover:to-emerald-900/40',
  },
  {
    id: 'prevention',
    name: 'Prevention',
    icon: '/icons/health (3).svg',
    href: '/dashboard/prevention',
    gradient: 'from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-900/30',
    hoverGradient: 'from-teal-100 to-teal-200 dark:hover:from-teal-900/30 dark:hover:to-teal-900/40',
  },
];

const ADDITIONAL_ACTIONS: QuickAction[] = [
  {
    id: 'patients',
    name: 'Patients',
    icon: '/icons/people (1).svg',
    href: '/dashboard/patients',
    gradient: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30',
    hoverGradient: 'from-blue-100 to-blue-200 dark:hover:from-blue-900/30 dark:hover:to-blue-900/40',
  },
  {
    id: 'tasks',
    name: 'Tasks',
    icon: '/icons/i-note_action.svg',
    href: '/dashboard/tasks',
    gradient: 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/30',
    hoverGradient: 'from-orange-100 to-orange-200 dark:hover:from-orange-900/30 dark:hover:to-orange-900/40',
  },
  {
    id: 'reminders',
    name: 'Reminders',
    icon: '/icons/calendar.svg',
    href: '/dashboard/reminders',
    gradient: 'from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-900/30',
    hoverGradient: 'from-indigo-100 to-indigo-200 dark:hover:from-indigo-900/30 dark:hover:to-indigo-900/40',
  },
  {
    id: 'scribe',
    name: 'AI Scribe',
    icon: '/icons/i-note_action.svg',
    href: '/dashboard/scribe',
    gradient: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/30',
    hoverGradient: 'from-purple-100 to-purple-200 dark:hover:from-purple-900/30 dark:hover:to-purple-900/40',
  },
  {
    id: 'diagnosis',
    name: 'Clinical Tools',
    icon: '/icons/stethoscope.svg',
    href: '/dashboard/diagnosis',
    gradient: 'from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-900/30',
    hoverGradient: 'from-pink-100 to-pink-200 dark:hover:from-pink-900/30 dark:hover:to-pink-900/40',
  },
];

export function QuickActionsMenu() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg p-6">
      <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">
        Quick Actions
      </h2>

      {/* Primary Actions Grid - 2x2 */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {PRIMARY_ACTIONS.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            prefetch={true}
            className={`flex flex-col items-center justify-center p-4 bg-gradient-to-br ${action.gradient} hover:${action.hoverGradient} hover:-translate-y-1 hover:scale-105 rounded-xl transition-all duration-300 group shadow-sm hover:shadow-xl`}
          >
            <div className="relative w-12 h-12 mb-2 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
              <Image
                src={action.icon}
                alt={action.name}
                width={32}
                height={32}
                className="dark:invert"
              />
            </div>
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 text-center">
              {action.name}
            </span>
          </Link>
        ))}
      </div>

      {/* Expandable [+] Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-2 p-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-700/50 dark:hover:to-gray-600/50 rounded-xl transition-all duration-300 group border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
      >
        <motion.div
          animate={{ rotate: isExpanded ? 45 : 0 }}
          transition={{ duration: 0.3 }}
          className="text-2xl font-bold text-gray-600 dark:text-gray-400"
        >
          +
        </motion.div>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {isExpanded ? 'Show Less' : 'More Actions'}
        </span>
      </button>

      {/* Expanded Actions */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden mt-3"
          >
            <div className="grid grid-cols-2 gap-3">
              {ADDITIONAL_ACTIONS.map((action, index) => (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={action.href}
                    prefetch={true}
                    className={`flex flex-col items-center justify-center p-3 bg-gradient-to-br ${action.gradient} hover:${action.hoverGradient} hover:-translate-y-1 hover:scale-105 rounded-xl transition-all duration-300 group shadow-sm hover:shadow-xl`}
                  >
                    <div className="relative w-10 h-10 mb-1.5 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                      <Image
                        src={action.icon}
                        alt={action.name}
                        width={28}
                        height={28}
                        className="dark:invert"
                      />
                    </div>
                    <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 text-center">
                      {action.name}
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
