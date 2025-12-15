'use client';

/**
 * Keyboard Shortcuts Overlay
 * Displays available keyboard shortcuts in elegant modal
 */

import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, CommandLineIcon } from '@heroicons/react/24/outline';
import type { KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';
import { formatShortcut } from '@/hooks/useKeyboardShortcuts';

interface KeyboardShortcutsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

export default function KeyboardShortcutsOverlay({
  isOpen,
  onClose,
  shortcuts,
}: KeyboardShortcutsOverlayProps) {
  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || 'general';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  const categoryLabels: Record<string, string> = {
    recording: 'Recording Controls',
    navigation: 'Navigation',
    patient: 'Patient Management',
    general: 'General',
  };

  const categoryIcons: Record<string, string> = {
    recording: '🎙️',
    navigation: '🧭',
    patient: '👤',
    general: '⚡',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25 }}
              className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden"
            >
              {/* Glass card */}
              <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-gray-200/50 dark:border-white/10 overflow-hidden">
                {/* Header */}
                <div className="relative px-8 py-6 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-b border-gray-200/50 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <motion.div
                        animate={{
                          boxShadow: [
                            '0 10px 30px rgba(59, 130, 246, 0.3)',
                            '0 10px 40px rgba(99, 102, 241, 0.4)',
                            '0 10px 30px rgba(59, 130, 246, 0.3)',
                          ],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center"
                      >
                        <motion.div
                          animate={{ rotate: [0, 5, -5, 0] }}
                          transition={{ duration: 3, repeat: Infinity, repeatDelay: 1 }}
                        >
                          <CommandLineIcon className="w-6 h-6 text-white" />
                        </motion.div>
                      </motion.div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                          Keyboard Shortcuts
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Master your workflow with these shortcuts
                        </p>
                      </div>
                    </div>

                    <motion.button
                      onClick={onClose}
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition"
                    >
                      <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                    </motion.button>
                  </div>
                </div>

                {/* Content */}
                <div className="px-8 py-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                  <div className="space-y-8">
                    {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                      <motion.div
                        key={category}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        {/* Category Header */}
                        <div className="flex items-center gap-3 mb-4">
                          <motion.span
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', damping: 15, delay: 0.2 }}
                            whileHover={{ scale: 1.2, rotate: [0, -10, 10, -10, 0] }}
                            className="text-2xl cursor-pointer"
                          >
                            {categoryIcons[category]}
                          </motion.span>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {categoryLabels[category]}
                          </h3>
                        </div>

                        {/* Shortcuts Grid */}
                        <div className="grid gap-3">
                          {categoryShortcuts.map((shortcut, index) => (
                            <motion.div
                              key={shortcut.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.05 * index }}
                              whileHover={{ scale: 1.02, y: -2, boxShadow: '0 10px 30px rgba(59, 130, 246, 0.15)' }}
                              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200/50 dark:border-white/10 hover:border-blue-500/50 transition group cursor-pointer"
                            >
                              <motion.span
                                whileHover={{ x: 2 }}
                                transition={{ duration: 0.15 }}
                                className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition"
                              >
                                {shortcut.description}
                              </motion.span>

                              <motion.kbd
                                whileHover={{ scale: 1.1, y: -2 }}
                                whileTap={{ scale: 0.95, y: 0 }}
                                className="px-3 py-1.5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-lg text-sm font-mono font-semibold text-gray-700 dark:text-gray-300 shadow-sm cursor-pointer"
                              >
                                {formatShortcut(shortcut.keys)}
                              </motion.kbd>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-4 bg-gray-50 dark:bg-white/5 border-t border-gray-200/50 dark:border-white/10">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Press <motion.kbd
                        whileHover={{ scale: 1.15, y: -2 }}
                        whileTap={{ scale: 0.95, y: 0 }}
                        className="inline-block px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded font-mono cursor-pointer"
                      >?</motion.kbd> anytime to view shortcuts
                    </span>
                    <motion.span
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-gray-500 dark:text-gray-500"
                    >
                      {shortcuts.length} shortcut{shortcuts.length !== 1 ? 's' : ''} available
                    </motion.span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
