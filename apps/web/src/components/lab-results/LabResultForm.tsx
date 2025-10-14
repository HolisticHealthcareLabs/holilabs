'use client';

import { useState } from 'react';
import { format } from 'date-fns';

interface LabResultFormProps {
  patientId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const initialFormState = {
  testName: '',
  testCode: '',
  category: '',
  orderingDoctor: '',
  performingLab: '',
  value: '',
  unit: '',
  referenceRange: '',
  status: 'PRELIMINARY' as const,
  interpretation: '',
  isAbnormal: false,
  isCritical: false,
  orderedDate: '',
  collectedDate: '',
  resultDate: '',
  notes: '',
  attachmentUrl: '',
};

export default function LabResultForm({ patientId, onSuccess, onCancel }: LabResultFormProps) {
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.testName || !formData.resultDate) {
        throw new Error('Los campos Nombre de Prueba y Fecha de Resultado son obligatorios');
      }

      const response = await fetch('/api/lab-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId,
          testName: formData.testName,
          testCode: formData.testCode || null,
          category: formData.category || null,
          orderingDoctor: formData.orderingDoctor || null,
          performingLab: formData.performingLab || null,
          value: formData.value || null,
          unit: formData.unit || null,
          referenceRange: formData.referenceRange || null,
          status: formData.status,
          interpretation: formData.interpretation || null,
          isAbnormal: formData.isAbnormal,
          isCritical: formData.isCritical,
          orderedDate: formData.orderedDate || null,
          collectedDate: formData.collectedDate || null,
          resultDate: formData.resultDate,
          notes: formData.notes || null,
          attachmentUrl: formData.attachmentUrl || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear resultado de laboratorio');
      }

      // Reset form
      setFormData(initialFormState);

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <p className="text-sm font-semibold text-red-800">Error</p>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Test Information Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Información de la Prueba</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de Prueba <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="testName"
              value={formData.testName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: Hemograma Completo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código LOINC
            </label>
            <input
              type="text"
              name="testCode"
              value={formData.testCode}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: 58410-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoría
            </label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: Hematología, Química Clínica"
            />
          </div>
        </div>
      </div>

      {/* Result Values Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Valores del Resultado</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valor
            </label>
            <input
              type="text"
              name="value"
              value={formData.value}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: 14.5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unidad
            </label>
            <input
              type="text"
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: g/dL, mg/dL"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rango de Referencia
            </label>
            <input
              type="text"
              name="referenceRange"
              value={formData.referenceRange}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: 12-16 g/dL"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Interpretación
            </label>
            <textarea
              name="interpretation"
              value={formData.interpretation}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Interpretación clínica del resultado..."
            />
          </div>
        </div>
      </div>

      {/* Status and Flags Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Estado y Marcadores</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="PRELIMINARY">Preliminar</option>
              <option value="FINAL">Final</option>
              <option value="CORRECTED">Corregido</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>

          <div className="flex items-center pt-8">
            <input
              type="checkbox"
              id="isAbnormal"
              name="isAbnormal"
              checked={formData.isAbnormal}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isAbnormal" className="ml-2 block text-sm text-gray-900">
              Resultado Anormal
            </label>
          </div>

          <div className="flex items-center pt-8">
            <input
              type="checkbox"
              id="isCritical"
              name="isCritical"
              checked={formData.isCritical}
              onChange={handleChange}
              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
            />
            <label htmlFor="isCritical" className="ml-2 block text-sm text-gray-900">
              Resultado Crítico
            </label>
          </div>
        </div>
      </div>

      {/* Provider Information Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Información del Proveedor</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Médico Solicitante
            </label>
            <input
              type="text"
              name="orderingDoctor"
              value={formData.orderingDoctor}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nombre del médico"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Laboratorio
            </label>
            <input
              type="text"
              name="performingLab"
              value={formData.performingLab}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nombre del laboratorio"
            />
          </div>
        </div>
      </div>

      {/* Dates Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Fechas</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Orden
            </label>
            <input
              type="datetime-local"
              name="orderedDate"
              value={formData.orderedDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Recolección
            </label>
            <input
              type="datetime-local"
              name="collectedDate"
              value={formData.collectedDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Resultado <span className="text-red-600">*</span>
            </label>
            <input
              type="datetime-local"
              name="resultDate"
              value={formData.resultDate}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Additional Information Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Información Adicional</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Notas adicionales sobre el resultado..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL del Adjunto
            </label>
            <input
              type="url"
              name="attachmentUrl"
              value={formData.attachmentUrl}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://ejemplo.com/documento.pdf"
            />
            <p className="mt-1 text-xs text-gray-500">URL del documento PDF o imagen del resultado</p>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
        )}

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Guardando...
            </>
          ) : (
            'Guardar Resultado'
          )}
        </button>
      </div>
    </form>
  );
}
