'use client';

import { useState } from 'react';

interface ImagingStudyFormProps {
  patientId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const initialFormState = {
  studyInstanceUID: '',
  accessionNumber: '',
  modality: 'X-Ray',
  bodyPart: '',
  description: '',
  indication: '',
  status: 'SCHEDULED' as const,
  orderingDoctor: '',
  referringDoctor: '',
  performingFacility: '',
  imageCount: 0,
  imageUrls: [] as string[],
  thumbnailUrl: '',
  reportUrl: '',
  findings: '',
  impression: '',
  isAbnormal: false,
  scheduledDate: '',
  studyDate: '',
  reportDate: '',
  technician: '',
  radiologist: '',
  notes: '',
};

export default function ImagingStudyForm({ patientId, onSuccess, onCancel }: ImagingStudyFormProps) {
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData((prev) => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddImageUrl = () => {
    if (imageUrlInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        imageUrls: [...prev.imageUrls, imageUrlInput.trim()],
        imageCount: prev.imageUrls.length + 1,
      }));
      setImageUrlInput('');
    }
  };

  const handleRemoveImageUrl = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, i) => i !== index),
      imageCount: prev.imageUrls.length - 1,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.modality || !formData.bodyPart || !formData.description || !formData.studyDate) {
        throw new Error('Los campos Modalidad, Parte del Cuerpo, Descripción y Fecha del Estudio son obligatorios');
      }

      const response = await fetch('/api/imaging', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId,
          studyInstanceUID: formData.studyInstanceUID || null,
          accessionNumber: formData.accessionNumber || null,
          modality: formData.modality,
          bodyPart: formData.bodyPart,
          description: formData.description,
          indication: formData.indication || null,
          status: formData.status,
          orderingDoctor: formData.orderingDoctor || null,
          referringDoctor: formData.referringDoctor || null,
          performingFacility: formData.performingFacility || null,
          imageCount: formData.imageCount,
          imageUrls: formData.imageUrls,
          thumbnailUrl: formData.thumbnailUrl || null,
          reportUrl: formData.reportUrl || null,
          findings: formData.findings || null,
          impression: formData.impression || null,
          isAbnormal: formData.isAbnormal,
          scheduledDate: formData.scheduledDate || null,
          studyDate: formData.studyDate,
          reportDate: formData.reportDate || null,
          technician: formData.technician || null,
          radiologist: formData.radiologist || null,
          notes: formData.notes || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear estudio de imágenes');
      }

      // Reset form
      setFormData(initialFormState);
      setImageUrlInput('');

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

      {/* Study Information Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Información del Estudio</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modalidad <span className="text-red-600">*</span>
            </label>
            <select
              name="modality"
              value={formData.modality}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="X-Ray">Rayos X</option>
              <option value="CT">Tomografía (CT)</option>
              <option value="MRI">Resonancia Magnética (MRI)</option>
              <option value="Ultrasound">Ultrasonido</option>
              <option value="Mammography">Mamografía</option>
              <option value="PET">PET</option>
              <option value="Nuclear Medicine">Medicina Nuclear</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Parte del Cuerpo <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="bodyPart"
              value={formData.bodyPart}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: Tórax, Abdomen, Rodilla"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: Radiografía de Tórax AP y Lateral"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Indicación
            </label>
            <textarea
              name="indication"
              value={formData.indication}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Razón del estudio..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Study Instance UID (DICOM)
            </label>
            <input
              type="text"
              name="studyInstanceUID"
              value={formData.studyInstanceUID}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="1.2.840.113619.2.xxx"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número de Acceso
            </label>
            <input
              type="text"
              name="accessionNumber"
              value={formData.accessionNumber}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Número único del estudio"
            />
          </div>
        </div>
      </div>

      {/* Status Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Estado</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado del Estudio
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="SCHEDULED">Programado</option>
              <option value="IN_PROGRESS">En Progreso</option>
              <option value="COMPLETED">Completado</option>
              <option value="REPORTED">Reportado</option>
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
              Hallazgos Anormales
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
              Médico Referente
            </label>
            <input
              type="text"
              name="referringDoctor"
              value={formData.referringDoctor}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nombre del médico"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instalación
            </label>
            <input
              type="text"
              name="performingFacility"
              value={formData.performingFacility}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Centro de imágenes"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Técnico
            </label>
            <input
              type="text"
              name="technician"
              value={formData.technician}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nombre del técnico"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Radiólogo
            </label>
            <input
              type="text"
              name="radiologist"
              value={formData.radiologist}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nombre del radiólogo"
            />
          </div>
        </div>
      </div>

      {/* Findings Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Hallazgos y Conclusiones</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hallazgos
            </label>
            <textarea
              name="findings"
              value={formData.findings}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Descripción detallada de los hallazgos..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Impresión
            </label>
            <textarea
              name="impression"
              value={formData.impression}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Conclusión o impresión diagnóstica..."
            />
          </div>
        </div>
      </div>

      {/* Images Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Imágenes</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL de Miniatura
            </label>
            <input
              type="url"
              name="thumbnailUrl"
              value={formData.thumbnailUrl}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://ejemplo.com/thumbnail.jpg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URLs de Imágenes
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="url"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://ejemplo.com/imagen.jpg"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Agregar
              </button>
            </div>

            {formData.imageUrls.length > 0 && (
              <div className="space-y-2">
                {formData.imageUrls.map((url, index) => (
                  <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                    <span className="flex-1 text-sm text-gray-700 truncate">{url}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveImageUrl(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <p className="text-xs text-gray-500">{formData.imageUrls.length} imagen(es) agregada(s)</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL del Reporte
            </label>
            <input
              type="url"
              name="reportUrl"
              value={formData.reportUrl}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://ejemplo.com/reporte.pdf"
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
              Fecha Programada
            </label>
            <input
              type="datetime-local"
              name="scheduledDate"
              value={formData.scheduledDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha del Estudio <span className="text-red-600">*</span>
            </label>
            <input
              type="datetime-local"
              name="studyDate"
              value={formData.studyDate}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha del Reporte
            </label>
            <input
              type="datetime-local"
              name="reportDate"
              value={formData.reportDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Notas Adicionales</h3>

        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Notas adicionales sobre el estudio..."
        />
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
            'Guardar Estudio'
          )}
        </button>
      </div>
    </form>
  );
}
