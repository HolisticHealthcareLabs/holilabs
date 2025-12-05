/**
 * Rule Manager Component
 *
 * Interface for managing CDS rules
 * Medical naming: "Rule Manager" (clinical protocol management interface)
 *
 * Features:
 * - Enable/disable individual rules
 * - View rule details and evidence strength
 * - Filter by category and hook type
 * - Rule performance statistics
 * - Bulk operations
 */

'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CDSRule, EvidenceStrength } from '@/lib/cds/types';

interface RuleManagerProps {
  rules: CDSRule[];
  loading?: boolean;
  onRuleToggle?: (ruleId: string, enabled: boolean) => void;
  className?: string;
}

const evidenceColors: Record<EvidenceStrength, string> = {
  'A': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'B': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'C': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'D': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'insufficient': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

const categoryIcons: Record<string, string> = {
  'drug-interaction': '💊',
  'allergy': '⚠️',
  'guideline-recommendation': '📋',
  'lab-abnormal': '🔬',
  'preventive-care': '🛡️',
  'duplicate-therapy': '🔄',
  'contraindication': '🚫',
  'dosing-guidance': '💉',
};

export function RuleManager({
  rules,
  loading = false,
  onRuleToggle,
  className = '',
}: RuleManagerProps) {
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter rules
  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      // Category filter
      if (categoryFilter !== 'all' && rule.category !== categoryFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          rule.name.toLowerCase().includes(query) ||
          rule.description.toLowerCase().includes(query) ||
          rule.source?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [rules, categoryFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: rules.length,
      enabled: rules.filter((r) => r.enabled).length,
      disabled: rules.filter((r) => !r.enabled).length,
      critical: rules.filter((r) => r.severity === 'critical').length,
    };
  }, [rules]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(rules.map((r) => r.category));
    return Array.from(cats);
  }, [rules]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Rule Manager
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure clinical decision support rules
            </p>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {stats.total}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Total Rules
            </div>
          </div>
          <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {stats.enabled}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Enabled
            </div>
          </div>
          <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="text-lg font-bold text-gray-600 dark:text-gray-400">
              {stats.disabled}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Disabled
            </div>
          </div>
          <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded">
            <div className="text-lg font-bold text-red-600 dark:text-red-400">
              {stats.critical}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Critical
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {categoryIcons[cat] || '📌'} {cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </option>
            ))}
          </select>

          <input
            type="search"
            placeholder="Search rules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-sm"
          />
        </div>
      </div>

      {/* Rules List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin text-4xl mb-2">⚙️</div>
              <p className="text-gray-600 dark:text-gray-400">Loading rules...</p>
            </div>
          </div>
        )}

        {!loading && filteredRules.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-5xl mb-3">🔍</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Rules Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {rules.length === 0
                  ? 'No CDS rules available'
                  : 'No rules match your current filters'}
              </p>
            </div>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {filteredRules.map((rule) => (
            <motion.div
              key={rule.id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`
                border-2 rounded-lg transition-all
                ${rule.enabled
                  ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  : 'bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700 opacity-60'
                }
              `}
            >
              {/* Rule Header */}
              <div
                className="flex items-start gap-3 p-3 cursor-pointer"
                onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
              >
                {/* Toggle Switch */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRuleToggle?.(rule.id, !rule.enabled);
                  }}
                  className={`
                    relative flex-shrink-0 w-12 h-6 rounded-full transition-colors
                    ${rule.enabled
                      ? 'bg-green-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                    }
                  `}
                >
                  <motion.div
                    animate={{ x: rule.enabled ? 24 : 2 }}
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                  />
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">
                      {categoryIcons[rule.category] || '📌'}
                    </span>
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                      {rule.name}
                    </h3>
                    {rule.evidenceStrength && (
                      <span className={`
                        text-xs font-bold px-1.5 py-0.5 rounded
                        ${evidenceColors[rule.evidenceStrength]}
                      `}>
                        Grade {rule.evidenceStrength}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    {rule.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                    <span>Priority: {rule.priority}</span>
                    <span>•</span>
                    <span className="capitalize">{rule.severity}</span>
                    {rule.source && (
                      <>
                        <span>•</span>
                        <span>{rule.source}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Expand Icon */}
                <motion.div
                  animate={{ rotate: expandedRule === rule.id ? 180 : 0 }}
                  className="flex-shrink-0 text-lg opacity-60"
                >
                  ▼
                </motion.div>
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {expandedRule === rule.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-gray-200 dark:border-gray-700"
                  >
                    <div className="p-3 space-y-3 text-sm">
                      {/* Trigger Hooks */}
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                          Trigger Points
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {rule.triggerHooks.map((hook) => (
                            <span
                              key={hook}
                              className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs"
                            >
                              {hook}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Evidence & Source */}
                      {(rule.evidenceStrength || rule.source) && (
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                            Evidence
                          </h4>
                          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                            {rule.evidenceStrength && (
                              <div>
                                <strong>Strength:</strong> Grade {rule.evidenceStrength}
                                {rule.evidenceStrength === 'A' && ' (High quality evidence)'}
                                {rule.evidenceStrength === 'B' && ' (Moderate quality evidence)'}
                                {rule.evidenceStrength === 'C' && ' (Low quality evidence)'}
                              </div>
                            )}
                            {rule.source && (
                              <div>
                                <strong>Source:</strong> {rule.source}
                              </div>
                            )}
                            {rule.sourceUrl && (
                              <div>
                                <a
                                  href={rule.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
                                >
                                  View Guidelines →
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRuleToggle?.(rule.id, !rule.enabled);
                          }}
                          className={`
                            px-3 py-1.5 text-xs font-medium rounded transition-colors
                            ${rule.enabled
                              ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                            }
                          `}
                        >
                          {rule.enabled ? 'Disable Rule' : 'Enable Rule'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
