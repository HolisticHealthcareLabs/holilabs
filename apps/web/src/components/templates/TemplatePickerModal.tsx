'use client';

/**
 * Template Picker Modal - Industry Grade
 *
 * Production-ready template selector with:
 * - Search and filtering
 * - Keyboard shortcuts (Cmd/Ctrl+K)
 * - Favorites management
 * - Variable filling
 * - Usage tracking
 * - Categories and specialties
 */

import { useState, useEffect, useCallback, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  StarIcon,
  SparklesIcon,
  DocumentDuplicateIcon,
  ClockIcon,
  FunnelIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

interface Template {
  id: string;
  name: string;
  description?: string;
  category: string;
  specialty?: string;
  content: string;
  variables?: any[];
  shortcut?: string;
  isOfficial: boolean;
  useCount: number;
  isFavorite: boolean;
  createdBy: {
    firstName: string;
    lastName: string;
  };
}

interface TemplatePickerModalProps {
  /** Whether modal is open */
  isOpen: boolean;

  /** Callback when modal closes */
  onClose: () => void;

  /** Callback when template is selected */
  onSelect: (template: Template, filledContent: string) => void;

  /** Filter by category (optional) */
  category?: string;

  /** Filter by specialty (optional) */
  specialty?: string;
}

const CATEGORIES = [
  { value: 'CHIEF_COMPLAINT', label: 'Chief Complaint' },
  { value: 'HISTORY_OF_PRESENT_ILLNESS', label: 'HPI' },
  { value: 'REVIEW_OF_SYSTEMS', label: 'ROS' },
  { value: 'PHYSICAL_EXAM', label: 'Physical Exam' },
  { value: 'ASSESSMENT', label: 'Assessment' },
  { value: 'PLAN', label: 'Plan' },
  { value: 'PRESCRIPTION', label: 'Prescription' },
  { value: 'PROCEDURE_NOTE', label: 'Procedure Note' },
  { value: 'FOLLOW_UP', label: 'Follow-up' },
  { value: 'CUSTOM', label: 'Custom' },
];

export function TemplatePickerModal({
  isOpen,
  onClose,
  onSelect,
  category,
  specialty,
}: TemplatePickerModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(category || '');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [showVariableForm, setShowVariableForm] = useState(false);

  /**
   * Fetch templates from API
   */
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set('category', selectedCategory);
      if (specialty) params.set('specialty', specialty);
      if (showOnlyFavorites) params.set('favorites', 'true');

      const response = await fetch(`/api/templates?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, specialty, showOnlyFavorites]);

  /**
   * Filter templates by search query
   */
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTemplates(templates);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = templates.filter(
      t =>
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.shortcut?.toLowerCase().includes(query) ||
        t.content.toLowerCase().includes(query)
    );
    setFilteredTemplates(filtered);
  }, [searchQuery, templates]);

  /**
   * Load templates when modal opens or filters change
   */
  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen, fetchTemplates]);

  /**
   * Toggle favorite status
   */
  const toggleFavorite = async (template: Template, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const method = template.isFavorite ? 'DELETE' : 'POST';
      const response = await fetch(`/api/templates/${template.id}/favorites`, {
        method,
      });

      if (response.ok) {
        // Refresh templates
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  /**
   * Handle template selection
   */
  const handleSelectTemplate = (template: Template) => {
    // Check if template has variables
    const variables = template.variables as any[] || [];
    if (variables.length > 0) {
      setSelectedTemplate(template);
      // Initialize variable values with defaults
      const initialValues: Record<string, string> = {};
      variables.forEach((v: any) => {
        if (v.default) {
          initialValues[v.name] = v.default;
        }
      });
      setVariableValues(initialValues);
      setShowVariableForm(true);
    } else {
      // No variables, use template directly
      applyTemplate(template, {});
    }
  };

  /**
   * Use template with filled variables
   */
  const applyTemplate = async (template: Template, values: Record<string, string>) => {
    // Fill template content with variable values
    let filledContent = template.content;
    Object.entries(values).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      filledContent = filledContent.replace(regex, value);
    });

    // Track usage
    try {
      await fetch(`/api/templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'increment_usage' }),
      });
    } catch (error) {
      console.error('Error tracking usage:', error);
    }

    // Call onSelect callback
    onSelect(template, filledContent);

    // Reset and close
    setShowVariableForm(false);
    setSelectedTemplate(null);
    setVariableValues({});
    onClose();
  };

  /**
   * Handle variable form submission
   */
  const handleVariableFormSubmit = () => {
    if (selectedTemplate) {
      applyTemplate(selectedTemplate, variableValues);
    }
  };

  /**
   * Get category label
   */
  const getCategoryLabel = (value: string) => {
    const category = CATEGORIES.find(c => c.value === value);
    return category?.label || value;
  };

  /**
   * Keyboard shortcut handler
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape' && !showVariableForm) {
        onClose();
      }

      // Quick select with number keys (1-9)
      if (e.key >= '1' && e.key <= '9' && !showVariableForm) {
        const index = parseInt(e.key) - 1;
        if (filteredTemplates[index]) {
          handleSelectTemplate(filteredTemplates[index]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredTemplates, showVariableForm, onClose]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden dark:bg-gray-900 transition-all" style={{ borderRadius: 'var(--radius-xl)', backgroundColor: 'var(--surface-primary)', boxShadow: 'var(--token-shadow-xl)' }}>
                {!showVariableForm ? (
                  <>
                    {/* Header */}
                    <div className="dark:border-gray-700 bg-gradient-to-r from-blue-600 to-purple-600 p-6">
                      <div className="flex items-center justify-between">
                        <Dialog.Title className="text-2xl font-bold text-white flex items-center gap-2">
                          <SparklesIcon className="w-7 h-7" />
                          Clinical Templates
                        </Dialog.Title>
                        <button
                          onClick={onClose}
                          className="text-white hover:text-gray-200 transition-colors"
                        >
                          <XMarkIcon className="w-6 h-6" />
                        </button>
                      </div>

                      {/* Search Bar */}
                      <div className="mt-4 relative">
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search templates by name, description, or shortcut..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 bg-white/90 dark:bg-gray-800/90 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white" style={{ border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)', color: 'var(--text-primary)' }}
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Filters */}
                    <div className="p-4 dark:border-gray-700 dark:bg-gray-800/50" style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--surface-secondary)' }}>
                      <div className="flex items-center gap-3 flex-wrap">
                        <button
                          onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                          className={`flex items-center gap-2 px-4 py-2 transition-all text-sm font-medium ${
                            showOnlyFavorites
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                              : 'dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'
                          }`}
                          style={{ borderRadius: 'var(--radius-lg)', ...(showOnlyFavorites ? {} : { backgroundColor: 'var(--surface-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-strong)' }) }}
                        >
                          <StarSolidIcon className="w-4 h-4" />
                          Favorites Only
                        </button>

                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="px-4 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm focus:ring-2 focus:ring-blue-500" style={{ backgroundColor: 'var(--surface-primary)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)', color: 'var(--text-primary)' }}
                        >
                          <option value="">All Categories</option>
                          {CATEGORIES.map(cat => (
                            <option key={cat.value} value={cat.value}>
                              {cat.label}
                            </option>
                          ))}
                        </select>

                        <span className="ml-auto text-sm dark:text-gray-400" style={{ color: 'var(--text-secondary)' }}>
                          {filteredTemplates.length} templates
                        </span>
                      </div>
                    </div>

                    {/* Templates List */}
                    <div className="max-h-[500px] overflow-y-auto p-4 space-y-2">
                      {loading ? (
                        <div className="text-center py-12">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading templates...</p>
                        </div>
                      ) : filteredTemplates.length === 0 ? (
                        <div className="text-center py-12">
                          <DocumentDuplicateIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                          <p className="text-gray-600 dark:text-gray-400 text-lg">No templates found</p>
                          {/* Decorative - low contrast intentional for empty state helper text */}
                          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                            Try adjusting your search or filters
                          </p>
                        </div>
                      ) : (
                        filteredTemplates.map((template, index) => (
                          <div
                            key={template.id}
                            onClick={() => handleSelectTemplate(template)}
                            className="p-4 dark:bg-gray-800 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group" style={{ backgroundColor: 'var(--surface-primary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)' }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  {index < 9 && (
                                    <span className="px-2 py-0.5 dark:bg-gray-700 dark:text-gray-400 text-xs font-mono" style={{ backgroundColor: 'var(--surface-tertiary)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-md)' }}>
                                      {index + 1}
                                    </span>
                                  )}
                                  <h3 className="text-lg font-semibold dark:text-white" style={{ color: 'var(--text-primary)' }}>
                                    {template.name}
                                  </h3>
                                  {template.isOfficial && (
                                    <CheckCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" title="Official Template" />
                                  )}
                                </div>
                                {template.description && (
                                  <p className="mt-1 text-sm dark:text-gray-400" style={{ color: 'var(--text-secondary)' }}>
                                    {template.description}
                                  </p>
                                )}
                                {/* Decorative - low contrast intentional for metadata */}
                                <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                  <span className="px-2 py-0.5 dark:bg-blue-900/30 dark:text-blue-300" style={{ backgroundColor: 'var(--surface-accent)', color: 'var(--text-accent)', borderRadius: 'var(--radius-md)' }}>
                                    {getCategoryLabel(template.category)}
                                  </span>
                                  {template.shortcut && (
                                    <span className="px-2 py-0.5 dark:bg-gray-700 dark:text-gray-300 font-mono" style={{ backgroundColor: 'var(--surface-tertiary)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-md)' }}>
                                      {template.shortcut}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <ClockIcon className="w-4 h-4" />
                                    Used {template.useCount} times
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={(e) => toggleFavorite(template, e)}
                                className="ml-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" style={{ borderRadius: 'var(--radius-lg)' }}
                              >
                                {template.isFavorite ? (
                                  <StarSolidIcon className="w-6 h-6 text-yellow-500" />
                                ) : (
                                  <StarIcon className="w-6 h-6 text-gray-400 group-hover:text-yellow-500" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 dark:border-gray-700 dark:bg-gray-800/50" style={{ borderTop: '1px solid var(--border-default)', backgroundColor: 'var(--surface-secondary)' }}>
                      <div className="flex items-center justify-between text-xs dark:text-gray-400" style={{ color: 'var(--text-secondary)' }}>
                        <div className="flex items-center gap-4">
                          <span><kbd className="px-2 py-1 dark:bg-gray-700" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}>1-9</kbd> Quick select</span>
                          <span><kbd className="px-2 py-1 dark:bg-gray-700" style={{ backgroundColor: 'var(--border-default)', borderRadius: 'var(--radius-md)' }}>Esc</kbd> Close</span>
                        </div>
                        <span>Press number key or click to select</span>
                      </div>
                    </div>
                  </>
                ) : (
                  // Variable Form
                  selectedTemplate && (
                    <>
                      <div className="dark:border-gray-700 bg-gradient-to-r from-purple-600 to-pink-600 p-6">
                        <Dialog.Title className="text-2xl font-bold text-white">
                          Fill Template Variables
                        </Dialog.Title>
                        <p className="mt-2 text-white/80">{selectedTemplate.name}</p>
                      </div>

                      <div className="p-6 max-h-[500px] overflow-y-auto space-y-4">
                        {(selectedTemplate.variables as any[] || []).map((variable: any) => (
                          <div key={variable.name}>
                            <label className="block text-sm font-medium dark:text-gray-300 mb-2" style={{ color: 'var(--text-secondary)' }}>
                              {variable.label || variable.name}
                              {variable.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            {variable.type === 'select' ? (
                              <select
                                value={variableValues[variable.name] || ''}
                                onChange={(e) =>
                                  setVariableValues({ ...variableValues, [variable.name]: e.target.value })
                                }
                                className="w-full px-4 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-purple-500" style={{ backgroundColor: 'var(--surface-primary)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)', color: 'var(--text-primary)' }}
                                required={variable.required}
                              >
                                <option value="">Select...</option>
                                {(variable.options || []).map((option: string) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            ) : variable.type === 'date' ? (
                              <input
                                type="date"
                                value={variableValues[variable.name] || ''}
                                onChange={(e) =>
                                  setVariableValues({ ...variableValues, [variable.name]: e.target.value })
                                }
                                className="w-full px-4 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-purple-500" style={{ backgroundColor: 'var(--surface-primary)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)', color: 'var(--text-primary)' }}
                                required={variable.required}
                              />
                            ) : variable.type === 'number' ? (
                              <input
                                type="number"
                                value={variableValues[variable.name] || ''}
                                onChange={(e) =>
                                  setVariableValues({ ...variableValues, [variable.name]: e.target.value })
                                }
                                className="w-full px-4 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-purple-500" style={{ backgroundColor: 'var(--surface-primary)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)', color: 'var(--text-primary)' }}
                                required={variable.required}
                              />
                            ) : (
                              <input
                                type="text"
                                value={variableValues[variable.name] || ''}
                                onChange={(e) =>
                                  setVariableValues({ ...variableValues, [variable.name]: e.target.value })
                                }
                                placeholder={variable.default || ''}
                                className="w-full px-4 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-purple-500" style={{ backgroundColor: 'var(--surface-primary)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)', color: 'var(--text-primary)' }}
                                required={variable.required}
                              />
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="p-4 dark:border-gray-700 dark:bg-gray-800/50 flex items-center justify-end gap-3" style={{ borderTop: '1px solid var(--border-default)', backgroundColor: 'var(--surface-secondary)' }}>
                        <button
                          onClick={() => {
                            setShowVariableForm(false);
                            setSelectedTemplate(null);
                            setVariableValues({});
                          }}
                          className="px-4 py-2 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" style={{ color: 'var(--text-secondary)', borderRadius: 'var(--radius-lg)' }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleVariableFormSubmit}
                          className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 transition-all font-medium" style={{ borderRadius: 'var(--radius-lg)' }}
                        >
                          Use Template
                        </button>
                      </div>
                    </>
                  )
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
