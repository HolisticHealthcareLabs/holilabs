'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    message?: string;
  };
}

interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

interface FormData {
  id: string;
  template: {
    title: string;
    description: string;
    structure: {
      sections: FormSection[];
    };
  };
  patient: {
    firstName: string;
    lastName: string;
  };
  status: string;
  progress: number;
  responses: Record<string, any>;
  expiresAt: string;
}

export default function PatientFormPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [formData, setFormData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchForm();
  }, [token]);

  const fetchForm = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/forms/public/${token}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Formulario no encontrado o expirado');
        } else if (response.status === 410) {
          setError('Este formulario ya ha sido completado');
        } else {
          setError('Error al cargar el formulario');
        }
        return;
      }

      const data = await response.json();
      setFormData(data.form);
      setResponses(data.form.responses || {});
    } catch (err) {
      setError('Error de conexión. Por favor, intenta de nuevo.');
      console.error('Error fetching form:', err);
    } finally {
      setLoading(false);
    }
  };

  const autoSave = async () => {
    if (!formData || saving) return;

    setSaving(true);
    try {
      await fetch(`/api/forms/public/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses, progress: calculateProgress() }),
      });
    } catch (err) {
      console.error('Auto-save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData && Object.keys(responses).length > 0) {
        autoSave();
      }
    }, 10000); // Auto-save every 10 seconds

    return () => clearTimeout(timer);
  }, [responses]);

  const calculateProgress = () => {
    if (!formData) return 0;
    const totalFields = formData.template.structure.sections.reduce(
      (acc, section) => acc + section.fields.length,
      0
    );
    const completedFields = Object.keys(responses).length;
    return Math.round((completedFields / totalFields) * 100);
  };

  const validateField = (field: FormField, value: any): boolean => {
    setFieldError(null);

    if (field.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      setFieldError('Este campo es requerido');
      return false;
    }

    if (field.validation) {
      if (field.validation.pattern && typeof value === 'string') {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(value)) {
          setFieldError(field.validation.message || 'Formato inválido');
          return false;
        }
      }

      if (field.validation.min !== undefined && value < field.validation.min) {
        setFieldError(`El valor mínimo es ${field.validation.min}`);
        return false;
      }

      if (field.validation.max !== undefined && value > field.validation.max) {
        setFieldError(`El valor máximo es ${field.validation.max}`);
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (!formData) return;

    const currentSection = formData.template.structure.sections[currentSectionIndex];
    const currentField = currentSection.fields[currentFieldIndex];

    // Validate current field
    const value = responses[currentField.id];
    if (!validateField(currentField, value)) {
      return;
    }

    // Move to next field
    if (currentFieldIndex < currentSection.fields.length - 1) {
      setCurrentFieldIndex(currentFieldIndex + 1);
    } else if (currentSectionIndex < formData.template.structure.sections.length - 1) {
      // Move to next section
      setCurrentSectionIndex(currentSectionIndex + 1);
      setCurrentFieldIndex(0);
    } else {
      // All fields completed, show review
      router.push(`/portal/forms/${token}/review`);
    }
  };

  const handlePrevious = () => {
    if (currentFieldIndex > 0) {
      setCurrentFieldIndex(currentFieldIndex - 1);
    } else if (currentSectionIndex > 0) {
      const prevSection = formData!.template.structure.sections[currentSectionIndex - 1];
      setCurrentSectionIndex(currentSectionIndex - 1);
      setCurrentFieldIndex(prevSection.fields.length - 1);
    }
  };

  const handleResponse = (fieldId: string, value: any) => {
    setResponses({ ...responses, [fieldId]: value });
    setFieldError(null);
  };

  const renderField = (field: FormField) => {
    const value = responses[field.id];

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
        return (
          <input
            type={field.type}
            value={value || ''}
            onChange={(e) => handleResponse(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-6 py-4 text-lg border-b-2 border-gray-300 focus:border-blue-600 focus:outline-none transition-colors bg-transparent"
            autoFocus
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => handleResponse(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none transition-colors resize-none"
            autoFocus
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleResponse(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-6 py-4 text-lg border-b-2 border-gray-300 focus:border-blue-600 focus:outline-none transition-colors bg-transparent"
            autoFocus
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => handleResponse(field.id, e.target.value)}
            className="w-full px-6 py-4 text-lg border-b-2 border-gray-300 focus:border-blue-600 focus:outline-none transition-colors bg-transparent"
            autoFocus
          />
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleResponse(field.id, e.target.value)}
            className="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none transition-colors"
            autoFocus
          >
            <option value="">Selecciona una opción</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-3">
            {field.options?.map((option) => (
              <button
                key={option}
                onClick={() => handleResponse(field.id, option)}
                className={`w-full px-6 py-4 text-left text-lg border-2 rounded-lg transition-all ${
                  value === option
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{option}</span>
                  {value === option && (
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleResponse(field.id, e.target.checked)}
              className="w-6 h-6 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
            />
            <label className="text-lg text-gray-700 cursor-pointer" onClick={() => handleResponse(field.id, !value)}>
              {field.label}
            </label>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando formulario...</p>
        </div>
      </div>
    );
  }

  if (error || !formData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const currentSection = formData.template.structure.sections[currentSectionIndex];
  const currentField = currentSection.fields[currentFieldIndex];
  const progress = calculateProgress();
  const isFirstField = currentSectionIndex === 0 && currentFieldIndex === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50">
        <motion.div
          className="h-full bg-blue-600"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md shadow-sm z-40 mt-1">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{formData.template.title}</h1>
            <p className="text-sm text-gray-500">Para: {formData.patient.firstName} {formData.patient.lastName}</p>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-blue-600">{progress}% completado</div>
            {saving && <div className="text-xs text-gray-500">Guardando...</div>}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pt-32 pb-12">
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentSectionIndex}-${currentFieldIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl shadow-xl p-8 md:p-12"
            >
              {/* Section Title */}
              {currentFieldIndex === 0 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{currentSection.title}</h2>
                  {currentSection.description && (
                    <p className="text-gray-600">{currentSection.description}</p>
                  )}
                </div>
              )}

              {/* Question Number */}
              <div className="text-sm text-gray-500 mb-2">
                Pregunta {currentSectionIndex + 1}.{currentFieldIndex + 1}
              </div>

              {/* Field Label */}
              <label className="block text-2xl font-medium text-gray-900 mb-6">
                {currentField.label}
                {currentField.required && <span className="text-red-500 ml-1">*</span>}
              </label>

              {/* Field Input */}
              <div className="mb-6">{renderField(currentField)}</div>

              {/* Error Message */}
              {fieldError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
                >
                  <p className="text-sm text-red-700">{fieldError}</p>
                </motion.div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-6">
                <button
                  onClick={handlePrevious}
                  disabled={isFirstField}
                  className="px-6 py-3 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Atrás
                </button>

                <button
                  onClick={handleNext}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg shadow-blue-600/30 flex items-center gap-2"
                >
                  Siguiente
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Helper Text */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Presiona <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">Enter</kbd> para continuar
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
