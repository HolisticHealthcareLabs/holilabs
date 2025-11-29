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
            className="fixed inset-x-4 top-20 bottom-20 md:inset-x-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[600px] md:max-h-[80vh] z-50
              bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl
              border border-white/20 dark:border-gray-700/50
              rounded-3xl shadow-2xl
              overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Widget Store
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Search */}
              <input
                type="text"
                placeholder="Search widgets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg
                  text-gray-900 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Widget List */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
              {Object.entries(widgetsByCategory).map(([category, categoryWidgets]) => {
                if (categoryWidgets.length === 0) return null;

                return (
                  <div key={category} className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {categoryWidgets.map((widget) => (
                        <motion.div
                          key={widget.id}
                          layout
                          className="flex items-center justify-between p-4 rounded-xl
                            bg-gray-50/50 dark:bg-gray-800/50
                            border border-gray-200/50 dark:border-gray-700/50
                            hover:bg-gray-100/50 dark:hover:bg-gray-800/50
                            transition-colors"
                        >
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                              {widget.name}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {widget.description}
                            </p>
                          </div>
                          <button
                            onClick={() => onToggle(widget.id)}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                              widget.enabled
                                ? 'bg-green-500'
                                : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                          >
                            <motion.span
                              className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm"
                              animate={{
                                x: widget.enabled ? 24 : 0,
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

