'use client';

/**
 * Command Palette
 * Quick action launcher with fuzzy search
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  ClockIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

export interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: any;
  action: () => void;
  category?: string;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
  recentCommands?: string[];
}

export default function CommandPalette({
  isOpen,
  onClose,
  commands,
  recentCommands = [],
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Filter commands based on query
  const filteredCommands = query
    ? commands.filter((cmd) => {
        const searchText = `${cmd.label} ${cmd.description || ''} ${cmd.keywords?.join(' ') || ''}`.toLowerCase();
        return searchText.includes(query.toLowerCase());
      })
    : commands;

  // Show recent commands if no query
  const displayedCommands = query
    ? filteredCommands
    : commands.filter((cmd) => recentCommands.includes(cmd.id)).slice(0, 5);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < displayedCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : displayedCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (displayedCommands[selectedIndex]) {
            displayedCommands[selectedIndex].action();
            onClose();
            setQuery('');
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          setQuery('');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, displayedCommands, onClose]);

  const handleCommandClick = (command: Command) => {
    command.action();
    onClose();
    setQuery('');
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

          {/* Command Palette */}
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full max-w-2xl"
            >
              {/* Glass card */}
              <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-gray-200/50 dark:border-white/10 overflow-hidden">
                {/* Search Input */}
                <div className="relative px-6 py-4 border-b border-gray-200/50 dark:border-white/10">
                  <div className="flex items-center gap-4">
                    <motion.div
                      animate={query ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] } : {}}
                      transition={{ duration: 0.4 }}
                    >
                      <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                    </motion.div>
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search commands..."
                      className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 text-lg"
                    />
                    <motion.kbd
                      whileHover={{ scale: 1.1 }}
                      className="hidden sm:inline-block px-2 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-xs font-mono cursor-pointer"
                    >
                      ESC
                    </motion.kbd>
                  </div>
                </div>

                {/* Commands List */}
                <div className="max-h-[400px] overflow-y-auto">
                  {displayedCommands.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="px-6 py-12 text-center"
                    >
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0], y: [0, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <SparklesIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      </motion.div>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">
                        No commands found
                      </p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Try a different search term
                      </p>
                    </motion.div>
                  ) : (
                    <div className="py-2">
                      {!query && recentCommands.length > 0 && (
                        <div className="px-6 py-2 flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                          <ClockIcon className="w-4 h-4" />
                          Recent
                        </div>
                      )}

                      {displayedCommands.map((command, index) => {
                        const Icon = command.icon;
                        const isSelected = selectedIndex === index;
                        return (
                          <motion.button
                            key={command.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            whileHover={{ x: 4 }}
                            onClick={() => handleCommandClick(command)}
                            onMouseEnter={() => setSelectedIndex(index)}
                            className={`w-full px-6 py-3 flex items-center gap-4 transition ${
                              isSelected
                                ? 'bg-blue-500/10 dark:bg-blue-500/20'
                                : 'hover:bg-gray-100 dark:hover:bg-white/5'
                            }`}
                          >
                            {Icon && (
                              <motion.div
                                animate={isSelected ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
                                transition={{ duration: 0.4 }}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                  isSelected
                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                }`}
                              >
                                <Icon className="w-5 h-5" />
                              </motion.div>
                            )}

                            <div className="flex-1 text-left">
                              <motion.div
                                animate={isSelected ? { x: [0, 2, 0] } : {}}
                                transition={{ duration: 0.3 }}
                                className={`font-medium ${
                                  isSelected
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-gray-900 dark:text-white'
                                }`}
                              >
                                {command.label}
                              </motion.div>
                              {command.description && (
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {command.description}
                                </div>
                              )}
                            </div>

                            {command.category && (
                              <motion.span
                                animate={isSelected ? { scale: [1, 1.05, 1] } : {}}
                                transition={{ duration: 0.3 }}
                                className="text-xs text-gray-400 dark:text-gray-500 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded"
                              >
                                {command.category}
                              </motion.span>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-gray-50 dark:bg-white/5 border-t border-gray-200/50 dark:border-white/10">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <motion.kbd
                          whileHover={{ scale: 1.1, y: -1 }}
                          className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded cursor-pointer"
                        >
                          ↑↓
                        </motion.kbd>
                        Navigate
                      </span>
                      <span className="flex items-center gap-1">
                        <motion.kbd
                          whileHover={{ scale: 1.1, y: -1 }}
                          className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded cursor-pointer"
                        >
                          ⏎
                        </motion.kbd>
                        Select
                      </span>
                    </div>
                    <motion.span
                      key={displayedCommands.length}
                      initial={{ scale: 1.2, opacity: 0.6 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {displayedCommands.length} of {commands.length}
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
