'use client';

/**
 * Global Patient Search Component
 *
 * Production-grade search with:
 * - Cmd+K / Ctrl+K shortcut
 * - Real-time fuzzy search
 * - Keyboard navigation
 * - Recent searches
 * - Mobile optimized
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface Patient {
  id: string;
  tokenId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  mrn: string | null;
  phone: string | null;
  gender: string | null;
  profilePictureUrl: string | null;
  isActive: boolean;
  isPalliativeCare: boolean;
  age: number | null;
}

interface SearchResult {
  patients: Patient[];
  query: string;
  count: number;
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Load recent searches
  useEffect(() => {
    const saved = localStorage.getItem('holilabs-recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load recent searches:', e);
      }
    }
  }, []);

  // Save recent search
  const saveRecentSearch = useCallback((searchQuery: string) => {
    setRecentSearches(prev => {
      const updated = [searchQuery, ...prev.filter(q => q !== searchQuery)].slice(0, 5);
      localStorage.setItem('holilabs-recent-searches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
        setResults([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Search patients (debounced)
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/search/patients?q=' + encodeURIComponent(query) + '&limit=10');
        if (res.ok) {
          const data: SearchResult = await res.json();
          setResults(data.patients);
          setSelectedIndex(0);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Navigate to patient
  const navigateToPatient = useCallback((patient: Patient) => {
    saveRecentSearch(query);
    router.push('/dashboard/patients/' + patient.id);
    setIsOpen(false);
    setQuery('');
    setResults([]);
  }, [query, router, saveRecentSearch]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      navigateToPatient(results[selectedIndex]);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <MagnifyingGlassIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Search patients...</span>
        <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded">
          <span>Cmd</span>K
        </kbd>
      </button>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      <div className="fixed inset-x-4 top-20 z-50 mx-auto max-w-2xl">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search by name, MRN, token ID, phone..."
              className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 outline-none text-base"
            />
            {isLoading && (
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {query.length < 2 && recentSearches.length > 0 && (
              <div className="p-4">
                {/* Decorative - low contrast intentional for section header */}
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                  Recent Searches
                </p>
                {recentSearches.map((search, idx) => (
                  <button
                    key={idx}
                    onClick={() => setQuery(search)}
                    className="block w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                  >
                    {search}
                  </button>
                ))}
              </div>
            )}

            {query.length >= 2 && results.length === 0 && !isLoading && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <p className="text-sm">No patients found for "{query}"</p>
                <p className="text-xs mt-1">Try searching by name, MRN, or token ID</p>
              </div>
            )}

            {results.length > 0 && (
              <div className="py-2">
                {results.map((patient, idx) => (
                  <button
                    key={patient.id}
                    onClick={() => navigateToPatient(patient)}
                    className={'w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ' + (idx === selectedIndex ? 'bg-gray-100 dark:bg-gray-800' : '')}
                  >
                    <div className="flex-shrink-0">
                      {patient.profilePictureUrl ? (
                        <img
                          src={patient.profilePictureUrl}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                          {patient.firstName?.[0]}{patient.lastName?.[0]}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {patient.firstName} {patient.lastName}
                        {patient.isPalliativeCare && (
                          <span className="ml-2 text-xs text-purple-600 dark:text-purple-400">
                            Palliative
                          </span>
                        )}
                      </p>
                      {/* Decorative - low contrast intentional for patient metadata */}
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {patient.mrn && <span>MRN: {patient.mrn}</span>}
                        {patient.age !== null && <span>{patient.age}y</span>}
                        {patient.gender && <span>{patient.gender}</span>}
                      </div>
                    </div>

                    {!patient.isActive && (
                      <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                        Inactive
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
            {/* Decorative - low contrast intentional for keyboard shortcuts */}
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded">Arrows</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded">Enter</kbd>
                  Select
                </span>
              </div>
              <span>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded">esc</kbd>
                Close
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
