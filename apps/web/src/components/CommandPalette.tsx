'use client';

/**
 * Command Palette - VS Code Style
 *
 * Global command palette with fuzzy search and keyboard navigation
 *
 * Features:
 * - Cmd/Ctrl+K to open
 * - Fuzzy search across all commands
 * - Keyboard navigation (↑↓)
 * - Recent commands tracking
 * - Command categories
 * - Quick actions
 * - Patient search integration
 */

import { useState, useEffect, useCallback, Fragment, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, Transition, Combobox } from '@headlessui/react';
import {
  MagnifyingGlassIcon,
  ClockIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CalendarIcon,
  BeakerIcon,
  SparklesIcon,
  Cog6ToothIcon,
  ArrowRightIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { useKeyboardShortcuts, formatShortcut } from '@/hooks/useKeyboardShortcuts';

interface Command {
  id: string;
  name: string;
  description?: string;
  category: 'navigation' | 'actions' | 'patients' | 'settings' | 'recent';
  icon?: React.ComponentType<{ className?: string }>;
  action: () => void;
  keywords?: string[];
  shortcut?: string;
}

interface CommandPaletteProps {
  /** Additional custom commands */
  customCommands?: Command[];
}

export function CommandPalette({ customCommands = [] }: CommandPaletteProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);

  /**
   * Built-in commands
   */
  const builtInCommands: Command[] = useMemo(() => [
    // Navigation
    {
      id: 'nav-dashboard',
      name: 'Go to Dashboard',
      description: 'View your main dashboard',
      category: 'navigation',
      icon: Cog6ToothIcon,
      action: () => {
        router.push('/dashboard');
        closeAndTrack('nav-dashboard');
      },
      keywords: ['home', 'main', 'overview'],
    },
    {
      id: 'nav-patients',
      name: 'Go to Patients',
      description: 'View all patients',
      category: 'navigation',
      icon: UserGroupIcon,
      action: () => {
        router.push('/dashboard/patients');
        closeAndTrack('nav-patients');
      },
      keywords: ['patient list', 'census'],
    },
    {
      id: 'nav-appointments',
      name: 'Go to Appointments',
      description: 'View appointments calendar',
      category: 'navigation',
      icon: CalendarIcon,
      action: () => {
        router.push('/dashboard/appointments');
        closeAndTrack('nav-appointments');
      },
      keywords: ['schedule', 'calendar'],
    },
    {
      id: 'nav-scribe',
      name: 'Go to AI Scribe',
      description: 'Start AI transcription',
      category: 'navigation',
      icon: SparklesIcon,
      action: () => {
        router.push('/dashboard/scribe');
        closeAndTrack('nav-scribe');
      },
      keywords: ['dictation', 'voice', 'transcription'],
    },

    // Quick Actions
    {
      id: 'action-new-note',
      name: 'Create New SOAP Note',
      description: 'Start a new clinical note',
      category: 'actions',
      icon: DocumentTextIcon,
      action: () => {
        // This would open a modal or navigate
        console.log('Create new note');
        closeAndTrack('action-new-note');
      },
      keywords: ['note', 'soap', 'documentation'],
      shortcut: 'cmd+n',
    },
    {
      id: 'action-new-appointment',
      name: 'Schedule Appointment',
      description: 'Create a new appointment',
      category: 'actions',
      icon: CalendarIcon,
      action: () => {
        router.push('/dashboard/appointments?new=true');
        closeAndTrack('action-new-appointment');
      },
      keywords: ['schedule', 'book', 'appointment'],
      shortcut: 'cmd+shift+a',
    },
    {
      id: 'action-templates',
      name: 'Insert Template',
      description: 'Browse clinical templates',
      category: 'actions',
      icon: SparklesIcon,
      action: () => {
        // This would trigger the template picker
        console.log('Open template picker');
        closeAndTrack('action-templates');
      },
      keywords: ['template', 'macro', 'shortcut'],
      shortcut: 'cmd+t',
    },

    // Settings
    {
      id: 'settings-profile',
      name: 'Settings',
      description: 'Manage your account settings',
      category: 'settings',
      icon: Cog6ToothIcon,
      action: () => {
        router.push('/dashboard/settings');
        closeAndTrack('settings-profile');
      },
      keywords: ['preferences', 'account', 'profile'],
    },
  ], [router]);

  /**
   * All commands (built-in + custom)
   */
  const allCommands = useMemo(() => {
    return [...builtInCommands, ...customCommands];
  }, [builtInCommands, customCommands]);

  /**
   * Patient search
   */
  const searchPatients = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setPatients([]);
      return;
    }

    setLoadingPatients(true);
    try {
      const response = await fetch(`/api/patients?q=${encodeURIComponent(searchQuery)}&limit=5`);
      if (response.ok) {
        const data = await response.json();
        setPatients(data.data || []);
      }
    } catch (error) {
      console.error('Error searching patients:', error);
    } finally {
      setLoadingPatients(false);
    }
  }, []);

  /**
   * Debounced patient search
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.startsWith('@')) {
        searchPatients(query.slice(1));
      } else {
        setPatients([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchPatients]);

  /**
   * Filter commands by query
   */
  const filteredCommands = useMemo(() => {
    if (query === '' || query.startsWith('@')) {
      // Show recent commands
      const recent = recentCommands
        .map(id => allCommands.find(c => c.id === id))
        .filter(Boolean) as Command[];

      return recent.length > 0 ? recent : allCommands.slice(0, 10);
    }

    const lowerQuery = query.toLowerCase();

    return allCommands.filter(command => {
      const nameMatch = command.name.toLowerCase().includes(lowerQuery);
      const descMatch = command.description?.toLowerCase().includes(lowerQuery);
      const keywordMatch = command.keywords?.some(k => k.toLowerCase().includes(lowerQuery));

      return nameMatch || descMatch || keywordMatch;
    });
  }, [query, allCommands, recentCommands]);

  /**
   * Group commands by category
   */
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {};

    filteredCommands.forEach(command => {
      if (!groups[command.category]) {
        groups[command.category] = [];
      }
      groups[command.category].push(command);
    });

    return groups;
  }, [filteredCommands]);

  /**
   * Patient commands
   */
  const patientCommands: Command[] = useMemo(() => {
    return patients.map(patient => ({
      id: `patient-${patient.id}`,
      name: `${patient.firstName} ${patient.lastName}`,
      description: `MRN: ${patient.mrn}`,
      category: 'patients' as const,
      icon: UserGroupIcon,
      action: () => {
        router.push(`/dashboard/patients/${patient.id}`);
        setIsOpen(false);
      },
    }));
  }, [patients, router]);

  /**
   * Close and track command usage
   */
  const closeAndTrack = useCallback((commandId: string) => {
    setIsOpen(false);
    setQuery('');

    // Track recent commands
    setRecentCommands(prev => {
      const filtered = prev.filter(id => id !== commandId);
      return [commandId, ...filtered].slice(0, 5);
    });
  }, []);

  /**
   * Open command palette
   */
  const openPalette = useCallback(() => {
    setIsOpen(true);
  }, []);

  /**
   * Close command palette
   */
  const closePalette = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setPatients([]);
  }, []);

  /**
   * Register global keyboard shortcut
   */
  useKeyboardShortcuts([
    {
      id: 'open-command-palette',
      keys: 'cmd+k',
      description: 'Open command palette',
      action: openPalette,
    },
  ]);

  /**
   * Get category label
   */
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'navigation': return 'Navigation';
      case 'actions': return 'Actions';
      case 'patients': return 'Patients';
      case 'settings': return 'Settings';
      case 'recent': return 'Recent';
      default: return category;
    }
  };

  /**
   * Get category icon
   */
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'navigation': return ArrowRightIcon;
      case 'actions': return SparklesIcon;
      case 'patients': return UserGroupIcon;
      case 'settings': return Cog6ToothIcon;
      case 'recent': return ClockIcon;
      default: return MagnifyingGlassIcon;
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={closePalette}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4 pt-[20vh]">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-xl bg-white dark:bg-gray-900 shadow-2xl transition-all border border-gray-200 dark:border-gray-700">
                <Combobox
                  onChange={(command: Command) => {
                    if (command) {
                      command.action();
                    }
                  }}
                >
                  {/* Search Input */}
                  <div className="relative">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-gray-400" />
                    <Combobox.Input
                      className="w-full border-0 bg-transparent pl-12 pr-4 py-4 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-0 text-lg"
                      placeholder="Search commands or type @ to search patients..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      autoFocus
                    />
                  </div>

                  {/* Results */}
                  {(filteredCommands.length > 0 || patientCommands.length > 0) && (
                    <Combobox.Options
                      static
                      className="max-h-96 overflow-y-auto border-t border-gray-200 dark:border-gray-700"
                    >
                      {/* Patient Results */}
                      {query.startsWith('@') && patientCommands.length > 0 && (
                        <div className="p-2">
                          <div className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Patients
                          </div>
                          {patientCommands.map((command) => (
                            <Combobox.Option
                              key={command.id}
                              value={command}
                              className={({ active }) =>
                                `flex items-center gap-3 px-4 py-3 cursor-pointer rounded-lg ${
                                  active
                                    ? 'bg-blue-50 dark:bg-blue-900/20'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`
                              }
                            >
                              {({ active }) => (
                                <>
                                  {command.icon && (
                                    <command.icon className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900 dark:text-white truncate">
                                      {command.name}
                                    </div>
                                    {command.description && (
                                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                        {command.description}
                                      </div>
                                    )}
                                  </div>
                                  <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                                </>
                              )}
                            </Combobox.Option>
                          ))}
                        </div>
                      )}

                      {/* Command Results */}
                      {!query.startsWith('@') && Object.entries(groupedCommands).map(([category, commands]) => (
                        <div key={category} className="p-2">
                          <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            {(() => {
                              const Icon = getCategoryIcon(category);
                              return <Icon className="w-3 h-3" />;
                            })()}
                            {getCategoryLabel(category)}
                          </div>
                          {commands.map((command) => (
                            <Combobox.Option
                              key={command.id}
                              value={command}
                              className={({ active }) =>
                                `flex items-center gap-3 px-4 py-3 cursor-pointer rounded-lg ${
                                  active
                                    ? 'bg-blue-50 dark:bg-blue-900/20'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`
                              }
                            >
                              {({ active }) => (
                                <>
                                  {command.icon && (
                                    <command.icon className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900 dark:text-white truncate">
                                      {command.name}
                                    </div>
                                    {command.description && (
                                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                        {command.description}
                                      </div>
                                    )}
                                  </div>
                                  {command.shortcut && (
                                    <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-xs font-mono">
                                      {formatShortcut(command.shortcut)}
                                    </kbd>
                                  )}
                                  <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                                </>
                              )}
                            </Combobox.Option>
                          ))}
                        </div>
                      ))}
                    </Combobox.Options>
                  )}

                  {/* Empty State */}
                  {query !== '' && !query.startsWith('@') && filteredCommands.length === 0 && (
                    <div className="px-6 py-14 text-center">
                      <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                        No commands found for "{query}"
                      </p>
                      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                        Try searching for something else or type @ to search patients
                      </p>
                    </div>
                  )}

                  {/* Patient Loading */}
                  {query.startsWith('@') && loadingPatients && (
                    <div className="px-6 py-14 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Searching patients...</p>
                    </div>
                  )}

                  {/* Patient Empty State */}
                  {query.startsWith('@') && !loadingPatients && patientCommands.length === 0 && query.length > 1 && (
                    <div className="px-6 py-14 text-center">
                      <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                        No patients found for "{query.slice(1)}"
                      </p>
                    </div>
                  )}
                </Combobox>

                {/* Footer */}
                <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <kbd className="px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">↑↓</kbd>
                        Navigate
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">↵</kbd>
                        Select
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">Esc</kbd>
                        Close
                      </span>
                    </div>
                    <span className="hidden sm:block">
                      Type @ to search patients
                    </span>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
