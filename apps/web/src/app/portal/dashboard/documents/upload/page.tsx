'use client';
export const dynamic = 'force-dynamic';


/**
 * Document Upload Page
 * Upload medical documents with drag-and-drop support
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeftIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  XMarkIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

type DocumentType = 'LAB_RESULT' | 'IMAGING' | 'PRESCRIPTION' | 'INSURANCE' | 'CONSENT' | 'OTHER';

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

const documentTypeLabels: Record<DocumentType, string> = {
  LAB_RESULT: 'Resultados de Laboratorio',
  IMAGING: 'Imágenes Médicas',
  PRESCRIPTION: 'Recetas',
  INSURANCE: 'Seguros',
  CONSENT: 'Consentimientos',
  OTHER: 'Otros',
};

export default function DocumentUploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [documentType, setDocumentType] = useState<DocumentType>('OTHER');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (fileList: File[]) => {
    const newFiles: UploadFile[] = fileList.map(file => ({
      file,
      id: Math.random().toString(36).substring(7),
      progress: 0,
      status: 'pending',
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadFile = async (uploadFile: UploadFile) => {
    const formData = new FormData();
    formData.append('file', uploadFile.file);
    formData.append('documentType', documentType);

    try {
      // Update status to uploading
      setFiles(prev =>
        prev.map(f => (f.id === uploadFile.id ? { ...f, status: 'uploading' } : f))
      );

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setFiles(prev =>
            prev.map(f => (f.id === uploadFile.id ? { ...f, progress } : f))
          );
        }
      });

      // Handle completion
      await new Promise((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response);
          } else {
            reject(new Error(xhr.statusText));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

        xhr.open('POST', '/api/portal/documents/upload');
        xhr.send(formData);
      });

      // Mark as success
      setFiles(prev =>
        prev.map(f =>
          f.id === uploadFile.id ? { ...f, status: 'success', progress: 100 } : f
        )
      );
    } catch (error) {
      console.error('Upload error:', error);
      setFiles(prev =>
        prev.map(f =>
          f.id === uploadFile.id
            ? { ...f, status: 'error', error: 'Error al subir archivo' }
            : f
        )
      );
    }
  };

  const handleUploadAll = async () => {
    setUploading(true);
    const pendingFiles = files.filter(f => f.status === 'pending');

    for (const file of pendingFiles) {
      await uploadFile(file);
    }

    setUploading(false);

    // If all successful, show success message and redirect
    const allSuccess = files.every(f => f.status === 'success');
    if (allSuccess) {
      setTimeout(() => {
        router.push('/portal/dashboard/documents');
      }, 1500);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canUpload = files.length > 0 && files.some(f => f.status === 'pending');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/portal/dashboard/documents')}
            className="flex items-center text-gray-600 hover:text-blue-600 mb-4 transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5 mr-1" />
            Volver a Documentos
          </button>

          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Subir Documentos
          </h1>
          <p className="text-gray-600">
            Carga documentos médicos, resultados de laboratorio, o recetas
          </p>
        </div>

        {/* Document Type Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Documento
          </label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {Object.entries(documentTypeLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`bg-white rounded-xl border-2 border-dashed p-12 text-center transition-all ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400'
          }`}
        >
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CloudArrowUpIcon className="h-10 w-10 text-blue-600" />
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Arrastra archivos aquí
          </h3>
          <p className="text-gray-600 mb-4">
            o haz clic para seleccionar archivos
          </p>

          <input
            type="file"
            id="file-upload"
            multiple
            onChange={handleChange}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            className="hidden"
          />
          <label
            htmlFor="file-upload"
            className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all cursor-pointer"
          >
            Seleccionar Archivos
          </label>

          <p className="text-xs text-gray-500 mt-4">
            Formatos soportados: PDF, JPG, PNG, DOC, DOCX (máx. 10MB por archivo)
          </p>
        </div>

        {/* Files List */}
        {files.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Archivos Seleccionados ({files.length})
            </h3>

            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg"
                >
                  {/* Icon */}
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <DocumentTextIcon className="h-6 w-6 text-blue-600" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {file.file.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(file.file.size)}
                    </p>

                    {/* Progress Bar */}
                    {file.status === 'uploading' && (
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    )}

                    {file.status === 'error' && (
                      <p className="text-sm text-red-600 mt-1">{file.error}</p>
                    )}
                  </div>

                  {/* Status/Actions */}
                  {file.status === 'pending' && (
                    <button
                      onClick={() => removeFile(file.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  )}

                  {file.status === 'uploading' && (
                    <div className="text-sm text-blue-600 font-medium">
                      {file.progress}%
                    </div>
                  )}

                  {file.status === 'success' && (
                    <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  )}

                  {file.status === 'error' && (
                    <button
                      onClick={() => uploadFile(file)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Reintentar
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Upload Button */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleUploadAll}
                disabled={!canUpload || uploading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                {uploading ? 'Subiendo...' : `Subir ${files.filter(f => f.status === 'pending').length} Archivo(s)`}
              </button>
              <button
                onClick={() => setFiles([])}
                disabled={uploading}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Limpiar Todo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
