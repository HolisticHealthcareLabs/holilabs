'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import SendFormModal from '@/components/forms/SendFormModal';
import { NotificationTemplateEditor } from '@/components/templates/NotificationTemplateEditor';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

// Form Template Interface
interface FormTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  estimatedMinutes: number;
  usageCount: number;
  isBuiltIn: boolean;
  tags: string[];
}

// Notification Template Interface
interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  channel: string;
  level: 'CLINIC' | 'DOCTOR';
  doctorId: string | null;
  subject: string | null;
  body: string;
  sendTiming: number | null;
  sendTimingUnit: string | null;
  requireConfirmation: boolean;
  isActive: boolean;
  isDefault: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  doctor: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const CHANNEL_LABELS: Record<string, string> = {
  WHATSAPP: '💬 WhatsApp',
  EMAIL: '📧 Email',
  SMS: '📱 SMS',
  PUSH: '🔔 Push',
  IN_APP: '💬 In-App',
};

const TYPE_LABELS: Record<string, string> = {
  REMINDER: 'Reminder',
  CONFIRMATION: 'Confirmation',
  CANCELLATION: 'Cancellation',
  RESCHEDULE: 'Reschedule',
  PAYMENT_REMINDER: 'Payment',
  FOLLOW_UP: 'Follow-up',
  CUSTOM: 'Custom',
};

export default function FormsPage() {
  const t = useTranslations('dashboard.formsList');
  const searchParams = useSearchParams();

  // Tab state - Initialize from query parameter if present
  const [activeTab, setActiveTab] = useState<'forms' | 'notifications'>('forms');

  // Handle tab query parameter on mount
  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam === 'notifications') {
      setActiveTab('notifications');
    }
  }, [searchParams]);

  // Form Templates State
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [formLoading, setFormLoading] = useState(true);
  const [formFilter, setFormFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);

  // Notification Templates State
  const [notificationTemplates, setNotificationTemplates] = useState<NotificationTemplate[]>([]);
  const [notificationLoading, setNotificationLoading] = useState(true);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [showNotificationEditor, setShowNotificationEditor] = useState(false);
  const [editingNotificationTemplate, setEditingNotificationTemplate] = useState<NotificationTemplate | null>(null);
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'CLINIC' | 'DOCTOR'>('ALL');
  const [filterChannel, setFilterChannel] = useState<string>('ALL');
  const [notificationError, setNotificationError] = useState<string | null>(null);

  useEffect(() => {
    fetchFormTemplates();
    fetchNotificationTemplates();
    fetchDoctors();
  }, []);

  // Form Templates Functions
  const fetchFormTemplates = async () => {
    try {
      setFormLoading(true);
      const response = await fetch('/api/forms/templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      const data = await response.json();
      setFormTemplates(data.templates || []);
    } catch (error) {
      console.error('[Forms]', { event: 'fetch_form_templates_error', error: error instanceof Error ? error.message : String(error) });
    } finally {
      setFormLoading(false);
    }
  };

  // Notification Templates Functions
  const fetchNotificationTemplates = async () => {
    try {
      setNotificationLoading(true);
      setNotificationError(null);

      const response = await fetch('/api/appointments/templates');
      const data = await response.json();

      if (data.success && data.data) {
        setNotificationTemplates(data.data.templates);
      } else {
        setNotificationError(data.error || t('loadError'));
      }
    } catch (error) {
      console.error('[Forms]', { event: 'fetch_notification_templates_error', error: error instanceof Error ? error.message : String(error) });
      setNotificationError(t('loadErrorServer'));
    } finally {
      setNotificationLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await fetch('/api/users?role=DOCTOR');
      const data = await response.json();

      if (data.success && data.data) {
        setDoctors(data.data.users || []);
      }
    } catch (error) {
      console.error('[Forms]', { event: 'fetch_doctors_error', error: error instanceof Error ? error.message : String(error) });
    }
  };

  const handleCreateNotificationTemplate = () => {
    setEditingNotificationTemplate(null);
    setShowNotificationEditor(true);
  };

  const handleEditNotificationTemplate = (template: NotificationTemplate) => {
    setEditingNotificationTemplate(template);
    setShowNotificationEditor(true);
  };

  const handleSaveNotificationTemplate = async (formData: any) => {
    try {
      const url = editingNotificationTemplate
        ? `/api/appointments/templates/${editingNotificationTemplate.id}`
        : '/api/appointments/templates';

      const method = editingNotificationTemplate ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setShowNotificationEditor(false);
        setEditingNotificationTemplate(null);
        fetchNotificationTemplates();
      } else {
        throw new Error(data.error || 'Error saving template');
      }
    } catch (error: any) {
      throw error;
    }
  };

  const handleDeleteNotificationTemplate = async (templateId: string) => {
    if (!confirm(t('deleteConfirm'))) {
      return;
    }

    try {
      const response = await fetch(`/api/appointments/templates/${templateId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        fetchNotificationTemplates();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('[Forms]', { event: 'delete_template_error', error: error instanceof Error ? error.message : String(error) });
      alert(t('deleteError'));
    }
  };

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      CONSENT: '📝',
      HIPAA: '🔒',
      MEDICAL_HISTORY: '🏥',
      INTAKE: '📋',
      OTHER: '📄',
    };
    return icons[category] || '📄';
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      CONSENT: 'bg-blue-100 text-blue-700 border-blue-200',
      HIPAA: 'bg-purple-100 text-purple-700 border-purple-200',
      MEDICAL_HISTORY: 'bg-green-100 text-green-700 border-green-200',
      INTAKE: 'bg-orange-100 text-orange-700 border-orange-200',
      OTHER: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return colors[category] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const filteredFormTemplates = formTemplates.filter((template) => {
    const matchesFilter = formFilter === 'all' || template.category === formFilter;
    const matchesSearch =
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filteredNotificationTemplates = notificationTemplates.filter((template) => {
    if (filterLevel !== 'ALL' && template.level !== filterLevel) return false;
    if (filterChannel !== 'ALL' && template.channel !== filterChannel) return false;
    return true;
  });

  const formCategories = ['all', 'CONSENT', 'HIPAA', 'MEDICAL_HISTORY', 'INTAKE', 'OTHER'];

  const loading = activeTab === 'forms' ? formLoading : notificationLoading;

  if (loading && (formTemplates.length === 0 && notificationTemplates.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show notification template editor
  if (showNotificationEditor) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <button
            onClick={() => {
              setShowNotificationEditor(false);
              setEditingNotificationTemplate(null);
            }}
            className="text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            {t('backToTemplates')}
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {editingNotificationTemplate ? `✏️ ${t('editTemplateTitle')}` : `➕ ${t('newTemplateTitle')}`}
          </h1>
          <p className="text-gray-600">
            {editingNotificationTemplate
              ? t('editTemplateDesc')
              : t('newTemplateDesc')}
          </p>
        </div>

        <NotificationTemplateEditor
          template={editingNotificationTemplate ? {
            ...editingNotificationTemplate,
            doctorId: editingNotificationTemplate.doctorId ?? undefined,
            subject: editingNotificationTemplate.subject ?? undefined,
            sendTiming: editingNotificationTemplate.sendTiming ?? undefined,
            sendTimingUnit: editingNotificationTemplate.sendTimingUnit ?? undefined,
            requireConfirmation: editingNotificationTemplate.requireConfirmation ?? undefined,
          } : undefined}
          mode={editingNotificationTemplate ? 'edit' : 'create'}
          onSave={handleSaveNotificationTemplate}
          onCancel={() => {
            setShowNotificationEditor(false);
            setEditingNotificationTemplate(null);
          }}
          doctors={doctors}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 mt-1">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'forms' && (
            <>
              <Link
                href="/dashboard/forms/sent"
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                📊 {t('sentFormsBtn')}
              </Link>
              <Link
                href="/dashboard/forms/builder"
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all font-medium shadow-lg shadow-purple-600/30 flex items-center gap-2"
              >
                <span>🎨</span>
                <span>{t('formBuilder')}</span>
              </Link>
              <Link
                href="/dashboard/forms/create-with-ai"
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-lg shadow-blue-600/30 flex items-center gap-2"
              >
                <span>🤖</span>
                <span>{t('createWithAI')}</span>
              </Link>
            </>
          )}
          {activeTab === 'notifications' && (
            <button
              onClick={handleCreateNotificationTemplate}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all font-semibold flex items-center space-x-2"
            >
              <PlusIcon className="h-5 w-5" />
              <span>{t('newTemplate')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-xl p-1">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('forms')}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'forms'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            📋 {t('patientFormsTab')}
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'notifications'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            💬 {t('notificationTemplatesTab')}
          </button>
        </div>
      </div>

      {/* Forms Tab Content */}
      {activeTab === 'forms' && (
        <>
          {/* Search & Filters */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    placeholder={t('searchForms')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Category Filters */}
              <div className="flex items-center gap-2 overflow-x-auto">
                {formCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFormFilter(cat)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      formFilter === cat
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {cat === 'all' ? t('all') : cat.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t('totalTemplates')}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{formTemplates.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
                  📝
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t('sentFormsCount')}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">0</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">
                  📤
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t('completed')}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">0</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">
                  ✅
                </div>
              </div>
            </div>
          </div>

          {/* Templates Gallery */}
          {filteredFormTemplates.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <svg
                className="mx-auto h-16 w-16 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">{t('noFormsFound')}</h3>
              <p className="mt-2 text-sm text-gray-500">
                {t('adjustFilters')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFormTemplates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer group"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{getCategoryIcon(template.category)}</div>
                      <div>
                        {template.isBuiltIn && (
                          <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded mb-1">
                            {t('preBuilt')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {template.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {template.description}
                  </p>

                  {/* Category Badge */}
                  <div className="mb-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(
                        template.category
                      )}`}
                    >
                      {template.category.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Meta Info */}
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>~{template.estimatedMinutes} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                      <span>{template.usageCount || 0} {t('send').toLowerCase()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowSendModal(true);
                      }}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium shadow-lg shadow-blue-600/30"
                    >
                      📤 {t('send')}
                    </button>
                    <button
                      onClick={() => alert('Vista previa próximamente')}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      title="Vista Previa"
                    >
                      👁️
                    </button>
                    {!template.isBuiltIn && (
                      <button
                        onClick={() => alert('Edición próximamente')}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Editar"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Notification Templates Tab Content */}
      {activeTab === 'notifications' && (
        <>
          {/* Error Message */}
          {notificationError && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              {notificationError}
            </div>
          )}

          {/* Filters */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">
                  {t('levelLabel')}
                </span>
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value as any)}
                  className="px-3 py-1.5 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">{t('allLevels')}</option>
                  <option value="CLINIC">{t('clinicLevel')}</option>
                  <option value="DOCTOR">{t('doctorLevel')}</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">
                  {t('channelLabel')}
                </span>
                <select
                  value={filterChannel}
                  onChange={(e) => setFilterChannel(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">{t('allChannels')}</option>
                  {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ml-auto text-sm text-gray-600">
                {filteredNotificationTemplates.length !== 1
                  ? t('templatesCount', { count: filteredNotificationTemplates.length })
                  : t('templatesCountSingular', { count: filteredNotificationTemplates.length })}
              </div>
            </div>
          </div>

          {/* Templates Grid */}
          {filteredNotificationTemplates.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t('noTemplatesTitle')}
              </h3>
              <p className="text-gray-600 mb-6">
                {t('noTemplatesDesc')}
              </p>
              <button
                onClick={handleCreateNotificationTemplate}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all font-semibold"
              >
                {t('createFirstTemplate')}
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNotificationTemplates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Header */}
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-gray-900 text-lg">
                        {template.name}
                      </h3>
                      {template.isDefault && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                          ⭐ {t('default')}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                        {TYPE_LABELS[template.type] || template.type}
                      </span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                        {CHANNEL_LABELS[template.channel] || template.channel}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">
                        {template.level === 'CLINIC' ? `🏥 ${t('clinicLevel')}` : `👨‍⚕️ ${t('doctorLevel')}`}
                      </span>
                    </div>
                  </div>

                  {/* Body Preview */}
                  <div className="p-4">
                    <p className="text-sm text-gray-600 line-clamp-3 font-mono">
                      {template.body}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>{t('usedCount', { count: template.usageCount })}</span>
                      {template.isActive ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircleIcon className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-3 border-t border-gray-200 flex space-x-2">
                    <button
                      onClick={() => handleEditNotificationTemplate(template)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center space-x-1"
                    >
                      <PencilIcon className="h-4 w-4" />
                      <span>{t('edit')}</span>
                    </button>
                    <button
                      onClick={() => handleDeleteNotificationTemplate(template.id)}
                      disabled={template.isDefault}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      title={template.isDefault ? 'No se puede eliminar una plantilla predeterminada' : 'Eliminar plantilla'}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Send Form Modal */}
      <SendFormModal
        isOpen={showSendModal}
        onClose={() => {
          setShowSendModal(false);
          setSelectedTemplate(null);
        }}
        template={selectedTemplate || undefined}
        onSuccess={() => {
          fetchFormTemplates(); // Refresh to update usage counts
        }}
      />
    </div>
  );
}
