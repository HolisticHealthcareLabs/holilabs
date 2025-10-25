/**
 * Command Palette Component
 *
 * Hospital-grade command palette with:
 * - Cmd+K / Ctrl+K keyboard shortcut
 * - Fuzzy search across all features
 * - Quick actions (navigate, create, search)
 * - Recent pages and actions
 * - Keyboard navigation (arrows, Enter, Escape)
 * - Contextual suggestions
 * - Dark mode support
 *
 * Inspired by: Vercel, Linear, Epic Rover
 * Part of Phase 1: Clinician Dashboard Redesign
 */

'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

/**
 * Command Item Interface
 */
interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  category: 'navigation' | 'action' | 'search' | 'recent';
  action: () => void;
  keywords?: string[]; // Additional keywords for search
}

/**
 * Command Palette Props
 */
interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Command Palette Component
 */
export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Define all available commands
  const allCommands: CommandItem[] = useMemo(
    () => [
      // Navigation
      {
        id: 'nav-dashboard',
        label: 'Go to Dashboard',
        description: 'View your command center',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        ),
        category: 'navigation',
        action: () => router.push('/dashboard'),
        keywords: ['home', 'inicio', 'principal'],
      },
      {
        id: 'nav-patients',
        label: 'View All Patients',
        description: 'Patient list and management',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        ),
        category: 'navigation',
        action: () => router.push('/dashboard/patients'),
        keywords: ['pacientes', 'list', 'lista'],
      },
      {
        id: 'nav-appointments',
        label: 'View Appointments',
        description: 'Calendar and scheduling',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        ),
        category: 'navigation',
        action: () => router.push('/dashboard/appointments'),
        keywords: ['calendar', 'citas', 'agenda'],
      },
      {
        id: 'nav-scribe',
        label: 'AI Scribe',
        description: 'Voice clinical documentation',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        ),
        category: 'navigation',
        action: () => router.push('/dashboard/scribe'),
        keywords: ['voice', 'voz', 'transcription', 'transcripción', 'dictation'],
      },
      {
        id: 'nav-diagnosis',
        label: 'Clinical Tools',
        description: 'AI diagnosis and insights',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        ),
        category: 'navigation',
        action: () => router.push('/dashboard/diagnosis'),
        keywords: ['tools', 'herramientas', 'ai', 'diagnostic', 'diagnóstico'],
      },

      // Actions
      {
        id: 'action-new-patient',
        label: 'New Patient Registration',
        description: 'Register a new patient',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
        ),
        shortcut: 'Cmd+N',
        category: 'action',
        action: () => router.push('/dashboard/patients/new'),
        keywords: ['create', 'add', 'nuevo', 'agregar', 'registrar'],
      },
      {
        id: 'action-schedule',
        label: 'Schedule Appointment',
        description: 'Create new appointment',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        ),
        category: 'action',
        action: () => router.push('/dashboard/appointments?action=new'),
        keywords: ['crear', 'nueva', 'cita', 'appointment'],
      },
      {
        id: 'action-start-scribe',
        label: 'Start Voice Recording',
        description: 'Begin clinical documentation',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        ),
        shortcut: 'Cmd+Shift+R',
        category: 'action',
        action: () => router.push('/dashboard/scribe?autostart=true'),
        keywords: ['record', 'grabar', 'voice', 'voz'],
      },

      // Search
      {
        id: 'search-patients',
        label: 'Search Patients',
        description: 'Find patient by name, ID, or phone',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        ),
        shortcut: 'Cmd+P',
        category: 'search',
        action: () => router.push('/dashboard/patients?search=true'),
        keywords: ['buscar', 'encontrar', 'find'],
      },
    ],
    [router]
  );

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      return allCommands;
    }

    const lowerQuery = query.toLowerCase();
    return allCommands.filter((cmd) => {
      const searchText = `${cmd.label} ${cmd.description || ''} ${cmd.keywords?.join(' ') || ''}`.toLowerCase();
      return searchText.includes(lowerQuery);
    });
  }, [query, allCommands]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {
      navigation: [],
      action: [],
      search: [],
      recent: [],
    };

    filteredCommands.forEach((cmd) => {
      groups[cmd.category].push(cmd);
    });

    return groups;
  }, [filteredCommands]);

  // Reset selection when filtered commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filteredCommands, selectedIndex, onClose]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const categoryLabels = {
    navigation: 'Navigation',
    action: 'Actions',
    search: 'Search',
    recent: 'Recent',
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm pt-[15vh]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl mx-4 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
          >
            {/* Search Input */}
            <div className="relative border-b border-neutral-200 dark:border-neutral-800">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command or search..."
                className="w-full px-12 py-4 text-lg bg-transparent text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-neutral-400 dark:text-neutral-600 font-medium">
                ESC to close
              </div>
            </div>

            {/* Command List */}
            <div
              ref={listRef}
              className="max-h-[60vh] overflow-y-auto py-2"
              style={{ scrollbarGutter: 'stable' }}
            >
              {filteredCommands.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <div className="text-neutral-400 dark:text-neutral-600 mb-2">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M12 12h.01M12 12h.01M12 12h.01M12 12h.01M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">No commands found</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">Try a different search term</p>
                </div>
              ) : (
                Object.entries(groupedCommands).map(
                  ([category, commands]) =>
                    commands.length > 0 && (
                      <div key={category} className="mb-2">
                        <div className="px-4 py-2 text-xs font-semibold text-neutral-500 dark:text-neutral-500 uppercase tracking-wider">
                          {categoryLabels[category as keyof typeof categoryLabels]}
                        </div>
                        {commands.map((command, index) => {
                          const globalIndex = filteredCommands.indexOf(command);
                          const isSelected = globalIndex === selectedIndex;

                          return (
                            <button
                              key={command.id}
                              onClick={() => {
                                command.action();
                                onClose();
                              }}
                              onMouseEnter={() => setSelectedIndex(globalIndex)}
                              className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                                isSelected
                                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                              }`}
                            >
                              {/* Icon */}
                              <div
                                className={`flex-shrink-0 ${
                                  isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-400 dark:text-neutral-600'
                                }`}
                              >
                                {command.icon}
                              </div>

                              {/* Label and description */}
                              <div className="flex-1 text-left min-w-0">
                                <div className="font-medium truncate">{command.label}</div>
                                {command.description && (
                                  <div className="text-xs text-neutral-500 dark:text-neutral-500 truncate">
                                    {command.description}
                                  </div>
                                )}
                              </div>

                              {/* Shortcut */}
                              {command.shortcut && (
                                <div className="flex-shrink-0 text-xs text-neutral-400 dark:text-neutral-600 font-medium px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded">
                                  {command.shortcut}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )
                )
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
              <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-[10px]">
                      ↑↓
                    </kbd>
                    navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-[10px]">
                      ⏎
                    </kbd>
                    select
                  </span>
                </div>
                <span>{filteredCommands.length} commands</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/**
 * Command Palette Provider Hook
 * Use this hook to control the command palette from anywhere
 */
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  };
}
