'use client';

import React, { useState, useCallback } from 'react';
import { Upload, FileText, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface CredentialUploadProps {
  onUploadComplete: (file: File, credentialData: any) => void;
  onCancel: () => void;
}

export const CredentialUpload: React.FC<CredentialUploadProps> = ({
  onUploadComplete,
  onCancel,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles[0]) {
      handleFileSelect(droppedFiles[0]);
    }
  }, []);

  // Handle file selection
  const handleFileSelect = (selectedFile: File) => {
    setError(null);

    // Validate file type (accept images and PDFs)
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Invalid file type. Please upload an image (JPG, PNG, WEBP) or PDF.');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (selectedFile.size > maxSize) {
      setError('File size exceeds 10MB limit.');
      return;
    }

    setFile(selectedFile);
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles[0]) {
      handleFileSelect(selectedFiles[0]);
    }
  };

  // Remove selected file
  const handleRemoveFile = () => {
    setFile(null);
    setError(null);
  };

  // Handle upload
  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // In production, upload to cloud storage (R2, S3, etc.)
      // For now, create a mock URL
      const mockUrl = URL.createObjectURL(file);

      // Simulate OCR extraction (in production, use OCR service)
      const mockOcrData = {
        extractedText: 'Mock OCR data from ' + file.name,
        confidence: 0.85,
      };

      // Call parent handler
      onUploadComplete(file, {
        documentUrl: mockUrl,
        ocrData: mockOcrData,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Credential Document</h3>

      {!file ? (
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-green-500 bg-green-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="credential-file-input"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
            onChange={handleFileInputChange}
          />

          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />

          <p className="text-sm font-medium text-gray-900 mb-1">
            Drop your credential document here, or click to browse
          </p>
          {/* Decorative - low contrast intentional for file format helper text */}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Supports: JPG, PNG, WEBP, PDF (max 10MB)
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* File preview */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                {/* Decorative - low contrast intentional for file size metadata */}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            {!uploading && (
              <button
                onClick={handleRemoveFile}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {uploading ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  Uploading...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 inline mr-2" />
                  Upload Document
                </>
              )}
            </button>
            <button
              onClick={onCancel}
              disabled={uploading}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-4 flex items-start space-x-2 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Info message */}
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          <strong>Tip:</strong> Make sure the document is clear and all text is readable. This
          helps with automatic verification and reduces manual review time.
        </p>
      </div>
    </div>
  );
};
