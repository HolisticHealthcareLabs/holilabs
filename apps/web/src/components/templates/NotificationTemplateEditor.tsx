'use client';

/**
 * Notification Template Editor Component
 * Full form for creating and editing notification templates
 */

import { useState, useRef } from 'react';
import { VariablePicker } from './VariablePicker';
import { TemplatePreview } from './TemplatePreview';
import { getDefaultTemplate } from '@/lib/notifications/template-renderer';

interface NotificationTemplateEditorProps {
  template?: {
    id?: string;
    name: string;
    type: string;
    channel: string;
    level: 'CLINIC' | 'DOCTOR';
    doctorId?: string;
    subject?: string;
    body: string;
    sendTiming?: number;
    sendTimingUnit?: string;
    requireConfirmation?: boolean;
    isActive?: boolean;
    isDefault?: boolean;
  };
  mode: 'create' | 'edit';
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  doctors?: Array<{ id: string; firstName: string; lastName: string }>;
}

const TEMPLATE_TYPES = [
  { value: 'REMINDER', label: 'Recordatorio de Cita' },
  { value: 'CONFIRMATION', label: 'Confirmación de Cita' },
  { value: 'CANCELLATION', label: 'Cancelación de Cita' },
  { value: 'RESCHEDULE', label: 'Reagendamiento' },
  { value: 'PAYMENT_REMINDER', label: 'Recordatorio de Pago' },
  { value: 'FOLLOW_UP', label: 'Seguimiento' },
  { value: 'CUSTOM', label: 'Personalizado' },
];

const CHANNELS = [
  { value: 'WHATSAPP', label: '💬 WhatsApp', icon: '💬' },
  { value: 'EMAIL', label: '📧 Email', icon: '📧' },
  { value: 'SMS', label: '📱 SMS', icon: '📱' },
  { value: 'PUSH', label: '🔔 Push', icon: '🔔' },
  { value: 'IN_APP', label: '💬 In-App', icon: '💬' },
];

const TIMING_UNITS = [
  { value: 'minutes', label: 'Minutos' },
  { value: 'hours', label: 'Horas' },
  { value: 'days', label: 'Días' },
];

export function NotificationTemplateEditor({
  template,
  mode,
  onSave,
  onCancel,
  doctors = [],
}: NotificationTemplateEditorProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [formData, setFormData] = useState({
    name: template?.name || '',
    type: template?.type || 'REMINDER',
    channel: template?.channel || 'WHATSAPP',
    level: template?.level || 'CLINIC' as 'CLINIC' | 'DOCTOR',
    doctorId: template?.doctorId || '',
    subject: template?.subject || '',
    body: template?.body || '',
    sendTiming: template?.sendTiming || 24,
    sendTimingUnit: template?.sendTimingUnit || 'hours',
    requireConfirmation: template?.requireConfirmation ?? true,
    isActive: template?.isActive ?? true,
    isDefault: template?.isDefault ?? false,
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleVariableInsert = (variable: string) => {
    const textarea = bodyTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.body;
    const before = text.substring(0, start);
    const after = text.substring(end);

    const newBody = before + variable + after;
    handleInputChange('body', newBody);

    // Set cursor position after inserted variable
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const loadDefaultTemplate = () => {
    const defaultTemplate = getDefaultTemplate(formData.type as any);
    if (defaultTemplate) {
      handleInputChange('body', defaultTemplate);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('El nombre es requerido');
      return;
    }

    if (!formData.body.trim()) {
      setError('El cuerpo del mensaje es requerido');
      return;
    }

    if (formData.channel === 'EMAIL' && !formData.subject.trim()) {
      setError('El asunto es requerido para emails');
      return;
    }

    if (formData.level === 'DOCTOR' && !formData.doctorId) {
      setError('Debes seleccionar un doctor para plantillas de doctor');
      return;
    }

    try {
      setSaving(true);
      await onSave(formData);
    } catch (err: any) {
      setError(err.message || 'Error al guardar la plantilla');
    } finally {
      setSaving(false);
    }
  };

  const needsSubject = formData.channel === 'EMAIL' || formData.channel === 'PUSH' || formData.channel === 'IN_APP';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          📝 Información Básica
        </h3>

        {/* Template Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Nombre de la Plantilla *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Ej: Recordatorio de Cita - 24h antes"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Type and Channel */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo *
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {TEMPLATE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Canal *
            </label>
            <select
              value={formData.channel}
              onChange={(e) => handleInputChange('channel', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {CHANNELS.map((channel) => (
                <option key={channel.value} value={channel.value}>
                  {channel.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Level and Doctor */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nivel *
            </label>
            <select
              value={formData.level}
              onChange={(e) => handleInputChange('level', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="CLINIC">🏥 Clínica (Global)</option>
              <option value="DOCTOR">👨‍⚕️ Doctor (Individual)</option>
            </select>
          </div>

          {formData.level === 'DOCTOR' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Doctor *
              </label>
              <select
                value={formData.doctorId}
                onChange={(e) => handleInputChange('doctorId', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Seleccionar doctor...</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.firstName} {doctor.lastName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Message Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            💬 Contenido del Mensaje
          </h3>
          <button
            type="button"
            onClick={loadDefaultTemplate}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            📋 Cargar plantilla predeterminada
          </button>
        </div>

        {/* Subject (for email/push) */}
        {needsSubject && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Asunto *
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              placeholder="Ej: Recordatorio de tu Cita Médica"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        )}

        {/* Body */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Cuerpo del Mensaje *
            </label>
            <VariablePicker onVariableSelect={handleVariableInsert} />
          </div>
          <textarea
            ref={bodyTextareaRef}
            value={formData.body}
            onChange={(e) => handleInputChange('body', e.target.value)}
            placeholder="Escribe tu mensaje aquí... Usa variables como {firstName}, {appointmentDate}, etc."
            rows={10}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {formData.body.length} caracteres
          </p>
        </div>

        {/* Preview */}
        <TemplatePreview template={formData.body} />
      </div>

      {/* Timing & Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          ⚙️ Configuración
        </h3>

        {/* Send Timing */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Enviar antes de la cita
          </label>
          <div className="flex space-x-2">
            <input
              type="number"
              value={formData.sendTiming}
              onChange={(e) => handleInputChange('sendTiming', parseInt(e.target.value) || 0)}
              min="0"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={formData.sendTimingUnit}
              onChange={(e) => handleInputChange('sendTimingUnit', e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {TIMING_UNITS.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Checkboxes */}
        <div className="space-y-3">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.requireConfirmation}
              onChange={(e) => handleInputChange('requireConfirmation', e.target.checked)}
              className="w-5 h-5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Requiere confirmación del paciente
            </span>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => handleInputChange('isActive', e.target.checked)}
              className="w-5 h-5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Plantilla activa
            </span>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isDefault}
              onChange={(e) => handleInputChange('isDefault', e.target.checked)}
              className="w-5 h-5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Usar como plantilla predeterminada
            </span>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all font-semibold disabled:opacity-50 disabled:transform-none"
        >
          {saving ? (
            <span className="flex items-center space-x-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Guardando...</span>
            </span>
          ) : (
            `${mode === 'create' ? '💾 Crear Plantilla' : '✅ Guardar Cambios'}`
          )}
        </button>
      </div>
    </form>
  );
}
