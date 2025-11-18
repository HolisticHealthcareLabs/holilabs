'use client';
export const dynamic = 'force-dynamic';

/**
 * Visual Form Builder
 *
 * Drag-and-drop form builder with:
 * - Field palette with all field types
 * - Real-time preview
 * - Conditional logic editor
 * - Field property configuration
 * - Template saving
 * - Linear/Notion inspired UX
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

// Field Types
type FieldType = 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'number' | 'email' | 'phone' | 'file';

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  conditionalLogic?: {
    showIf?: {
      fieldId: string;
      operator: 'equals' | 'notEquals' | 'contains' | 'isEmpty' | 'isNotEmpty';
      value: string;
    };
  };
}

interface FormTemplate {
  title: string;
  description: string;
  category: string;
  estimatedMinutes: number;
  fields: FormField[];
}

const FIELD_TYPES: { type: FieldType; label: string; icon: string; description: string }[] = [
  { type: 'text', label: 'Texto Corto', icon: '📝', description: 'Línea simple de texto' },
  { type: 'textarea', label: 'Texto Largo', icon: '📄', description: 'Múltiples líneas de texto' },
  { type: 'select', label: 'Selección Única', icon: '📋', description: 'Lista desplegable' },
  { type: 'checkbox', label: 'Casillas', icon: '☑️', description: 'Múltiples opciones' },
  { type: 'radio', label: 'Opción Única', icon: '🔘', description: 'Una de varias opciones' },
  { type: 'date', label: 'Fecha', icon: '📅', description: 'Selector de fecha' },
  { type: 'number', label: 'Número', icon: '🔢', description: 'Valor numérico' },
  { type: 'email', label: 'Email', icon: '📧', description: 'Dirección de correo' },
  { type: 'phone', label: 'Teléfono', icon: '📞', description: 'Número telefónico' },
  { type: 'file', label: 'Archivo', icon: '📎', description: 'Carga de archivos' },
];

const CATEGORIES = [
  { value: 'CONSENT', label: 'Consentimiento' },
  { value: 'HIPAA_AUTHORIZATION', label: 'HIPAA' },
  { value: 'MEDICAL_HISTORY', label: 'Historia Médica' },
  { value: 'TREATMENT_CONSENT', label: 'Consentimiento de Tratamiento' },
  { value: 'FINANCIAL_AGREEMENT', label: 'Acuerdo Financiero' },
  { value: 'INSURANCE_INFORMATION', label: 'Información de Seguro' },
  { value: 'REFERRAL', label: 'Referencia' },
  { value: 'CUSTOM', label: 'Personalizado' },
];

export default function FormBuilderPage() {
  const router = useRouter();
  const [template, setTemplate] = useState<FormTemplate>({
    title: 'Nuevo Formulario',
    description: '',
    category: 'CUSTOM',
    estimatedMinutes: 10,
    fields: [],
  });

  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedType, setDraggedType] = useState<FieldType | null>(null);

  // Add field to form
  const addField = (type: FieldType) => {
    const newField: FormField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      label: `${FIELD_TYPES.find(ft => ft.type === type)?.label} ${template.fields.length + 1}`,
      placeholder: '',
      helpText: '',
      required: false,
      options: type === 'select' || type === 'checkbox' || type === 'radio' ? ['Opción 1', 'Opción 2'] : undefined,
    };

    setTemplate(prev => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));

    setSelectedField(newField);
  };

  // Update field
  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setTemplate(prev => ({
      ...prev,
      fields: prev.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f),
    }));

    if (selectedField?.id === fieldId) {
      setSelectedField(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  // Delete field
  const deleteField = (fieldId: string) => {
    setTemplate(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== fieldId),
    }));

    if (selectedField?.id === fieldId) {
      setSelectedField(null);
    }
  };

  // Duplicate field
  const duplicateField = (field: FormField) => {
    const duplicated: FormField = {
      ...field,
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      label: `${field.label} (copia)`,
    };

    const fieldIndex = template.fields.findIndex(f => f.id === field.id);
    const newFields = [...template.fields];
    newFields.splice(fieldIndex + 1, 0, duplicated);

    setTemplate(prev => ({ ...prev, fields: newFields }));
  };

  // Save template
  const saveTemplate = async () => {
    if (!template.title.trim()) {
      alert('Por favor, ingresa un título para el formulario');
      return;
    }

    if (template.fields.length === 0) {
      alert('Por favor, agrega al menos un campo al formulario');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/forms/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: template.title,
          description: template.description,
          category: template.category,
          estimatedMinutes: template.estimatedMinutes,
          structure: { fields: template.fields },
          isBuiltIn: false,
        }),
      });

      if (!response.ok) throw new Error('Failed to save template');

      router.push('/dashboard/forms?success=created');
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error al guardar el formulario. Por favor, intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  // Get field icon
  const getFieldIcon = (type: FieldType): string => {
    return FIELD_TYPES.find(ft => ft.type === type)?.icon || '📝';
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <input
                type="text"
                value={template.title}
                onChange={(e) => setTemplate(prev => ({ ...prev, title: e.target.value }))}
                className="text-2xl font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 -ml-2"
                placeholder="Nombre del formulario"
              />
              <p className="text-sm text-gray-500 mt-0.5 ml-2">
                {template.fields.length} campos • ~{template.estimatedMinutes} min
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center gap-2"
            >
              <span>{showPreview ? '✏️' : '👁️'}</span>
              <span>{showPreview ? 'Editar' : 'Vista Previa'}</span>
            </button>
            <Button
              onClick={saveTemplate}
              loading={isSaving}
              disabled={isSaving}
              size="md"
            >
              {isSaving ? 'Guardando...' : '💾 Guardar Formulario'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Field Palette */}
        {!showPreview && (
          <div className="w-72 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4 space-y-6">
              {/* Template Settings */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span>⚙️</span>
                  <span>Configuración</span>
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Categoría</label>
                    <select
                      value={template.category}
                      onChange={(e) => setTemplate(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
                    <textarea
                      value={template.description}
                      onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                      placeholder="Describe el propósito de este formulario..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Tiempo estimado (minutos)
                    </label>
                    <input
                      type="number"
                      value={template.estimatedMinutes}
                      onChange={(e) => setTemplate(prev => ({ ...prev, estimatedMinutes: parseInt(e.target.value) || 10 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min={1}
                      max={120}
                    />
                  </div>
                </div>
              </div>

              {/* Field Palette */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span>🧩</span>
                  <span>Tipos de Campo</span>
                </h3>
                <div className="space-y-2">
                  {FIELD_TYPES.map((fieldType) => (
                    <motion.button
                      key={fieldType.type}
                      onClick={() => addField(fieldType.type)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full p-3 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{fieldType.icon}</div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {fieldType.label}
                          </div>
                          <div className="text-xs text-gray-500">{fieldType.description}</div>
                        </div>
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Center - Form Canvas */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-white">
          {showPreview ? (
            /* Preview Mode */
            <div className="max-w-3xl mx-auto p-8">
              <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-8">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{template.title}</h2>
                  {template.description && (
                    <p className="text-gray-600">{template.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-4">
                    <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                      {CATEGORIES.find(c => c.value === template.category)?.label}
                    </span>
                    <span className="text-sm text-gray-500">
                      ⏱️ ~{template.estimatedMinutes} minutos
                    </span>
                  </div>
                </div>

                {template.fields.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📝</div>
                    <p className="text-gray-500">No hay campos en este formulario</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {template.fields.map((field, index) => (
                      <div key={field.id} className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-900">
                          {index + 1}. {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {field.helpText && (
                          <p className="text-xs text-gray-500">{field.helpText}</p>
                        )}
                        {renderPreviewField(field)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Edit Mode */
            <div className="max-w-4xl mx-auto p-8">
              {template.fields.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center">
                  <div className="text-6xl mb-4">🎨</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Comienza a construir tu formulario
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Selecciona campos de la paleta a la izquierda para agregar al formulario
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <span>💡</span>
                    <span>Tip: Puedes reordenar campos arrastrándolos</span>
                  </div>
                </div>
              ) : (
                <Reorder.Group
                  axis="y"
                  values={template.fields}
                  onReorder={(newFields) => setTemplate(prev => ({ ...prev, fields: newFields }))}
                  className="space-y-3"
                >
                  {template.fields.map((field, index) => (
                    <Reorder.Item key={field.id} value={field}>
                      <motion.div
                        layout
                        className={`bg-white border-2 rounded-xl p-4 transition-all cursor-move hover:shadow-lg ${
                          selectedField?.id === field.id
                            ? 'border-blue-500 shadow-lg ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                        onClick={() => setSelectedField(field)}
                      >
                        <div className="flex items-start gap-4">
                          {/* Drag Handle */}
                          <div className="flex flex-col items-center pt-1">
                            <div className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                              </svg>
                            </div>
                            <span className="text-xs text-gray-400 font-medium mt-1">{index + 1}</span>
                          </div>

                          {/* Field Icon */}
                          <div className="text-2xl pt-0.5">{getFieldIcon(field.type)}</div>

                          {/* Field Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 flex items-center gap-2">
                                  {field.label}
                                  {field.required && (
                                    <span className="text-red-500 text-sm">*</span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {FIELD_TYPES.find(ft => ft.type === field.type)?.label}
                                </div>
                                {field.helpText && (
                                  <div className="text-xs text-gray-600 mt-1">{field.helpText}</div>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    duplicateField(field);
                                  }}
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Duplicar"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('¿Eliminar este campo?')) {
                                      deleteField(field.id);
                                    }
                                  }}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Eliminar"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar - Field Properties */}
        {!showPreview && selectedField && (
          <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
            <div className="p-4 space-y-6">
              {/* Field Properties Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span>{getFieldIcon(selectedField.type)}</span>
                  <span>Propiedades del Campo</span>
                </h3>
                <button
                  onClick={() => setSelectedField(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Basic Properties */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Etiqueta del Campo *
                  </label>
                  <input
                    type="text"
                    value={selectedField.label}
                    onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Nombre completo"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Texto de Ayuda
                  </label>
                  <input
                    type="text"
                    value={selectedField.helpText || ''}
                    onChange={(e) => updateField(selectedField.id, { helpText: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Incluye segundo nombre si aplica"
                  />
                </div>

                {(selectedField.type === 'text' || selectedField.type === 'textarea' ||
                  selectedField.type === 'email' || selectedField.type === 'number') && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Placeholder
                    </label>
                    <input
                      type="text"
                      value={selectedField.placeholder || ''}
                      onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ej: Juan Pérez González"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Campo Requerido</span>
                    {selectedField.required && (
                      <span className="text-xs text-red-600 font-medium">*</span>
                    )}
                  </div>
                  <button
                    onClick={() => updateField(selectedField.id, { required: !selectedField.required })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      selectedField.required ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        selectedField.required ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Options for select/checkbox/radio */}
                {(selectedField.type === 'select' || selectedField.type === 'checkbox' || selectedField.type === 'radio') && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-medium text-gray-700">
                        Opciones
                      </label>
                      <button
                        onClick={() => {
                          const newOptions = [...(selectedField.options || []), `Opción ${(selectedField.options?.length || 0) + 1}`];
                          updateField(selectedField.id, { options: newOptions });
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        + Agregar
                      </button>
                    </div>
                    <div className="space-y-2">
                      {selectedField.options?.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...(selectedField.options || [])];
                              newOptions[index] = e.target.value;
                              updateField(selectedField.id, { options: newOptions });
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <button
                            onClick={() => {
                              const newOptions = (selectedField.options || []).filter((_, i) => i !== index);
                              updateField(selectedField.id, { options: newOptions });
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 rounded"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Validation */}
                {selectedField.type === 'number' && (
                  <div className="space-y-3">
                    <label className="block text-xs font-medium text-gray-700">Validación</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Mínimo</label>
                        <input
                          type="number"
                          value={selectedField.validation?.min || ''}
                          onChange={(e) => updateField(selectedField.id, {
                            validation: { ...selectedField.validation, min: parseInt(e.target.value) || undefined }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Máximo</label>
                        <input
                          type="number"
                          value={selectedField.validation?.max || ''}
                          onChange={(e) => updateField(selectedField.id, {
                            validation: { ...selectedField.validation, max: parseInt(e.target.value) || undefined }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Conditional Logic */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                    <span>🔀</span>
                    <span>Lógica Condicional</span>
                  </h4>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-900">
                    Muestra este campo solo si se cumple una condición específica
                  </p>
                  {template.fields.filter(f => f.id !== selectedField.id).length > 0 ? (
                    <div className="mt-3 space-y-2">
                      <select
                        value={selectedField.conditionalLogic?.showIf?.fieldId || ''}
                        onChange={(e) => {
                          if (!e.target.value) {
                            updateField(selectedField.id, { conditionalLogic: undefined });
                          } else {
                            updateField(selectedField.id, {
                              conditionalLogic: {
                                showIf: {
                                  fieldId: e.target.value,
                                  operator: 'equals',
                                  value: '',
                                }
                              }
                            });
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Sin condición</option>
                        {template.fields
                          .filter(f => f.id !== selectedField.id)
                          .map(f => (
                            <option key={f.id} value={f.id}>
                              Mostrar si "{f.label}"...
                            </option>
                          ))}
                      </select>

                      {selectedField.conditionalLogic?.showIf && (
                        <>
                          <select
                            value={selectedField.conditionalLogic.showIf.operator}
                            onChange={(e) => updateField(selectedField.id, {
                              conditionalLogic: {
                                showIf: {
                                  ...selectedField.conditionalLogic!.showIf!,
                                  operator: e.target.value as any,
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="equals">es igual a</option>
                            <option value="notEquals">no es igual a</option>
                            <option value="contains">contiene</option>
                            <option value="isEmpty">está vacío</option>
                            <option value="isNotEmpty">no está vacío</option>
                          </select>

                          {!['isEmpty', 'isNotEmpty'].includes(selectedField.conditionalLogic.showIf.operator) && (
                            <input
                              type="text"
                              value={selectedField.conditionalLogic.showIf.value}
                              onChange={(e) => updateField(selectedField.id, {
                                conditionalLogic: {
                                  showIf: {
                                    ...selectedField.conditionalLogic!.showIf!,
                                    value: e.target.value,
                                  }
                                }
                              })}
                              placeholder="Valor"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                            />
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-blue-700 mt-2">
                      Agrega más campos para crear lógica condicional
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to render preview fields
function renderPreviewField(field: FormField) {
  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          placeholder={field.placeholder}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
          rows={4}
          disabled
        />
      );
    case 'select':
      return (
        <select
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
          disabled
        >
          <option>Seleccionar...</option>
          {field.options?.map((opt, idx) => (
            <option key={idx}>{opt}</option>
          ))}
        </select>
      );
    case 'checkbox':
      return (
        <div className="space-y-2">
          {field.options?.map((opt, idx) => (
            <label key={idx} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                disabled
              />
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
      );
    case 'radio':
      return (
        <div className="space-y-2">
          {field.options?.map((opt, idx) => (
            <label key={idx} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
              <input
                type="radio"
                name={field.id}
                className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
                disabled
              />
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
      );
    case 'date':
      return (
        <input
          type="date"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
          disabled
        />
      );
    case 'file':
      return (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
          <div className="text-3xl mb-2">📎</div>
          <p className="text-sm text-gray-600">Arrastra archivos aquí o haz clic para seleccionar</p>
        </div>
      );
    default:
      return (
        <input
          type={field.type}
          placeholder={field.placeholder}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
          disabled
        />
      );
  }
}
