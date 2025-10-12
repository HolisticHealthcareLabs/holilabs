'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';

interface FileUploadZoneProps {
  patientId: string;
  onUploadComplete?: (files: UploadedFile[]) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  maxSizeBytes?: number;
  acceptedFileTypes?: string[];
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  category?: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

const FILE_CATEGORIES = [
  { value: 'lab_results', label: 'Lab Results', icon: '🔬' },
  { value: 'imaging', label: 'Imaging/X-Rays', icon: '🩻' },
  { value: 'prescriptions', label: 'Prescriptions', icon: '💊' },
  { value: 'referrals', label: 'Referrals', icon: '📋' },
  { value: 'insurance', label: 'Insurance', icon: '🏥' },
  { value: 'other', label: 'Other Documents', icon: '📄' },
];

export default function FileUploadZone({
  patientId,
  onUploadComplete,
  onUploadError,
  maxFiles = 10,
  maxSizeBytes = 50 * 1024 * 1024, // 50MB default
  acceptedFileTypes = ['image/*', 'application/pdf', '.doc', '.docx'],
}: FileUploadZoneProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('other');

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      // Validate file count
      if (acceptedFiles.length > maxFiles) {
        onUploadError?.(`Maximum ${maxFiles} files allowed`);
        return;
      }

      // Validate file sizes
      const oversizedFiles = acceptedFiles.filter(file => file.size > maxSizeBytes);
      if (oversizedFiles.length > 0) {
        onUploadError?.(
          `Files must be smaller than ${(maxSizeBytes / 1024 / 1024).toFixed(0)}MB`
        );
        return;
      }

      // Initialize uploading state
      const newUploadingFiles: UploadingFile[] = acceptedFiles.map(file => ({
        file,
        progress: 0,
        status: 'uploading',
      }));

      setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

      // Upload files
      const uploadedFiles: UploadedFile[] = [];

      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];

        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('patientId', patientId);
          formData.append('category', selectedCategory);

          const response = await fetch('/api/upload/patient-document', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Upload failed');
          }

          const result = await response.json();

          // Update progress to 100%
          setUploadingFiles(prev =>
            prev.map((uf, idx) =>
              idx === i ? { ...uf, progress: 100, status: 'success' } : uf
            )
          );

          uploadedFiles.push(result.file);
        } catch (error) {
          // Mark as error
          setUploadingFiles(prev =>
            prev.map((uf, idx) =>
              idx === i
                ? {
                    ...uf,
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Upload failed',
                  }
                : uf
            )
          );

          onUploadError?.(
            `Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      // Call completion callback
      if (uploadedFiles.length > 0) {
        onUploadComplete?.(uploadedFiles);
      }

      // Clear completed uploads after 3 seconds
      setTimeout(() => {
        setUploadingFiles([]);
      }, 3000);
    },
    [patientId, selectedCategory, maxFiles, maxSizeBytes, onUploadComplete, onUploadError]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxFiles,
    maxSize: maxSizeBytes,
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Category Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Document Category
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {FILE_CATEGORIES.map(category => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                selectedCategory === category.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <span className="text-lg">{category.icon}</span>
              <span className="text-sm font-medium">{category.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 bg-white'
        }`}
      >
        <input {...getInputProps()} />

        <div className="text-center">
          <motion.div
            animate={{
              scale: isDragActive ? 1.1 : 1,
              rotate: isDragActive ? 5 : 0,
            }}
            className="mx-auto w-16 h-16 mb-4 flex items-center justify-center"
          >
            <svg
              className="w-16 h-16 text-gray-400"
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
          </motion.div>

          {isDragActive ? (
            <p className="text-lg font-semibold text-blue-600">Drop files here...</p>
          ) : (
            <>
              <p className="text-lg font-semibold text-gray-900 mb-1">
                Drag & drop files here
              </p>
              <p className="text-sm text-gray-500 mb-4">
                or click to browse from your computer
              </p>
              <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
                <span>Max {maxFiles} files</span>
                <span>•</span>
                <span>Up to {(maxSizeBytes / 1024 / 1024).toFixed(0)}MB each</span>
                <span>•</span>
                <span>PDF, Images, Word</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Uploading Files */}
      <AnimatePresence>
        {uploadingFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2"
          >
            {uploadingFiles.map((uploadingFile, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center gap-3">
                  {/* File Icon */}
                  <div className="flex-shrink-0">
                    {uploadingFile.status === 'uploading' && (
                      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    )}
                    {uploadingFile.status === 'success' && (
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-green-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                    {uploadingFile.status === 'error' && (
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-red-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {uploadingFile.file.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-500">
                        {formatFileSize(uploadingFile.file.size)}
                      </p>
                      {uploadingFile.status === 'uploading' && (
                        <p className="text-xs text-blue-600 font-medium">
                          Uploading...
                        </p>
                      )}
                      {uploadingFile.status === 'success' && (
                        <p className="text-xs text-green-600 font-medium">Complete!</p>
                      )}
                      {uploadingFile.status === 'error' && (
                        <p className="text-xs text-red-600 font-medium">
                          {uploadingFile.error || 'Failed'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                {uploadingFile.status === 'uploading' && (
                  <div className="mt-3 w-full bg-gray-200 rounded-full h-1.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadingFile.progress}%` }}
                      className="bg-blue-600 h-1.5 rounded-full"
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
