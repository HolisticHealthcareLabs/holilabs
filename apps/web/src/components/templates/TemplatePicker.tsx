'use client';

/**
 * Clinical Template Picker Component
 *
 * Production-grade template selection with:
 * - Cmd+Shift+T / Ctrl+Shift+T shortcut
 * - Search by name, shortcut, content
 * - Category filtering
 * - Variable substitution
 * - Recent templates
 * - Favorites support
 * - Hospital-grade UX (Epic SmartPhrases / Cerner PowerPlans)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MagnifyingGlassIcon,
  SparklesIcon,
  HeartIcon,
  ClockIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'select';
  default?: string | number;
  options?: string[];
}

interface ClinicalTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  specialty?: string;
  content: string;
  variables?: TemplateVariable[];
  shortcut?: string;
  isOfficial: boolean;
  useCount: number;
  isFavorite?: boolean;
}

interface TemplatePickerProps {
  /** Callback when template is selected */
  onSelect: (content: string, template: ClinicalTemplate) => void;

  /** Optional current text context for smart suggestions */
  context?: string;

  /** Filter templates by category */
  categoryFilter?: string;

  /** Show favorites only */
  favoritesOnly?: boolean;
}

const TEMPLATE_CATEGORIES = [
  { value: 'ALL', label: 'All Templates', icon: '=Ë' },
  { value: 'CHIEF_COMPLAINT', label: 'Chief Complaint', icon: '>z' },
  { value: 'HISTORY_OF_PRESENT_ILLNESS', label: 'HPI', icon: '=Ý' },
  { value: 'PHYSICAL_EXAM', label: 'Physical Exam', icon: '=' },
  { value: 'ASSESSMENT', label: 'Assessment', icon: '=­' },
  { value: 'PLAN', label: 'Plan', icon: '=Ê' },
  { value: 'PRESCRIPTION', label: 'Prescription', icon: '=Š' },
  { value: 'PATIENT_EDUCATION', label: 'Education', icon: '=Ú' },
  { value: 'PROGRESS_NOTE', label: 'Progress Note', icon: '=È' },
];

export function TemplatePicker({
  onSelect,
  context,
  categoryFilter,
  favoritesOnly = false,
}: TemplatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [templates, setTemplates] = useState<ClinicalTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(categoryFilter || 'ALL');
  const [selectedTemplate, setSelectedTemplate] = useState<ClinicalTemplate | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [recentTemplates, setRecentTemplates] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent templates from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('holilabs-recent-templates');
    if (saved) {
      try {
        setRecentTemplates(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load recent templates:', e);
      }
    }
  }, []);

  // Global keyboard shortcut: Cmd+Shift+T
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 't') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        if (selectedTemplate) {
          setSelectedTemplate(null);
          setVariableValues({});
        } else {
          setIsOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedTemplate]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current && !selectedTemplate) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, selectedTemplate]);

  // Fetch templates
  useEffect(() => {
    if (!isOpen) return;

    const fetchTemplates = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (query) params.set('q', query);
        if (selectedCategory !== 'ALL') params.set('category', selectedCategory);
        params.set('limit', '50');

        const res = await fetch(`/api/templates?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setTemplates(data.templates || []);
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchTemplates, 300);
    return () => clearTimeout(timeoutId);
  }, [isOpen, query, selectedCategory]);

  // Save recent template
  const saveRecentTemplate = useCallback((templateId: string) => {
    setRecentTemplates(prev => {
      const updated = [templateId, ...prev.filter(id => id !== templateId)].slice(0, 5);
      localStorage.setItem('holilabs-recent-templates', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Handle template selection
  const handleTemplateClick = useCallback((template: ClinicalTemplate) => {
    if (template.variables && template.variables.length > 0) {
      // Template has variables - show variable input form
      setSelectedTemplate(template);

      // Initialize variable values with defaults
      const defaults: Record<string, string> = {};
      template.variables.forEach(v => {
        defaults[v.name] = String(v.default || '');
      });
      setVariableValues(defaults);
    } else {
      // No variables - insert directly
      saveRecentTemplate(template.id);
      onSelect(template.content, template);
      setIsOpen(false);
      setQuery('');
    }
  }, [onSelect, saveRecentTemplate]);

  // Handle template insertion with variables
  const handleInsertTemplate = useCallback(() => {
    if (!selectedTemplate) return;

    // Replace {{variable}} placeholders with actual values
    let content = selectedTemplate.content;
    Object.entries(variableValues).forEach(([name, value]) => {
      const regex = new RegExp(`\\{\\{${name}\\}\\}`, 'g');
      content = content.replace(regex, value);
    });

    saveRecentTemplate(selectedTemplate.id);
    onSelect(content, selectedTemplate);

    // Reset state
    setIsOpen(false);
    setSelectedTemplate(null);
    setVariableValues({});
    setQuery('');
  }, [selectedTemplate, variableValues, onSelect, saveRecentTemplate]);

  // Filter templates by recent/favorites
  const filteredTemplates = templates.filter(template => {
    if (favoritesOnly && !template.isFavorite) return false;
    return true;
  });

  // Show recent templates
  const recentTemplateObjects = templates.filter(t => recentTemplates.includes(t.id));

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        title="Insert template (Cmd+Shift+T)"
      >
        <SparklesIcon className="w-4 h-4" />
        <span>Templates</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-semibold text-gray-500 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded">
          <span>Cmd</span>+<span>Shift</span>+<span>T</span>
        </kbd>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => {
          if (selectedTemplate) {
            setSelectedTemplate(null);
            setVariableValues({});
          } else {
            setIsOpen(false);
          }
        }}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-20 z-50 mx-auto max-w-4xl">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">

          {!selectedTemplate ? (
            // Template Selection View
            <>
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <SparklesIcon className="w-5 h-5 text-blue-600" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search templates by name, shortcut, or content..."
                  className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 outline-none text-base"
                />
                {isLoading && (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Categories */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-2 overflow-x-auto">
                  {TEMPLATE_CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => setSelectedCategory(cat.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                        selectedCategory === cat.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Templates List */}
              <div className="max-h-[500px] overflow-y-auto">
                {/* Recent Templates */}
                {query === '' && recentTemplateObjects.length > 0 && (
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-3">
                      <ClockIcon className="w-4 h-4 text-gray-500" />
                      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        Recently Used
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {recentTemplateObjects.map(template => (
                        <TemplateItem
                          key={template.id}
                          template={template}
                          onClick={() => handleTemplateClick(template)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* All Templates */}
                {filteredTemplates.length > 0 ? (
                  <div className="p-4 space-y-2">
                    {filteredTemplates.map(template => (
                      <TemplateItem
                        key={template.id}
                        template={template}
                        onClick={() => handleTemplateClick(template)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    <p className="text-sm">No templates found</p>
                    <p className="text-xs mt-1">Try adjusting your search or category filter</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{filteredTemplates.length} templates available</span>
                  <span>
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded">esc</kbd>
                    {' '}Close
                  </span>
                </div>
              </div>
            </>
          ) : (
            // Variable Input View
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedTemplate.name}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedTemplate.description || 'Fill in the template variables'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTemplate(null);
                      setVariableValues({});
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Variable Inputs */}
              <div className="p-4 max-h-[400px] overflow-y-auto space-y-4">
                {selectedTemplate.variables?.map(variable => (
                  <div key={variable.name}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {variable.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </label>
                    {variable.type === 'select' && variable.options ? (
                      <select
                        value={variableValues[variable.name] || ''}
                        onChange={(e) => setVariableValues(prev => ({ ...prev, [variable.name]: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select...</option>
                        {variable.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={variable.type === 'number' ? 'number' : variable.type === 'date' ? 'date' : 'text'}
                        value={variableValues[variable.name] || ''}
                        onChange={(e) => setVariableValues(prev => ({ ...prev, [variable.name]: e.target.value }))}
                        placeholder={String(variable.default || '')}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Preview</h3>
                <div className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {(() => {
                    let preview = selectedTemplate.content;
                    Object.entries(variableValues).forEach(([name, value]) => {
                      const regex = new RegExp(`\\{\\{${name}\\}\\}`, 'g');
                      preview = preview.replace(regex, value || `{{${name}}}`);
                    });
                    return preview;
                  })()}
                </div>
              </div>

              {/* Actions */}
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedTemplate(null);
                    setVariableValues({});
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleInsertTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <CheckIcon className="w-4 h-4" />
                  Insert Template
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// Template Item Component
function TemplateItem({
  template,
  onClick,
}: {
  template: ClinicalTemplate;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {template.name}
            </h4>
            {template.isOfficial && (
              <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded">
                Official
              </span>
            )}
            {template.shortcut && (
              <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-mono rounded">
                {template.shortcut}
              </span>
            )}
          </div>
          {template.description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-1">
              {template.description}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
            <span>{template.category.replace(/_/g, ' ')}</span>
            {template.specialty && (
              <>
                <span>"</span>
                <span>{template.specialty}</span>
              </>
            )}
            <span>"</span>
            <span>Used {template.useCount} times</span>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Toggle favorite
          }}
          className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
        >
          {template.isFavorite ? (
            <HeartSolidIcon className="w-4 h-4 text-red-500" />
          ) : (
            <HeartIcon className="w-4 h-4" />
          )}
        </button>
      </div>
    </button>
  );
}
