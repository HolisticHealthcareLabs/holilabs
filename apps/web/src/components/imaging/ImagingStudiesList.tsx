'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ImagingStudy {
  id: string;
  studyInstanceUID: string | null;
  accessionNumber: string | null;
  modality: string;
  bodyPart: string;
  description: string;
  indication: string | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'REPORTED' | 'CANCELLED';
  orderingDoctor: string | null;
  referringDoctor: string | null;
  performingFacility: string | null;
  imageCount: number;
  imageUrls: string[];
  thumbnailUrl: string | null;
  reportUrl: string | null;
  findings: string | null;
  impression: string | null;
  isAbnormal: boolean;
  scheduledDate: string | null;
  studyDate: string;
  reportDate: string | null;
  reviewedDate: string | null;
  technician: string | null;
  radiologist: string | null;
  notes: string | null;
}

interface ImagingStudiesListProps {
  patientId: string;
}

const statusColors = {
  SCHEDULED: 'bg-blue-100 text-blue-800 border-blue-300',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  COMPLETED: 'bg-green-100 text-green-800 border-green-300',
  REPORTED: 'bg-purple-100 text-purple-800 border-purple-300',
  CANCELLED: 'bg-gray-100 text-gray-800 border-gray-300',
};

const statusLabels = {
  SCHEDULED: 'Programado',
  IN_PROGRESS: 'En Progreso',
  COMPLETED: 'Completado',
  REPORTED: 'Reportado',
  CANCELLED: 'Cancelado',
};

const modalityIcons: Record<string, string> = {
  'X-Ray': '🩻',
  'CT': '🔬',
  'MRI': '🧲',
  'Ultrasound': '🔊',
  'Mammography': '👩‍⚕️',
  'PET': '☢️',
  'Nuclear Medicine': '☢️',
};

export default function ImagingStudiesList({ patientId }: ImagingStudiesListProps) {
  const [imagingStudies, setImagingStudies] = useState<ImagingStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [modalityFilter, setModalityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [abnormalFilter, setAbnormalFilter] = useState<string>('ALL');

  // Selected study for detail view
  const [selectedStudy, setSelectedStudy] = useState<ImagingStudy | null>(null);

  // Image viewer
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  useEffect(() => {
    fetchImagingStudies();
  }, [patientId, modalityFilter, statusFilter, abnormalFilter]);

  const fetchImagingStudies = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ patientId });
      if (modalityFilter !== 'ALL') params.append('modality', modalityFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (abnormalFilter !== 'ALL') params.append('isAbnormal', abnormalFilter);

      const response = await fetch(`/api/imaging?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Error al cargar estudios de imágenes');
      }

      const data = await response.json();
      setImagingStudies(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStudyClick = (study: ImagingStudy) => {
    setSelectedStudy(study);
  };

  const closeDetailView = () => {
    setSelectedStudy(null);
  };

  const openImageViewer = (imageUrl: string) => {
    setViewingImage(imageUrl);
  };

  const closeImageViewer = () => {
    setViewingImage(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
        <p className="text-sm font-semibold text-red-800">Error</p>
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Estudios de Imágenes</h2>
        {/* Decorative - low contrast intentional for count badge */}
        <span className="text-sm text-gray-500 dark:text-gray-400">{imagingStudies.length} estudios</span>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modalidad
            </label>
            <select
              value={modalityFilter}
              onChange={(e) => setModalityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">Todas</option>
              <option value="X-Ray">Rayos X</option>
              <option value="CT">Tomografía</option>
              <option value="MRI">Resonancia Magnética</option>
              <option value="Ultrasound">Ultrasonido</option>
              <option value="Mammography">Mamografía</option>
              <option value="PET">PET</option>
              <option value="Nuclear Medicine">Medicina Nuclear</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">Todos</option>
              <option value="SCHEDULED">Programado</option>
              <option value="IN_PROGRESS">En Progreso</option>
              <option value="COMPLETED">Completado</option>
              <option value="REPORTED">Reportado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hallazgos Anormales
            </label>
            <select
              value={abnormalFilter}
              onChange={(e) => setAbnormalFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">Todos</option>
              <option value="true">Solo Anormales</option>
              <option value="false">Solo Normales</option>
            </select>
          </div>
        </div>
      </div>

      {/* Studies Grid */}
      {imagingStudies.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">No se encontraron estudios de imágenes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {imagingStudies.map((study) => (
            <div
              key={study.id}
              onClick={() => handleStudyClick(study)}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            >
              {/* Thumbnail */}
              <div className="relative h-48 bg-gray-100 flex items-center justify-center">
                {study.thumbnailUrl ? (
                  <img
                    src={study.thumbnailUrl}
                    alt={study.description}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-6xl">{modalityIcons[study.modality] || '📷'}</div>
                )}
                {study.imageCount > 0 && (
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs font-medium">
                    {study.imageCount} imágenes
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-bold text-gray-900 line-clamp-2">
                      {study.description}
                    </h3>
                    {study.isAbnormal && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 border border-orange-300 ml-2">
                        Anormal
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {study.modality} • {study.bodyPart}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[study.status]}`}>
                    {statusLabels[study.status]}
                  </span>
                  {/* Decorative - low contrast intentional for timestamp */}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {format(new Date(study.studyDate), 'd MMM yyyy', { locale: es })}
                  </span>
                </div>

                {study.radiologist && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Radiólogo:</span> {study.radiologist}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedStudy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedStudy.description}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedStudy.modality} • {selectedStudy.bodyPart}</p>
              </div>
              <button
                onClick={closeDetailView}
                aria-label="Cerrar detalles"
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Abnormal Flag */}
              {selectedStudy.isAbnormal && (
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
                  <p className="text-sm font-semibold text-orange-800">⚠️ Hallazgos Anormales Detectados</p>
                </div>
              )}

              {/* Images Gallery */}
              {selectedStudy.imageUrls.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Imágenes ({selectedStudy.imageUrls.length})</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedStudy.imageUrls.map((url, idx) => (
                      <div
                        key={idx}
                        onClick={() => openImageViewer(url)}
                        className="relative h-32 bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-75 transition-opacity"
                      >
                        <img src={url} alt={`Imagen ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Findings & Impression */}
              {(selectedStudy.findings || selectedStudy.impression) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedStudy.findings && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-blue-900 mb-2">Hallazgos</h4>
                      <p className="text-sm text-blue-800 whitespace-pre-wrap">{selectedStudy.findings}</p>
                    </div>
                  )}

                  {selectedStudy.impression && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-purple-900 mb-2">Impresión</h4>
                      <p className="text-sm text-purple-800 whitespace-pre-wrap">{selectedStudy.impression}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Study Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  {/* Decorative - low contrast intentional for section header */}
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Estado</h4>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[selectedStudy.status]}`}>
                    {statusLabels[selectedStudy.status]}
                  </span>
                </div>

                {selectedStudy.accessionNumber && (
                  <div>
                    {/* Decorative - low contrast intentional for section header */}
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Número de Acceso</h4>
                    <p className="text-sm text-gray-900">{selectedStudy.accessionNumber}</p>
                  </div>
                )}

                {selectedStudy.studyInstanceUID && (
                  <div className="col-span-2">
                    {/* Decorative - low contrast intentional for section header */}
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Study Instance UID (DICOM)</h4>
                    <p className="text-xs text-gray-700 font-mono bg-gray-50 p-2 rounded">{selectedStudy.studyInstanceUID}</p>
                  </div>
                )}

                {selectedStudy.indication && (
                  <div className="col-span-2">
                    {/* Decorative - low contrast intentional for section header */}
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Indicación</h4>
                    <p className="text-sm text-gray-900">{selectedStudy.indication}</p>
                  </div>
                )}

                {selectedStudy.orderingDoctor && (
                  <div>
                    {/* Decorative - low contrast intentional for section header */}
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Médico Solicitante</h4>
                    <p className="text-sm text-gray-900">{selectedStudy.orderingDoctor}</p>
                  </div>
                )}

                {selectedStudy.radiologist && (
                  <div>
                    {/* Decorative - low contrast intentional for section header */}
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Radiólogo</h4>
                    <p className="text-sm text-gray-900">{selectedStudy.radiologist}</p>
                  </div>
                )}

                {selectedStudy.technician && (
                  <div>
                    {/* Decorative - low contrast intentional for section header */}
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Técnico</h4>
                    <p className="text-sm text-gray-900">{selectedStudy.technician}</p>
                  </div>
                )}

                {selectedStudy.performingFacility && (
                  <div>
                    {/* Decorative - low contrast intentional for section header */}
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Instalación</h4>
                    <p className="text-sm text-gray-900">{selectedStudy.performingFacility}</p>
                  </div>
                )}

                <div>
                  {/* Decorative - low contrast intentional for section header */}
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Fecha del Estudio</h4>
                  <p className="text-sm text-gray-900">
                    {format(new Date(selectedStudy.studyDate), "d 'de' MMMM, yyyy HH:mm", { locale: es })}
                  </p>
                </div>

                {selectedStudy.reportDate && (
                  <div>
                    {/* Decorative - low contrast intentional for section header */}
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Fecha del Reporte</h4>
                    <p className="text-sm text-gray-900">
                      {format(new Date(selectedStudy.reportDate), "d 'de' MMMM, yyyy HH:mm", { locale: es })}
                    </p>
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedStudy.notes && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Notas</h4>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-200">
                    {selectedStudy.notes}
                  </p>
                </div>
              )}

              {/* Report URL */}
              {selectedStudy.reportUrl && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Reporte</h4>
                  <a
                    href={selectedStudy.reportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    📄 Ver Reporte Completo
                  </a>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={closeDetailView}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {viewingImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-[60]"
          onClick={closeImageViewer}
        >
          <button
            onClick={closeImageViewer}
            aria-label="Cerrar visor de imagen"
            className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300"
          >
            ×
          </button>
          <img
            src={viewingImage}
            alt="Imagen ampliada"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
