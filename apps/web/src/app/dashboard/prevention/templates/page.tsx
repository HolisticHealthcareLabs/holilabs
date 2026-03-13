'use client';

/**
 * Prevention Plan Templates Management Page
 *
 * Allows users to view, create, edit, and manage prevention plan templates
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Check,
  X,
  Search,
  Filter,
  BarChart3,
  Calendar,
  AlertCircle,
  MessageSquare,
  Share2,
} from 'lucide-react';
import { StopIcon as Square, CheckCircleIcon as CheckSquare } from '@heroicons/react/24/outline';
import BulkActionToolbar from '@/components/prevention/BulkActionToolbar';
import TemplateFormModal from '@/components/prevention/TemplateFormModal';

interface Template {
  id: string;
  templateName: string;
  planType: string;
  description: string | null;
  guidelineSource: string | null;
  evidenceLevel: string | null;
  goals: any[];
  recommendations: any[];
  isActive: boolean;
  useCount: number;
  createdAt: string;
  updatedAt: string;
  _count?: { comments: number; shares: number };
}

export default function PreventionTemplatesPage() {
  const t = useTranslations('dashboard.prevention.templates');
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlanType, setFilterPlanType] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filterPlanType, filterActive, templates]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/prevention/templates');
      const result = await response.json();

      if (result.success) {
        setTemplates(result.data.templates);
      } else {
        setError(result.error || 'Failed to load templates');
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...templates];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((template) =>
        template.templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Plan type filter
    if (filterPlanType !== 'all') {
      filtered = filtered.filter((template) => template.planType === filterPlanType);
    }

    // Active status filter
    if (filterActive === 'active') {
      filtered = filtered.filter((template) => template.isActive);
    } else if (filterActive === 'inactive') {
      filtered = filtered.filter((template) => !template.isActive);
    }

    setFilteredTemplates(filtered);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar esta plantilla?')) {
      return;
    }

    try {
      const response = await fetch(`/api/prevention/templates/${templateId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        alert('Plantilla eliminada exitosamente');
        fetchTemplates();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error al eliminar la plantilla');
    }
  };

  const handleToggleActive = async (templateId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/prevention/templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      const result = await response.json();

      if (result.success) {
        fetchTemplates();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error toggling template status:', error);
      alert('Error al cambiar el estado de la plantilla');
    }
  };

  // Bulk selection handlers
  const handleToggleSelection = (templateId: string) => {
    setSelectedIds((prev) =>
      prev.includes(templateId)
        ? prev.filter((id) => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredTemplates.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTemplates.map((t) => t.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
    setBulkMode(false);
  };

  // Bulk operation handlers
  const handleBulkActivate = async (ids: string[]) => {
    const response = await fetch('/api/prevention/templates/bulk/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateIds: ids }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to activate templates');
    }

    await fetchTemplates();
  };

  const handleBulkDeactivate = async (ids: string[]) => {
    const response = await fetch('/api/prevention/templates/bulk/deactivate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateIds: ids }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to deactivate templates');
    }

    await fetchTemplates();
  };

  const handleBulkDelete = async (ids: string[]) => {
    const response = await fetch('/api/prevention/templates/bulk/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateIds: ids }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to delete templates');
    }

    await fetchTemplates();
  };

  const handleBulkExport = async (ids: string[], format: 'json' | 'csv') => {
    const response = await fetch('/api/prevention/templates/bulk/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateIds: ids, format }),
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || 'Failed to export templates');
    }

    // Download the file
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prevention-templates-${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('loadingTemplates')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-200 mb-2">Error</h3>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <button
                onClick={fetchTemplates}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {t('retry')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t('title')}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('subtitle')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>{t('newTemplate')}</span>
            </button>
          </div>

          {/* Search and Filters */}
          <div className="mt-4 flex items-center space-x-4">
            {/* Select All Checkbox */}
            {filteredTemplates.length > 0 && (
              <button
                onClick={handleSelectAll}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={selectedIds.length === filteredTemplates.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
              >
                {selectedIds.length === filteredTemplates.length && filteredTemplates.length > 0 ? (
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                ) : (
                  <Square className="w-5 h-5 text-gray-400" />
                )}
              </button>
            )}

            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>{t('filters')}</span>
              {(filterPlanType !== 'all' || filterActive !== 'all') && (
                <span className="ml-1 px-2 py-0.5 bg-blue-600 text-white rounded-full text-xs">
                  {(filterPlanType !== 'all' ? 1 : 0) + (filterActive !== 'all' ? 1 : 0)}
                </span>
              )}
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('planType')}
                  </label>
                  <select
                    value={filterPlanType}
                    onChange={(e) => setFilterPlanType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">{t('allTypes')}</option>
                    <option value="CARDIOVASCULAR">{t('cardiovascular')}</option>
                    <option value="DIABETES">{t('diabetes')}</option>
                    <option value="COMPREHENSIVE">{t('comprehensive')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('status')}
                  </label>
                  <select
                    value={filterActive}
                    onChange={(e) => setFilterActive(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">{t('allStatuses')}</option>
                    <option value="active">{t('active')}</option>
                    <option value="inactive">{t('inactive')}</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {templates.length}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('totalTemplates')}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <Check className="w-8 h-8 text-green-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {templates.filter((t) => t.isActive).length}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('active')}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-8 h-8 text-purple-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {templates.reduce((sum, t) => sum + t.useCount, 0)}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('totalUses')}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 text-amber-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {filteredTemplates.length}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('filtered')}</p>
          </div>
        </div>

        {/* Templates List */}
        {filteredTemplates.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('noTemplatesFound')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {searchTerm || filterPlanType !== 'all' || filterActive !== 'all'
                ? t('adjustFilters')
                : t('createFirstHint')}
            </p>
            {!searchTerm && filterPlanType === 'all' && filterActive === 'all' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>{t('createFirstTemplate')}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 transition-colors ${
                  selectedIds.includes(template.id)
                    ? 'border-blue-500 dark:border-blue-400'
                    : 'border-gray-200 dark:border-gray-700'
                } p-6`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3 flex-1">
                    {/* Selection Checkbox */}
                    <button
                      onClick={() => handleToggleSelection(template.id)}
                      className="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      {selectedIds.includes(template.id) ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3
                          className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                          onClick={() => router.push(`/dashboard/prevention/templates/${template.id}`)}
                        >
                          {template.templateName}
                        </h3>
                        {template.isActive ? (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                            {t('active')}
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400 rounded-full text-xs font-medium">
                            {t('inactive')}
                          </span>
                        )}
                      </div>
                      <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                        {template.planType}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowEditModal(true);
                      }}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(template.id, template.isActive)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title={template.isActive ? 'Desactivar' : 'Activar'}
                    >
                      {template.isActive ? (
                        <X className="w-4 h-4" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                {template.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {template.description}
                  </p>
                )}

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {template.guidelineSource && (
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-500">{t('source')}:</span>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {template.guidelineSource}
                      </p>
                    </div>
                  )}
                  {template.evidenceLevel && (
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-500">{t('evidence')}:</span>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {template.evidenceLevel}
                      </p>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>{template.goals.length} metas</span>
                    <span>{template.recommendations.length} recomendaciones</span>
                    {template._count && template._count.comments > 0 && (
                      <span className="flex items-center space-x-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{template._count.comments}</span>
                      </span>
                    )}
                    {template._count && template._count.shares > 0 && (
                      <span className="flex items-center space-x-1">
                        <Share2 className="w-3.5 h-3.5" />
                        <span>{template._count.shares}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {template.useCount} usos
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Template Modal */}
      <TemplateFormModal
        isOpen={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedTemplate(null);
        }}
        onSaved={fetchTemplates}
        template={showEditModal && selectedTemplate ? {
          id: selectedTemplate.id,
          templateName: selectedTemplate.templateName,
          planType: selectedTemplate.planType,
          description: selectedTemplate.description || '',
          guidelineSource: selectedTemplate.guidelineSource || '',
          evidenceLevel: selectedTemplate.evidenceLevel || '',
          targetPopulation: '',
          goals: selectedTemplate.goals || [],
          recommendations: selectedTemplate.recommendations || [],
        } : null}
      />

      {/* Bulk Action Toolbar */}
      <BulkActionToolbar
        selectedCount={selectedIds.length}
        selectedIds={selectedIds}
        onClearSelection={handleClearSelection}
        onBulkActivate={handleBulkActivate}
        onBulkDeactivate={handleBulkDeactivate}
        onBulkDelete={handleBulkDelete}
        onBulkExport={handleBulkExport}
      />
    </div>
  );
}
