/**
 * File Uploader Component
 *
 * Beautiful drag-and-drop file upload with progress
 */

'use client';

import { useState, useRef, DragEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FileUploaderProps {
  onUploadComplete: (result: UploadResult) => void;
  folder?: string;
  accept?: string;
  maxSize?: number; // in MB
  metadata?: Record<string, string>;
}

interface UploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

export default function FileUploader({
  onUploadComplete,
  folder = 'documents',
  accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx',
  maxSize = 50,
  metadata = {},
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    setError(null);
    setProgress(0);

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`Archivo demasiado grande (máximo ${maxSize}MB)`);
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      formData.append('metadata', JSON.stringify(metadata));

      // Simulate progress (since we can't track actual upload progress easily)
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al subir archivo');
      }

      setProgress(100);
      setTimeout(() => {
        onUploadComplete(data.data);
        setUploading(false);
        setProgress(0);
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir archivo');
      setUploading(false);
      setProgress(0);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  if (uploading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Subiendo archivo...</h3>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2 overflow-hidden">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
            />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{progress}%</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        accept={accept}
        className="hidden"
      />

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4"
        >
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </motion.div>
      )}

      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileSelect}
        whileHover={{ scale: 1.01 }}
        className={`relative bg-white rounded-2xl shadow-xl border-2 border-dashed p-12 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
      >
        <div className="flex flex-col items-center">
          {/* Icon */}
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all ${
              isDragging
                ? 'bg-blue-100'
                : 'bg-gradient-to-br from-blue-100 to-blue-200'
            }`}
          >
            <svg
              className={`w-10 h-10 transition-colors ${
                isDragging ? 'text-blue-600' : 'text-blue-500'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          {/* Text */}
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {isDragging ? 'Suelta el archivo aquí' : 'Arrastra y suelta tu archivo'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">o haz clic para seleccionar</p>

          {/* Decorative - low contrast intentional for helper text */}
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>Tipos permitidos: PDF, Imágenes, Word</p>
            <p>Tamaño máximo: {maxSize}MB</p>
          </div>
        </div>

        {/* Drag overlay */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-blue-500 bg-opacity-10 rounded-2xl pointer-events-none"
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
