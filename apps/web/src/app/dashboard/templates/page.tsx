'use client';

/**
 * Notification Templates Management Page
 * View, create, edit, and delete notification templates
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { NotificationTemplateEditor } from '@/components/templates/NotificationTemplateEditor';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface Template {
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
  REMINDER: 'Recordatorio',
  CONFIRMATION: 'Confirmación',
  CANCELLATION: 'Cancelación',
  RESCHEDULE: 'Reagendamiento',
  PAYMENT_REMINDER: 'Pago',
  FOLLOW_UP: 'Seguimiento',
  CUSTOM: 'Personalizado',
};

export default function TemplatesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'CLINIC' | 'DOCTOR'>('ALL');
  const [filterChannel, setFilterChannel] = useState<string>('ALL');
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    fetchTemplates();
    fetchDoctors();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/appointments/templates');
      const data = await response.json();

      if (data.success && data.data) {
        setTemplates(data.data.templates);
      } else {
        setError(data.error || 'Error al cargar plantillas');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
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
      console.error('Error fetching doctors:', error);
    }
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setShowEditor(true);
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleSaveTemplate = async (formData: any) => {
    try {
      const url = editingTemplate
        ? `/api/appointments/templates/${editingTemplate.id}`
        : '/api/appointments/templates';

      const method = editingTemplate ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setShowEditor(false);
        setEditingTemplate(null);
        fetchTemplates();
      } else {
        throw new Error(data.error || 'Error al guardar plantilla');
      }
    } catch (error: any) {
      throw error;
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta plantilla? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const response = await fetch(`/api/appointments/templates/${templateId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        fetchTemplates();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error al eliminar plantilla');
    }
  };

  const filteredTemplates = templates.filter((template) => {
    if (filterLevel !== 'ALL' && template.level !== filterLevel) return false;
    if (filterChannel !== 'ALL' && template.channel !== filterChannel) return false;
    return true;
  });

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando plantillas...</p>
        </div>
      </div>
    );
  }

  if (showEditor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="container mx-auto px-6 max-w-4xl">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => {
                setShowEditor(false);
                setEditingTemplate(null);
              }}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
            >
              ← Volver a Plantillas
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {editingTemplate ? '✏️ Editar Plantilla' : '➕ Nueva Plantilla'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {editingTemplate
                ? 'Actualiza el contenido y configuración de la plantilla'
                : 'Crea una nueva plantilla de notificación para tus pacientes'}
            </p>
          </div>

          {/* Editor */}
          <NotificationTemplateEditor
            template={editingTemplate || undefined}
            mode={editingTemplate ? 'edit' : 'create'}
            onSave={handleSaveTemplate}
            onCancel={() => {
              setShowEditor(false);
              setEditingTemplate(null);
            }}
            doctors={doctors}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                ← Regresar
              </Link>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                📝 Plantillas de Notificación
              </h1>
            </div>

            <button
              onClick={handleCreateTemplate}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all font-semibold flex items-center space-x-2"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Nueva Plantilla</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Nivel:
              </span>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value as any)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Todos</option>
                <option value="CLINIC">Clínica</option>
                <option value="DOCTOR">Doctor</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Canal:
              </span>
              <select
                value={filterChannel}
                onChange={(e) => setFilterChannel(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Todos</option>
                {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="ml-auto text-sm text-gray-600 dark:text-gray-400">
              {filteredTemplates.length} plantilla{filteredTemplates.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No hay plantillas
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Crea tu primera plantilla de notificación para empezar
            </p>
            <button
              onClick={handleCreateTemplate}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all font-semibold"
            >
              + Crear Primera Plantilla
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                      {template.name}
                    </h3>
                    {template.isDefault && (
                      <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs font-semibold rounded">
                        ⭐ Predeterminada
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-medium rounded">
                      {TYPE_LABELS[template.type] || template.type}
                    </span>
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs font-medium rounded">
                      {CHANNEL_LABELS[template.channel] || template.channel}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 text-xs font-medium rounded">
                      {template.level === 'CLINIC' ? '🏥 Clínica' : '👨‍⚕️ Doctor'}
                    </span>
                  </div>
                </div>

                {/* Body Preview */}
                <div className="p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 font-mono">
                    {template.body}
                  </p>
                </div>

                {/* Stats */}
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>Usado {template.usageCount} veces</span>
                    {template.isActive ? (
                      <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircleIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex space-x-2">
                  <button
                    onClick={() => handleEditTemplate(template)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center space-x-1"
                  >
                    <PencilIcon className="h-4 w-4" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
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
      </div>
    </div>
  );
}
