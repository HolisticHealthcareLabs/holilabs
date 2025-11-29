'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
  dateOfBirth?: string;
}

interface CommandKPatientSelectorProps {
  onSelect?: (patient: Patient) => void;
}

export function CommandKPatientSelector({ onSelect }: CommandKPatientSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Load patients
    fetch('/api/patients?limit=100')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPatients(data.data || []);
        }
      })
      .catch(console.error);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
      }

      // Arrow keys navigation
      if (isOpen) {
        const filtered = filteredPatients;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % filtered.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
        } else if (e.key === 'Enter' && filtered[selectedIndex]) {
          e.preventDefault();
          handleSelect(filtered[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const filteredPatients = patients.filter(
    (p) =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(query.toLowerCase()) ||
      p.mrn.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (patient: Patient) => {
    onSelect?.(patient);
    router.push(`/dashboard/patients/${patient.id}`);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <>
      {/* Trigger Button - Collapsed by default */}
      <motion.button
        layout
        onClick={() => setIsOpen(true)}
        className="h-10 px-4 rounded-lg bg-white/5 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50
          text-gray-600 dark:text-gray-400
          hover:bg-white/10 dark:hover:bg-gray-800/70
          transition-all duration-200
          flex items-center gap-2
          text-sm"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <span>Search patients...</span>
        <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-[10px] font-mono">
          ⌘K
        </kbd>
      </motion.button>

      {/* Expanded Search Interface */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-40"
            />

            {/* Search Panel */}
            <motion.div
              layoutId="command-k-panel"
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-1/4 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50
                bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl
                border border-white/20 dark:border-gray-700/50
                rounded-2xl shadow-2xl
                overflow-hidden"
            >
              {/* Input */}
              <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search by name or MRN..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg
                    text-gray-900 dark:text-white text-lg
                    focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Results */}
              <div className="max-h-96 overflow-y-auto">
                {filteredPatients.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    No patients found
                  </div>
                ) : (
                  filteredPatients.map((patient, index) => (
                    <motion.button
                      key={patient.id}
                      onClick={() => handleSelect(patient)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full px-4 py-3 text-left transition-colors ${
                        index === selectedIndex
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {patient.firstName} {patient.lastName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        MRN: {patient.mrn}
                      </div>
                    </motion.button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

