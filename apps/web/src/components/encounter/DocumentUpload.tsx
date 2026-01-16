/**
 * CDSS V3 - DocumentUpload Component
 *
 * Document upload with progress tracking for sandboxed parsing.
 * Uses useJobStatus hook to poll for parsing progress.
 *
 * Features:
 * - Drag and drop upload
 * - Progress bar during parsing
 * - Error handling
 * - Multiple file support
 * - HIPAA-compliant (files encrypted in transit)
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useDocumentParseStatus } from '@/hooks/useJobStatus';

interface DocumentUploadProps {
  /** Patient ID for document association */
  patientId: string;
  /** Optional encounter ID */
  encounterId?: string;
  /** Callback when document parsing completes */
  onComplete?: (documentId: string) => void;
  /** Callback when document parsing fails */
  onError?: (error: string) => void;
  /** Whether to allow multiple files */
  multiple?: boolean;
  /** Custom class name */
  className?: string;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  jobId?: string;
  documentId?: string;
  error?: string;
  progress: number;
}

// File size formatter
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Allowed file types
const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/tiff',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.doc', '.docx'];

// Upload icon
const UploadIcon = () => (
  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

// Document icon
const DocumentIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

// Check icon
const CheckIcon = () => (
  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// Error icon
const ErrorIcon = () => (
  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// File item component with job status polling
function FileItem({
  file,
  onRemove,
  onComplete,
}: {
  file: UploadedFile;
  onRemove: () => void;
  onComplete?: (documentId: string) => void;
}) {
  const { status, progress, result, error, isComplete, isFailed } = useDocumentParseStatus(
    file.jobId || null,
    {
      onComplete: (res) => {
        const documentId = (res as any)?.documentId;
        if (documentId && onComplete) {
          onComplete(documentId);
        }
      },
    }
  );

  // Determine display status
  const displayStatus = file.status === 'uploading' ? 'uploading' :
    isComplete ? 'completed' :
    isFailed ? 'failed' :
    status === 'active' ? 'processing' :
    file.status;

  const displayProgress = file.status === 'uploading' ? file.progress : progress;
  const displayError = error || file.error;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${
      displayStatus === 'completed' ? 'bg-green-50 dark:bg-green-950/30' :
      displayStatus === 'failed' ? 'bg-red-50 dark:bg-red-950/30' :
      'bg-neutral-50 dark:bg-neutral-900'
    }`}>
      {/* Icon */}
      <div className="flex-shrink-0 text-neutral-400 dark:text-neutral-600">
        <DocumentIcon />
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
            {file.name}
          </span>
          {displayStatus === 'completed' && <CheckIcon />}
          {displayStatus === 'failed' && <ErrorIcon />}
        </div>
        <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-500">
          <span>{formatFileSize(file.size)}</span>
          <span>•</span>
          <span className={
            displayStatus === 'completed' ? 'text-green-600 dark:text-green-400' :
            displayStatus === 'failed' ? 'text-red-600 dark:text-red-400' :
            ''
          }>
            {displayStatus === 'uploading' ? 'Uploading...' :
             displayStatus === 'processing' ? 'Processing...' :
             displayStatus === 'completed' ? 'Complete' :
             displayStatus === 'failed' ? 'Failed' :
             'Queued'}
          </span>
        </div>

        {/* Progress bar */}
        {(displayStatus === 'uploading' || displayStatus === 'processing') && (
          <div className="mt-2 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-1.5">
            <div
              className="bg-primary-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${displayProgress}%` }}
            />
          </div>
        )}

        {/* Error message */}
        {displayError && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {displayError}
          </p>
        )}
      </div>

      {/* Remove button */}
      <Button
        size="sm"
        variant="ghost"
        onClick={onRemove}
        className="flex-shrink-0"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </Button>
    </div>
  );
}

export function DocumentUpload({
  patientId,
  encounterId,
  onComplete,
  onError,
  multiple = true,
  className = '',
}: DocumentUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    const fileId = crypto.randomUUID();

    // Add file to list
    setFiles(prev => [...prev, {
      id: fileId,
      name: file.name,
      size: file.size,
      status: 'uploading',
      progress: 0,
    }]);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patientId', patientId);
      if (encounterId) {
        formData.append('encounterId', encounterId);
      }

      // Upload and enqueue parsing
      const response = await fetch('/api/documents/parse', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      // Update file with job ID
      setFiles(prev => prev.map(f =>
        f.id === fileId
          ? { ...f, status: 'processing' as const, jobId: data.data.jobId, progress: 0 }
          : f
      ));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setFiles(prev => prev.map(f =>
        f.id === fileId
          ? { ...f, status: 'failed' as const, error: errorMessage }
          : f
      ));
      onError?.(errorMessage);
    }
  }, [patientId, encounterId, onError]);

  const handleFiles = useCallback((fileList: FileList | File[]) => {
    const validFiles = Array.from(fileList).filter(file => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        console.warn(`File type ${file.type} not allowed`);
        return false;
      }
      if (file.size > 50 * 1024 * 1024) {
        console.warn(`File ${file.name} exceeds 50MB limit`);
        return false;
      }
      return true;
    });

    validFiles.forEach(uploadFile);
  }, [uploadFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const handleRemoveFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const handleFileComplete = useCallback((fileId: string, documentId: string) => {
    setFiles(prev => prev.map(f =>
      f.id === fileId
        ? { ...f, status: 'completed' as const, documentId }
        : f
    ));
    onComplete?.(documentId);
  }, [onComplete]);

  return (
    <Card variant="outlined" padding="none" className={className}>
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <CardHeader
          title="Pre-Visit Documents"
          subtitle="Upload documents for AI-powered parsing"
        />
      </div>

      <CardContent className="p-4">
        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragOver
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30'
              : 'border-neutral-300 dark:border-neutral-700 hover:border-primary-400 dark:hover:border-primary-600'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple={multiple}
            accept={ALLOWED_EXTENSIONS.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-3 text-neutral-600 dark:text-neutral-400">
            <UploadIcon />
            <div>
              <p className="font-medium">
                Drag and drop files here, or click to browse
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-1">
                Supported: PDF, Images (PNG/JPG/TIFF), Word documents
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-500">
                Maximum file size: 50MB
              </p>
            </div>
          </div>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            {files.map(file => (
              <FileItem
                key={file.id}
                file={file}
                onRemove={() => handleRemoveFile(file.id)}
                onComplete={(documentId) => handleFileComplete(file.id, documentId)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DocumentUpload;
