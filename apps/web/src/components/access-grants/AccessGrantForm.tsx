'use client';

import { useState, useEffect } from 'react';

interface AccessGrantFormProps {
  patientId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface Resource {
  id: string;
  name: string;
  date: string;
}

const initialFormState = {
  grantedToType: 'EXTERNAL' as 'USER' | 'EXTERNAL',
  grantedToId: '',
  grantedToEmail: '',
  grantedToName: '',
  resourceType: 'ALL' as 'LAB_RESULT' | 'IMAGING_STUDY' | 'CLINICAL_NOTE' | 'ALL',
  resourceId: '',
  canView: true,
  canDownload: false,
  canShare: false,
  expiresAt: '',
  expirationType: 'never' as 'never' | '1week' | '1month' | '3months' | '6months' | '1year' | 'custom',
  purpose: '',
};

export default function AccessGrantForm({ patientId, onSuccess, onCancel }: AccessGrantFormProps) {
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resources
  const [labResults, setLabResults] = useState<Resource[]>([]);
  const [imagingStudies, setImagingStudies] = useState<Resource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);

  // Fetch resources when resource type changes
  useEffect(() => {
    if (formData.resourceType === 'LAB_RESULT') {
      fetchLabResults();
    } else if (formData.resourceType === 'IMAGING_STUDY') {
      fetchImagingStudies();
    }
  }, [formData.resourceType]);

  const fetchLabResults = async () => {
    try {
      setLoadingResources(true);
      const response = await fetch(`/api/lab-results?patientId=${patientId}`);
      if (response.ok) {
        const data = await response.json();
        setLabResults(
          data.data.map((result: any) => ({
            id: result.id,
            name: result.testName,
            date: result.resultDate,
          }))
        );
      }
    } catch (err) {
      console.error('Error fetching lab results:', err);
    } finally {
      setLoadingResources(false);
    }
  };

  const fetchImagingStudies = async () => {
    try {
      setLoadingResources(true);
      const response = await fetch(`/api/imaging?patientId=${patientId}`);
      if (response.ok) {
        const data = await response.json();
        setImagingStudies(
          data.data.map((study: any) => ({
            id: study.id,
            name: `${study.modality}: ${study.description}`,
            date: study.studyDate,
          }))
        );
      }
    } catch (err) {
      console.error('Error fetching imaging studies:', err);
    } finally {
      setLoadingResources(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));

      // Reset resource selection when type changes
      if (name === 'resourceType') {
        setFormData((prev) => ({ ...prev, resourceId: '' }));
      }
    }
  };

  const handleExpirationTypeChange = (type: string) => {
    setFormData((prev) => ({ ...prev, expirationType: type as any }));

    const now = new Date();
    let expiresAt = '';

    switch (type) {
      case '1week':
        expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
        break;
      case '1month':
        expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
        break;
      case '3months':
        expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
        break;
      case '6months':
        expiresAt = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
        break;
      case '1year':
        expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
        break;
      case 'never':
        expiresAt = '';
        break;
    }

    setFormData((prev) => ({ ...prev, expiresAt }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validation
      if (formData.grantedToType === 'EXTERNAL') {
        if (!formData.grantedToEmail || !formData.grantedToName) {
          throw new Error('Email y nombre son obligatorios para usuarios externos');
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.grantedToEmail)) {
          throw new Error('Formato de email inválido');
        }
      }

      if (!formData.canView && !formData.canDownload && !formData.canShare) {
        throw new Error('Debe seleccionar al menos un permiso');
      }

      // Prepare request body
      const body: any = {
        patientId,
        grantedToType: formData.grantedToType,
        resourceType: formData.resourceType,
        canView: formData.canView,
        canDownload: formData.canDownload,
        canShare: formData.canShare,
        purpose: formData.purpose || null,
      };

      // Add recipient info
      if (formData.grantedToType === 'USER') {
        body.grantedToId = formData.grantedToId;
      } else {
        body.grantedToEmail = formData.grantedToEmail;
        body.grantedToName = formData.grantedToName;
      }

      // Add resource specifics
      if (formData.resourceType === 'LAB_RESULT' && formData.resourceId) {
        body.labResultId = formData.resourceId;
        body.resourceId = formData.resourceId;
      } else if (formData.resourceType === 'IMAGING_STUDY' && formData.resourceId) {
        body.imagingStudyId = formData.resourceId;
        body.resourceId = formData.resourceId;
      }

      // Add expiration
      if (formData.expiresAt) {
        body.expiresAt = formData.expiresAt;
      }

      const response = await fetch('/api/access-grants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear permiso de acceso');
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

      {/* Info Box */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800 font-medium">Control de Acceso Granular</p>
            <p className="text-sm text-blue-700 mt-1">
              Otorga acceso específico a tus datos médicos. Puedes compartir resultados individuales
              o todos tus datos, y revocar el acceso en cualquier momento.
            </p>
          </div>
        </div>
      </div>

      {/* Recipient Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Destinatario</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Destinatario
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="grantedToType"
                  value="EXTERNAL"
                  checked={formData.grantedToType === 'EXTERNAL'}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-900">Usuario Externo</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="grantedToType"
                  value="USER"
                  checked={formData.grantedToType === 'USER'}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-900">Usuario del Sistema</span>
              </label>
            </div>
          </div>

          {formData.grantedToType === 'EXTERNAL' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre Completo <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="grantedToName"
                  value={formData.grantedToName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Dr. Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  name="grantedToEmail"
                  value={formData.grantedToEmail}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="doctor@ejemplo.com"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Usuario <span className="text-red-600">*</span>
              </label>
              <select
                name="grantedToId"
                value={formData.grantedToId}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccione un usuario...</option>
                <option value="user-1">Dr. Juan Pérez (juan@ejemplo.com)</option>
                <option value="user-2">Dra. María García (maria@ejemplo.com)</option>
              </select>
              {/* Decorative - low contrast intentional for helper text */}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Usuarios del sistema de salud que ya tienen cuenta
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Resource Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Recurso a Compartir</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Recurso <span className="text-red-600">*</span>
            </label>
            <select
              name="resourceType"
              value={formData.resourceType}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">Todos mis datos médicos</option>
              <option value="LAB_RESULT">Resultado de Laboratorio Específico</option>
              <option value="IMAGING_STUDY">Estudio de Imágenes Específico</option>
              <option value="CLINICAL_NOTE">Nota Clínica Específica</option>
            </select>
          </div>

          {formData.resourceType === 'LAB_RESULT' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Resultado de Laboratorio
              </label>
              {/* Decorative - low contrast intentional for loading state */}
              {loadingResources ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Cargando resultados...</p>
              ) : (
                <select
                  name="resourceId"
                  value={formData.resourceId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seleccione un resultado...</option>
                  {labResults.map((result) => (
                    <option key={result.id} value={result.id}>
                      {result.name} ({new Date(result.date).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {formData.resourceType === 'IMAGING_STUDY' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Estudio de Imágenes
              </label>
              {/* Decorative - low contrast intentional for loading state */}
              {loadingResources ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Cargando estudios...</p>
              ) : (
                <select
                  name="resourceId"
                  value={formData.resourceId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seleccione un estudio...</option>
                  {imagingStudies.map((study) => (
                    <option key={study.id} value={study.id}>
                      {study.name} ({new Date(study.date).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Permissions Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Permisos</h3>

        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="canView"
              checked={formData.canView}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-3">
              <span className="text-sm font-medium text-gray-900">Ver</span>
              <span className="text-xs text-gray-600 block">Permite visualizar el contenido</span>
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              name="canDownload"
              checked={formData.canDownload}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-3">
              <span className="text-sm font-medium text-gray-900">Descargar</span>
              <span className="text-xs text-gray-600 block">Permite descargar archivos y documentos</span>
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              name="canShare"
              checked={formData.canShare}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-3">
              <span className="text-sm font-medium text-gray-900">Compartir</span>
              <span className="text-xs text-gray-600 block">Permite compartir con terceros (requiere autorización)</span>
            </span>
          </label>
        </div>
      </div>

      {/* Expiration Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Vencimiento del Acceso</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duración del Acceso
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { value: 'never', label: 'Sin vencimiento' },
                { value: '1week', label: '1 semana' },
                { value: '1month', label: '1 mes' },
                { value: '3months', label: '3 meses' },
                { value: '6months', label: '6 meses' },
                { value: '1year', label: '1 año' },
                { value: 'custom', label: 'Personalizado' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleExpirationTypeChange(option.value)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    formData.expirationType === option.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {formData.expirationType === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha y Hora de Vencimiento
              </label>
              <input
                type="datetime-local"
                name="expiresAt"
                value={formData.expiresAt}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Purpose Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Propósito (Opcional)</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ¿Por qué compartes esta información?
          </label>
          <textarea
            name="purpose"
            value={formData.purpose}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ej: Segunda opinión médica, consulta con especialista, trámite de seguro..."
          />
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
              Creando...
            </>
          ) : (
            'Crear Permiso de Acceso'
          )}
        </button>
      </div>
    </form>
  );
}
