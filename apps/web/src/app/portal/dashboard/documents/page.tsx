'use client';
export const dynamic = 'force-dynamic';


/**
 * Documents Page - Patient Document Wallet
 * View and download medical documents securely
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronLeftIcon,
  DocumentTextIcon,
  FolderIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

interface Document {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageUrl: string;
  documentType: 'LAB_RESULT' | 'IMAGING' | 'PRESCRIPTION' | 'INSURANCE' | 'CONSENT' | 'OTHER';
  createdAt: string;
  documentHash: string;
}

interface DocumentsResponse {
  success: boolean;
  data?: {
    documents: Document[];
    summary: {
      total: number;
      totalSizeMB: string;
      byType: Record<string, number>;
    };
    documentsByType: Record<string, Document[]>;
  };
  error?: string;
}

const documentTypeLabels = {
  LAB_RESULT: 'Resultados de Laboratorio',
  IMAGING: 'Im�genes M�dicas',
  PRESCRIPTION: 'Recetas',
  INSURANCE: 'Seguros',
  CONSENT: 'Consentimientos',
  OTHER: 'Otros',
};

const documentTypeIcons = {
  LAB_RESULT: '>�',
  IMAGING: '=,',
  PRESCRIPTION: '=�',
  INSURANCE: '<�',
  CONSENT: '=�',
  OTHER: '=�',
};

const documentTypeColors = {
  LAB_RESULT: 'bg-blue-100 text-blue-700 border-blue-200',
  IMAGING: 'bg-purple-100 text-purple-700 border-purple-200',
  PRESCRIPTION: 'bg-pink-100 text-pink-700 border-pink-200',
  INSURANCE: 'bg-green-100 text-green-700 border-green-200',
  CONSENT: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  OTHER: 'bg-gray-100 text-gray-700 border-gray-200',
};

export default function DocumentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentsByType, setDocumentsByType] = useState<Record<string, Document[]>>({});
  const [summary, setSummary] = useState<{ total: number; totalSizeMB: string; byType: Record<string, number> }>({
    total: 0,
    totalSizeMB: '0',
    byType: {} as Record<string, number>
  });
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/portal/documents');
      const data: DocumentsResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar documentos');
      }

      if (data.success && data.data) {
        setDocuments(data.data.documents);
        setDocumentsByType(data.data.documentsByType);
        setSummary(data.data.summary);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      // In production, this would download from storageUrl
      // For now, we'll show an alert
      alert(`Descargando: ${doc.fileName}`);

      // Actual download logic:
      // const response = await fetch(doc.storageUrl);
      // const blob = await response.blob();
      // const url = window.URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = doc.fileName;
      // document.body.appendChild(a);
      // a.click();
      // window.URL.revokeObjectURL(url);
      // document.body.removeChild(a);
    } catch (err) {
      alert('Error al descargar documento');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFilteredDocuments = () => {
    let filtered = selectedType
      ? documentsByType[selectedType] || []
      : documents;

    if (searchQuery) {
      filtered = filtered.filter(doc =>
        doc.fileName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredDocuments = getFilteredDocuments();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/portal/dashboard')}
            className="flex items-center text-gray-600 hover:text-blue-600 mb-4 transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5 mr-1" />
            Volver al Dashboard
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                📁 Mis Documentos
              </h1>
              <p className="text-gray-600">
                {summary.total} documento{summary.total !== 1 ? 's' : ''} · {summary.totalSizeMB} MB en total
              </p>
            </div>

            <button
              onClick={() => router.push('/portal/dashboard/documents/upload')}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              <PlusIcon className="h-5 w-5" />
              Subir Documento
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-6">
            <p className="text-red-800 mb-4">{error}</p>
            <button
              onClick={fetchDocuments}
              className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar documentos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Type Filter */}
            <select
              value={selectedType || ''}
              onChange={(e) => setSelectedType(e.target.value || null)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los tipos</option>
              {Object.entries(documentTypeLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {documentTypeIcons[key as keyof typeof documentTypeIcons]} {label}
                  {summary.byType[key] ? ` (${summary.byType[key]})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Document Type Cards */}
        {!selectedType && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {Object.entries(documentTypeLabels).map(([key, label]) => {
              const count = summary.byType[key] || 0;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedType(key)}
                  className={`p-4 rounded-xl border-2 transition-all hover:shadow-md ${documentTypeColors[key as keyof typeof documentTypeColors]}`}
                >
                  <div className="text-3xl mb-2">
                    {documentTypeIcons[key as keyof typeof documentTypeIcons]}
                  </div>
                  <div className="text-sm font-medium mb-1">{label}</div>
                  <div className="text-xs opacity-75">{count} documento{count !== 1 ? 's' : ''}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Documents List */}
        {filteredDocuments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FolderIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay documentos
            </h3>
            <p className="text-gray-600">
              {searchQuery || selectedType
                ? 'No se encontraron documentos con los filtros aplicados'
                : 'Tus documentos m�dicos aparecer�n aqu�'}
            </p>
            {(searchQuery || selectedType) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedType(null);
                }}
                className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all"
              >
                {/* Type Badge */}
                <div className="mb-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${documentTypeColors[doc.documentType]}`}>
                    {documentTypeIcons[doc.documentType]} {documentTypeLabels[doc.documentType]}
                  </span>
                </div>

                {/* File Icon and Name */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <DocumentTextIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate mb-1">
                      {doc.fileName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {formatFileSize(doc.fileSize)}
                    </p>
                  </div>
                </div>

                {/* Date */}
                <p className="text-sm text-gray-500 mb-4">
                  {format(new Date(doc.createdAt), "d 'de' MMMM, yyyy", {
                    locale: es,
                  })}
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <EyeIcon className="h-4 w-4" />
                    Ver
                  </button>
                  <button
                    onClick={() => handleDownload(doc)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    Descargar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Preview Modal */}
        {previewDoc && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  Vista Previa
                </h3>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Nombre del archivo</label>
                  <p className="text-gray-900">{previewDoc.fileName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Tipo</label>
                  <p className="text-gray-900">
                    {documentTypeIcons[previewDoc.documentType]} {documentTypeLabels[previewDoc.documentType]}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Tama�o</label>
                  <p className="text-gray-900">{formatFileSize(previewDoc.fileSize)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Fecha</label>
                  <p className="text-gray-900">
                    {format(new Date(previewDoc.createdAt), "d 'de' MMMM, yyyy 'a las' HH:mm", {
                      locale: es,
                    })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Hash del documento</label>
                  <p className="text-xs text-gray-600 font-mono break-all">
                    {previewDoc.documentHash}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleDownload(previewDoc)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                    Descargar Documento
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
