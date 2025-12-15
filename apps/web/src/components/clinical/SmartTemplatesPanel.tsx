'use client';

/**
 * Smart Templates Panel
 *
 * AI-powered clinical template library with:
 * - Quick template search and insertion
 * - Voice command support
 * - Variable auto-fill
 * - Category browsing
 * - Recently used templates
 */

import { useState, useMemo } from 'react';
import {
  MagnifyingGlassIcon,
  SparklesIcon,
  ClockIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  CLINICAL_TEMPLATES,
  type ClinicalTemplate,
  searchTemplates,
  getTemplatesByCategory,
  fillTemplate,
  getUnfilledVariables,
} from '@/lib/templates/clinical-templates';

interface SmartTemplatesPanelProps {
  onInsertTemplate: (content: string) => void;
  currentText?: string;
}

const CATEGORY_LABELS: Record<ClinicalTemplate['category'], string> = {
  'chief-complaint': 'Chief Complaint',
  'ros': 'Review of Systems',
  'physical-exam': 'Physical Exam',
  'assessment': 'Assessment',
  'plan': 'Plan',
  'procedure': 'Procedure',
};

export function SmartTemplatesPanel({ onInsertTemplate, currentText = '' }: SmartTemplatesPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ClinicalTemplate['category'] | 'all'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<ClinicalTemplate | null>(null);
  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});
  const [recentTemplates, setRecentTemplates] = useState<string[]>([]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let templates = searchQuery
      ? searchTemplates(searchQuery)
      : selectedCategory === 'all'
      ? CLINICAL_TEMPLATES
      : getTemplatesByCategory(selectedCategory);

    return templates;
  }, [searchQuery, selectedCategory]);

  // Handle template selection
  const handleSelectTemplate = (template: ClinicalTemplate) => {
    setSelectedTemplate(template);
    // Initialize values
    const initialValues: Record<string, string> = {};
    template.variables.forEach(v => {
      initialValues[v] = '';
    });
    setTemplateValues(initialValues);
  };

  // Handle template insertion
  const handleInsert = () => {
    if (!selectedTemplate) return;

    const filled = fillTemplate(selectedTemplate, templateValues);
    onInsertTemplate(filled);

    // Add to recent templates
    if (!recentTemplates.includes(selectedTemplate.id)) {
      setRecentTemplates([selectedTemplate.id, ...recentTemplates.slice(0, 4)]);
    }

    // Reset
    setSelectedTemplate(null);
    setTemplateValues({});
  };

  // Auto-suggest based on current text
  const suggestions = useMemo(() => {
    if (!currentText) return [];

    const lowerText = currentText.toLowerCase();
    return CLINICAL_TEMPLATES.filter(t =>
      t.keywords.some(k => lowerText.includes(k.toLowerCase()))
    ).slice(0, 3);
  }, [currentText]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
          <SparklesIcon className="w-5 h-5 text-purple-600" />
          Smart Templates
        </h2>

        {/* Search */}
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

        {/* Category Tabs */}
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
          {(Object.keys(CATEGORY_LABELS) as Array<ClinicalTemplate['category']>).map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                selectedCategory === category
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>
      </div>

      {/* AI Suggestions */}
      {suggestions.length > 0 && !selectedTemplate && (
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800">
          <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-2 flex items-center gap-2">
            <SparklesIcon className="w-4 h-4" />
            AI Suggestions
          </h3>
          <div className="space-y-2">
            {suggestions.map(template => (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className="w-full text-left p-2 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 transition-colors"
              >
                <div className="text-sm font-medium text-gray-900 dark:text-white">{template.name}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{template.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Template List */}
      {!selectedTemplate ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {/* Recent Templates */}
          {recentTemplates.length > 0 && !searchQuery && selectedCategory === 'all' && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 flex items-center gap-2">
                <ClockIcon className="w-4 h-4" />
                Recently Used
              </h3>
              {recentTemplates.map(id => {
                const template = CLINICAL_TEMPLATES.find(t => t.id === id);
                if (!template) return null;
                return (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className="w-full text-left p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{template.name}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{template.description}</div>
                  </button>
                );
              })}
            </div>
          )}

          {/* All Templates */}
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No templates found</p>
            </div>
          ) : (
            filteredTemplates.map(template => (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className="w-full text-left p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{template.name}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{template.description}</div>
                    {template.voiceCommand && (
                      <div className="text-xs text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1">
                        <SparklesIcon className="w-3 h-3" />
                        Say: "{template.voiceCommand}"
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <PlusIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1 flex-wrap">
                  <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                    {CATEGORY_LABELS[template.category]}
                  </span>
                  {template.variables.length > 0 && (
                    {/* Decorative - low contrast intentional for variable count metadata */}
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {template.variables.length} variable{template.variables.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      ) : (
        /* Template Editor */
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedTemplate.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{selectedTemplate.description}</p>
            </div>
            <button
              onClick={() => setSelectedTemplate(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Variable Inputs */}
          {selectedTemplate.variables.length > 0 && (
            <div className="space-y-3 mb-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Fill in details:</h4>
              {selectedTemplate.variables.map(variable => (
                <div key={variable}>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 capitalize">
                    {variable.replace(/_/g, ' ')}
                  </label>
                  <input
                    type="text"
                    value={templateValues[variable] || ''}
                    onChange={(e) =>
                      setTemplateValues(prev => ({ ...prev, [variable]: e.target.value }))
                    }
                    placeholder={`Enter ${variable.replace(/_/g, ' ')}`}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Preview */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Preview:</h4>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
              {fillTemplate(selectedTemplate, templateValues)}
            </div>
          </div>

          {/* Insert Button */}
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
