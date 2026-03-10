'use client';

/**
 * Smart Templates Panel (DB-driven)
 *
 * Fetches clinical content from /api/clinical/content which resolves
 * the Dynamic Content Matrix for the active session user.
 * No hardcoded templates are imported.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  MagnifyingGlassIcon,
  SparklesIcon,
  ClockIcon,
  PlusIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface TemplateVariable {
  name: string;
  type: string;
  required?: boolean;
  placeholder?: string;
}

interface TemplateSchemaPayload {
  templateContent: string;
  variables: TemplateVariable[];
  keywords: string[];
  voiceCommand: string | null;
  category: string;
}

interface ResolvedDefinition {
  contentDefinitionId: string;
  canonicalKey: string;
  kind: string;
  title: string;
  summary: string | null;
  version: number;
  disciplineSource: string;
  priority: number;
  overlapGroup: string | null;
  schemaPayload: TemplateSchemaPayload;
  metadata: unknown | null;
  blocks: unknown[];
}

interface ContentMatrixResponse {
  tenantId: string;
  persona: string;
  locale: string;
  disciplines: string[];
  totalDefinitions: number;
  definitions: ResolvedDefinition[];
  error?: string;
}

type CategoryKey =
  | 'chief-complaint'
  | 'ros'
  | 'physical-exam'
  | 'assessment'
  | 'plan'
  | 'procedure'
  | 'intake';

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  'chief-complaint': 'Chief Complaint',
  'ros': 'Review of Systems',
  'physical-exam': 'Physical Exam',
  'assessment': 'Assessment',
  'plan': 'Plan',
  'procedure': 'Procedure',
  'intake': 'Intake',
};

function fillTemplateContent(
  content: string,
  values: Record<string, string>
): string {
  let result = content;
  for (const [key, value] of Object.entries(values)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, value || `{${key}}`);
  }
  return result;
}

interface SmartTemplatesPanelProps {
  onInsertTemplate: (content: string) => void;
  currentText?: string;
}

export function SmartTemplatesPanel({
  onInsertTemplate,
  currentText = '',
}: SmartTemplatesPanelProps) {
  const [definitions, setDefinitions] = useState<ResolvedDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | 'all'>('all');
  const [selectedDef, setSelectedDef] = useState<ResolvedDefinition | null>(null);
  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setFetchError(null);

      try {
        const res = await fetch('/api/clinical/content');
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data: ContentMatrixResponse = await res.json();

        if (data.error) {
          throw new Error(data.error);
        }

        if (!cancelled) {
          setDefinitions(data.definitions ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setFetchError(
            err instanceof Error ? err.message : 'Failed to load clinical content'
          );
          setDefinitions([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  const filteredDefinitions = useMemo(() => {
    let pool = definitions;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      pool = pool.filter((d) => {
        const payload = d.schemaPayload;
        return (
          d.title.toLowerCase().includes(q) ||
          (d.summary ?? '').toLowerCase().includes(q) ||
          (payload.keywords ?? []).some((k: string) => k.toLowerCase().includes(q))
        );
      });
    }

    if (selectedCategory !== 'all') {
      pool = pool.filter((d) => d.schemaPayload.category === selectedCategory);
    }

    return pool;
  }, [definitions, searchQuery, selectedCategory]);

  const suggestions = useMemo(() => {
    if (!currentText.trim()) return [];
    const lower = currentText.toLowerCase();
    return definitions
      .filter((d) =>
        (d.schemaPayload.keywords ?? []).some((k: string) =>
          lower.includes(k.toLowerCase())
        )
      )
      .slice(0, 3);
  }, [currentText, definitions]);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const d of definitions) {
      if (d.schemaPayload.category) cats.add(d.schemaPayload.category);
    }
    return Array.from(cats).sort() as CategoryKey[];
  }, [definitions]);

  const handleSelect = useCallback((def: ResolvedDefinition) => {
    setSelectedDef(def);
    const initial: Record<string, string> = {};
    for (const v of def.schemaPayload.variables ?? []) {
      initial[v.name] = '';
    }
    setTemplateValues(initial);
  }, []);

  const handleInsert = useCallback(() => {
    if (!selectedDef) return;
    const filled = fillTemplateContent(
      selectedDef.schemaPayload.templateContent,
      templateValues
    );
    onInsertTemplate(filled);

    if (!recentIds.includes(selectedDef.contentDefinitionId)) {
      setRecentIds((prev) => [selectedDef.contentDefinitionId, ...prev.slice(0, 4)]);
    }

    setSelectedDef(null);
    setTemplateValues({});
  }, [selectedDef, templateValues, onInsertTemplate, recentIds]);

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="h-6 w-40 rounded bg-gray-200 dark:bg-gray-700 animate-pulse mb-3" />
          <div className="h-10 w-full rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
          <div className="flex gap-2 mt-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-7 w-20 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 w-full rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 items-center justify-center p-6">
        <ExclamationTriangleIcon className="w-10 h-10 text-amber-500 mb-3" />
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
          Content unavailable
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-4">
          {fetchError}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
          <SparklesIcon className="w-5 h-5 text-purple-600" />
          Smart Templates
          <span className="ml-auto text-xs font-normal text-gray-400 dark:text-gray-500">
            {definitions.length} available
          </span>
        </h2>

        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1 mt-3 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            All
          </button>
          {availableCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>
      </div>

      {suggestions.length > 0 && !selectedDef && (
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800">
          <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-2 flex items-center gap-2">
            <SparklesIcon className="w-4 h-4" />
            AI Suggestions
          </h3>
          <div className="space-y-2">
            {suggestions.map((def) => (
              <button
                key={def.contentDefinitionId}
                onClick={() => handleSelect(def)}
                className="w-full text-left p-2 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 transition-colors"
              >
                <div className="text-sm font-medium text-gray-900 dark:text-white">{def.title}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{def.summary}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!selectedDef ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {recentIds.length > 0 && !searchQuery && selectedCategory === 'all' && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 flex items-center gap-2">
                <ClockIcon className="w-4 h-4" />
                Recently Used
              </h3>
              {recentIds.map((id) => {
                const def = definitions.find((d) => d.contentDefinitionId === id);
                if (!def) return null;
                return (
                  <button
                    key={def.contentDefinitionId}
                    onClick={() => handleSelect(def)}
                    className="w-full text-left p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{def.title}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{def.summary}</div>
                  </button>
                );
              })}
            </div>
          )}

          {filteredDefinitions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No templates found</p>
            </div>
          ) : (
            filteredDefinitions.map((def) => (
              <button
                key={def.contentDefinitionId}
                onClick={() => handleSelect(def)}
                className="w-full text-left p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{def.title}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{def.summary}</div>
                    {def.schemaPayload.voiceCommand && (
                      <div className="text-xs text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1">
                        <SparklesIcon className="w-3 h-3" />
                        Say: &ldquo;{def.schemaPayload.voiceCommand}&rdquo;
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <PlusIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1 flex-wrap">
                  <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                    {CATEGORY_LABELS[def.schemaPayload.category as CategoryKey] ?? def.schemaPayload.category}
                  </span>
                  {def.disciplineSource === 'universal' ? (
                    <span className="text-xs px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded">
                      Universal
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded">
                      {def.disciplineSource}
                    </span>
                  )}
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    v{def.version}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedDef.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{selectedDef.summary}</p>
            </div>
            <button
              onClick={() => setSelectedDef(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {(selectedDef.schemaPayload.variables ?? []).length > 0 && (
            <div className="space-y-3 mb-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Fill in details:</h4>
              {selectedDef.schemaPayload.variables.map((v) => (
                <div key={v.name}>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 capitalize">
                    {v.placeholder ?? v.name.replace(/_/g, ' ')}
                  </label>
                  <input
                    type="text"
                    value={templateValues[v.name] ?? ''}
                    onChange={(e) =>
                      setTemplateValues((prev) => ({ ...prev, [v.name]: e.target.value }))
                    }
                    placeholder={`Enter ${v.placeholder ?? v.name.replace(/_/g, ' ')}`}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Preview:</h4>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
              {fillTemplateContent(selectedDef.schemaPayload.templateContent, templateValues)}
            </div>
          </div>

          <button
            onClick={handleInsert}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Insert Template
          </button>
        </div>
      )}
    </div>
  );
}
