/**
export const dynamic = 'force-dynamic';

 * Documents Page
 *
 * Beautiful mobile-first document management interface
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import FileUploader from '@/components/upload/FileUploader';

type DocumentType = 'LAB_RESULT' | 'IMAGING' | 'PRESCRIPTION' | 'INSURANCE' | 'CONSENT' | 'OTHER';

interface Document {
  id: string;
  title: string;
  description: string | null;
  type: DocumentType;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  uploadedByUser: {
    firstName: string;
    lastName: string;
    role: string;
  };
}

interface DocumentsData {
  documents: Document[];
  summary: {
    total: number;
    totalSizeMB: string;
    byType: Record<string, number>;
  };
  documentsByType: Record<string, Document[]>;
}

export default function DocumentsPage() {
  const [data, setData] = useState<DocumentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<DocumentType | 'ALL'>('ALL');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadStep, setUploadStep] = useState<'upload' | 'details'>('upload');
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [documentDetails, setDocumentDetails] = useState({
    title: '',
    description: '',
    type: 'OTHER' as DocumentType,
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/portal/documents');
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al cargar documentos');
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: DocumentType): string => {
    const labels: Record<DocumentType, string> = {
      LAB_RESULT: 'Resultado de Laboratorio',
      IMAGING: 'Imagen Médica',
      PRESCRIPTION: 'Receta',
      INSURANCE: 'Seguro',
      CONSENT: 'Consentimiento',
      OTHER: 'Otro',
    };
    return labels[type];
  };

  const getTypeIcon = (type: DocumentType): string => {
    const icons: Record<DocumentType, string> = {
      LAB_RESULT: '🧪',
      IMAGING: '📸',
      PRESCRIPTION: '💊',
      INSURANCE: '🏥',
      CONSENT: '📋',
      OTHER: '📄',
    };
    return icons[type];
  };

  const getTypeColor = (type: DocumentType): string => {
    const colors: Record<DocumentType, string> = {
      LAB_RESULT: 'from-blue-400 to-blue-600',
      IMAGING: 'from-purple-400 to-purple-600',
      PRESCRIPTION: 'from-green-400 to-green-600',
      INSURANCE: 'from-orange-400 to-orange-600',
      CONSENT: 'from-gray-400 to-gray-600',
      OTHER: 'from-pink-400 to-pink-600',
    };
    return colors[type];
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleUploadComplete = (result: any) => {
    setUploadedFile(result);
    setUploadStep('details');
  };

  const handleSaveDocument = async () => {
    if (!uploadedFile) return;

    try {
      const response = await fetch('/api/portal/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: documentDetails.title || 'Documento sin título',
          description: documentDetails.description,
          type: documentDetails.type,
          fileUrl: uploadedFile.url,
          mimeType: uploadedFile.contentType,
          fileSize: uploadedFile.size,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar documento');
      }

      // Reset and refresh
      setShowUploadModal(false);
      setUploadStep('upload');
      setUploadedFile(null);
      setDocumentDetails({ title: '', description: '', type: 'OTHER' });
      fetchDocuments();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar documento');
    }
  };

  const filteredDocuments =
    selectedType === 'ALL'
      ? data?.documents || []
      : data?.documents.filter((doc) => doc.type === selectedType) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg
              className="w-8 h-8 text-green-600 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">Cargando documentos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            Error al cargar
          </h2>
          <p className="text-gray-600 mb-6 text-center">{error}</p>
          <button
            onClick={() => fetchDocuments()}
            className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            Mis Documentos
          </h1>
          <p className="text-gray-600">
            Gestiona y consulta tus documentos médicos
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-green-400 to-green-600 rounded-xl p-6 text-white shadow-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">📁</span>
              <span className="text-3xl font-bold">{data?.summary.total || 0}</span>
            </div>
            <p className="text-sm font-medium">Total Documentos</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl p-6 text-white shadow-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">🧪</span>
              <span className="text-3xl font-bold">
                {data?.summary.byType.LAB_RESULT || 0}
              </span>
            </div>
            <p className="text-sm font-medium">Laboratorios</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl p-6 text-white shadow-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">📸</span>
              <span className="text-3xl font-bold">
                {data?.summary.byType.IMAGING || 0}
              </span>
            </div>
            <p className="text-sm font-medium">Imágenes</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl p-6 text-white shadow-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">💾</span>
              <span className="text-2xl font-bold">
                {data?.summary.totalSizeMB} MB
              </span>
            </div>
            <p className="text-sm font-medium">Almacenamiento</p>
          </motion.div>
        </div>

        {/* Upload Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowUploadModal(true)}
            className="w-full lg:w-auto px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Subir Documento
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedType('ALL')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedType === 'ALL'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Todos ({data?.summary.total || 0})
          </button>
          {(['LAB_RESULT', 'IMAGING', 'PRESCRIPTION', 'INSURANCE', 'CONSENT', 'OTHER'] as DocumentType[]).map(
            (type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedType === type
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {getTypeIcon(type)} {getTypeLabel(type)} ({data?.summary.byType[type] || 0})
              </button>
            )
          )}
        </div>

        {/* Documents List */}
        {filteredDocuments.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-12 text-center">
            {/* Decorative - low contrast intentional for empty state icon */}
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-gray-400"
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
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No hay documentos
            </h3>
            <p className="text-gray-600 mb-6">
              {selectedType === 'ALL'
                ? 'Aún no tienes documentos cargados'
                : `No tienes documentos de tipo "${getTypeLabel(selectedType)}"`}
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              Subir Primer Documento
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredDocuments.map((doc, index) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={`w-14 h-14 bg-gradient-to-br ${getTypeColor(
                      doc.type
                    )} rounded-xl flex items-center justify-center text-3xl flex-shrink-0`}
                  >
                    {getTypeIcon(doc.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          {doc.title}
                        </h3>
                        {doc.description && (
                          <p className="text-sm text-gray-600 mb-2">{doc.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            {formatDate(doc.uploadedAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                              />
                            </svg>
                            {formatFileSize(doc.fileSize)}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                            {doc.uploadedByUser.firstName} {doc.uploadedByUser.lastName}
                          </span>
                        </div>
                      </div>

                      {/* Type Badge */}
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full whitespace-nowrap">
                        {getTypeLabel(doc.type)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-4">
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        Ver
                      </a>
                      <a
                        href={doc.fileUrl}
                        download
                        className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        Descargar
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full my-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Subir Documento
                </h2>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadStep('upload');
                    setUploadedFile(null);
                    setDocumentDetails({ title: '', description: '', type: 'OTHER' });
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {/* Decorative - low contrast intentional for close button icon */}
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {uploadStep === 'upload' ? (
                <FileUploader
                  onUploadComplete={handleUploadComplete}
                  folder="patient-documents"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  maxSize={50}
                />
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Título del documento <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={documentDetails.title}
                      onChange={(e) => setDocumentDetails({ ...documentDetails, title: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Ej: Análisis de sangre"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tipo de documento
                    </label>
                    <select
                      value={documentDetails.type}
                      onChange={(e) => setDocumentDetails({ ...documentDetails, type: e.target.value as DocumentType })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="LAB_RESULT">Resultado de Laboratorio</option>
                      <option value="IMAGING">Imagen Médica</option>
                      <option value="PRESCRIPTION">Receta</option>
                      <option value="INSURANCE">Seguro</option>
                      <option value="CONSENT">Consentimiento</option>
                      <option value="OTHER">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Descripción (opcional)
                    </label>
                    <textarea
                      value={documentDetails.description}
                      onChange={(e) => setDocumentDetails({ ...documentDetails, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                      placeholder="Notas adicionales sobre el documento..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setUploadStep('upload');
                        setUploadedFile(null);
                      }}
                      className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                    >
                      Volver
                    </button>
                    <button
                      onClick={handleSaveDocument}
                      disabled={!documentDetails.title.trim()}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Guardar Documento
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Info Card */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">
            💡 Sobre tus documentos
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>
                Todos tus documentos están encriptados y protegidos con tecnología blockchain
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>
                Puedes ver y descargar tus documentos en cualquier momento
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>
                Los documentos subidos por tu médico aparecerán automáticamente aquí
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
