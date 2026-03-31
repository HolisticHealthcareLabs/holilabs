'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';

export interface WidgetConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: 'kpi' | 'clinical' | 'productivity';
}

interface WidgetStoreProps {
  widgets: WidgetConfig[];
  onToggle: (widgetId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function WidgetStore({ widgets, onToggle, isOpen, onClose }: WidgetStoreProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredWidgets = widgets.filter((w) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const widgetsByCategory = {
    kpi: filteredWidgets.filter((w) => w.category === 'kpi'),
    clinical: filteredWidgets.filter((w) => w.category === 'clinical'),
    productivity: filteredWidgets.filter((w) => w.category === 'productivity'),
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
            className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-40"
          />

          {/* HUD Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-20 bottom-20 md:inset-x-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[600px] md:h-[600px] z-50
              bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl
              border border-white/20 dark:border-gray-700/50
              flex flex-col"
            style={{ borderRadius: 'var(--radius-xl)', boxShadow: 'var(--token-shadow-xl)' }}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold dark:text-white" style={{ color: 'var(--text-primary)' }}>
                  Widget Store
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  style={{ borderRadius: 'var(--radius-lg)' }}
                >
                  <XMarkIcon className="w-5 h-5 dark:text-gray-400" style={{ color: 'var(--text-tertiary)' }} />
                </button>
              </div>

              {/* Search */}
              <input
                type="text"
                placeholder="Search widgets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 dark:bg-gray-800 dark:border-gray-700
                  dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'var(--surface-secondary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', color: 'var(--text-primary)' }}
              />
            </div>

            {/* Widget List */}
            <div className="flex-1 p-6 overflow-y-auto">
              {Object.entries(widgetsByCategory).map(([category, categoryWidgets]) => {
                if (categoryWidgets.length === 0) return null;

                return (
                  <div key={category} className="mb-6">
                    <h3 className="text-sm font-semibold dark:text-gray-400 uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {categoryWidgets.map((widget) => (
                        <motion.div
                          key={widget.id}
                          layout
                          className="flex items-center justify-between p-4
                            bg-gray-50/50 dark:bg-gray-800/50
                            border border-gray-200/50 dark:border-gray-700/50
                            hover:bg-gray-100/50 dark:hover:bg-gray-800/50
                            transition-colors"
                          style={{ borderRadius: 'var(--radius-xl)' }}
                        >
                          <div className="flex-1">
                            <h4 className="font-semibold dark:text-white mb-1" style={{ color: 'var(--text-primary)' }}>
                              {widget.name}
                            </h4>
                            <p className="text-sm dark:text-gray-400" style={{ color: 'var(--text-secondary)' }}>
                              {widget.description}
                            </p>
                          </div>
                          <button
                            onClick={() => onToggle(widget.id)}
                            className={`relative w-16 h-8 rounded-full transition-all flex items-center ${
                              widget.enabled
                                ? 'bg-green-500'
                                : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                            style={{
                              WebkitTapHighlightColor: 'transparent'
                            }}
                          >
                            {/* On/Off Text */}
                            <span 
                              className={`absolute left-2 text-[10px] font-semibold transition-opacity ${
                                widget.enabled ? 'opacity-0' : 'opacity-100 text-gray-700'
                              }`}
                            >
                              OFF
                            </span>
                            <span 
                              className={`absolute right-2 text-[10px] font-semibold transition-opacity ${
                                widget.enabled ? 'opacity-100 text-white' : 'opacity-0'
                              }`}
                            >
                              ON
                            </span>
                            
                            {/* Sliding Circle */}
                            <motion.span
                              className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md"
                              animate={{
                                x: widget.enabled ? 32 : 0,
                              }}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

