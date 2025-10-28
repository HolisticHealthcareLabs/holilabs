'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Shield,
  CheckCircle2,
  AlertCircle,
  Download,
  Trash2,
  Info,
  Lock,
} from 'lucide-react';

export interface MedicalImage {
  id: string;
  pseudonymizedId: string;
  imageUrl: string;
  originalHash: string;
  removedPHI: string[];
  timestamp: string;
  auditLogId: string;
  metadata?: {
    uploadDate?: string;
    fileSize?: number;
    modality?: string;
  };
}

interface MedicalImageViewerProps {
  image: MedicalImage;
  onDelete?: (imageId: string) => void;
}

export function MedicalImageViewer({ image, onDelete }: MedicalImageViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [showMetadata, setShowMetadata] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom controls
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 400));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 25));
  const handleResetZoom = () => setZoom(100);

  // Rotation control
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  // Fullscreen toggle
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Download image
  const handleDownload = async () => {
    try {
      const response = await fetch(image.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `deidentified-${image.pseudonymizedId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header with HIPAA badge */}
      <div className="bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-green-600 rounded-full p-2">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">De-identified Medical Image</h3>
              <p className="text-xs text-gray-600">
                HIPAA Compliant • {image.removedPHI.length} PHI identifiers removed
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium flex items-center">
              <Lock className="w-3 h-3 mr-1" />
              Protected
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-white rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={handleZoomOut}
              className="px-3 py-2 hover:bg-gray-100 transition-colors border-r border-gray-300"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4 text-gray-700" />
            </button>
            <button
              onClick={handleResetZoom}
              className="px-4 py-2 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700 border-r border-gray-300"
              title="Reset Zoom"
            >
              {zoom}%
            </button>
            <button
              onClick={handleZoomIn}
              className="px-3 py-2 hover:bg-gray-100 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4 text-gray-700" />
            </button>
          </div>

          {/* Rotation */}
          <button
            onClick={handleRotate}
            className="p-2 bg-white rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
            title="Rotate 90°"
          >
            <RotateCw className="w-4 h-4 text-gray-700" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={handleToggleFullscreen}
            className="p-2 bg-white rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4 text-gray-700" />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {/* Metadata toggle */}
          <button
            onClick={() => setShowMetadata(!showMetadata)}
            className={`p-2 rounded-lg border transition-colors ${
              showMetadata
                ? 'bg-blue-50 border-blue-300 text-blue-600'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
            title="Toggle Metadata"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="p-2 bg-white rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
            title="Download Image"
          >
            <Download className="w-4 h-4 text-gray-700" />
          </button>

          {/* Delete */}
          {onDelete && (
            <button
              onClick={() => onDelete(image.id)}
              className="p-2 bg-white rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
              title="Delete Image"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Image viewer */}
      <div
        ref={containerRef}
        className="relative bg-gray-900 overflow-hidden"
        style={{ minHeight: '500px' }}
      >
        <div className="flex items-center justify-center h-full p-8">
          <img
            ref={imageRef}
            src={image.imageUrl}
            alt="De-identified medical image"
            className="max-w-full max-h-full object-contain transition-transform duration-200"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            }}
          />
        </div>

        {/* Security watermark */}
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-xs font-medium">
          <div className="flex items-center space-x-2">
            <Lock className="w-3 h-3" />
            <span>DE-IDENTIFIED</span>
          </div>
        </div>
      </div>

      {/* Metadata panel */}
      {showMetadata && (
        <div className="bg-gray-50 border-t border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
            <Info className="w-4 h-4 mr-2 text-blue-600" />
            Image Metadata
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">Pseudonymized ID</p>
              <p className="text-sm font-mono text-gray-900 break-all">
                {image.pseudonymizedId}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Upload Date</p>
              <p className="text-sm text-gray-900">
                {new Date(image.timestamp).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Original Hash (SHA-256)</p>
              <p className="text-sm font-mono text-gray-900 break-all truncate">
                {image.originalHash}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Audit Log ID</p>
              <p className="text-sm font-mono text-gray-900 break-all truncate">
                {image.auditLogId}
              </p>
            </div>
            {image.metadata?.modality && (
              <div>
                <p className="text-xs text-gray-600 mb-1">Modality</p>
                <p className="text-sm text-gray-900">{image.metadata.modality}</p>
              </div>
            )}
            {image.metadata?.fileSize && (
              <div>
                <p className="text-xs text-gray-600 mb-1">File Size</p>
                <p className="text-sm text-gray-900">
                  {(image.metadata.fileSize / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}
          </div>

          {/* PHI Removed */}
          {image.removedPHI.length > 0 && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-green-900 mb-2 flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Protected Health Information Removed ({image.removedPHI.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {image.removedPHI.slice(0, 10).map((phi, idx) => (
                  <span
                    key={idx}
                    className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded"
                  >
                    {phi}
                  </span>
                ))}
                {image.removedPHI.length > 10 && (
                  <span className="text-xs text-green-700">
                    +{image.removedPHI.length - 10} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Security footer */}
      <div className="bg-green-50 border-t border-green-200 px-4 py-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-4 text-green-800">
            <div className="flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              <span>HIPAA Compliant</span>
            </div>
            <div className="flex items-center">
              <Shield className="w-4 h-4 mr-1" />
              <span>Audit Logged</span>
            </div>
            <div className="flex items-center">
              <Lock className="w-4 h-4 mr-1" />
              <span>Encrypted Storage</span>
            </div>
          </div>
          <span className="text-gray-600">Image ID: {image.id}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Image Upload Component
 */
interface ImageUploadProps {
  onUploadSuccess: (image: MedicalImage) => void;
  onUploadError: (error: string) => void;
}

export function ImageUpload({ onUploadSuccess, onUploadError }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      // Add optional metadata
      formData.append('patientId', 'DEMO-PATIENT-001'); // In production, get from form

      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        onUploadSuccess({
          id: result.data.pseudonymizedId,
          pseudonymizedId: result.data.pseudonymizedId,
          imageUrl: result.data.imageUrl,
          originalHash: result.data.originalHash,
          removedPHI: result.data.removedPHI,
          timestamp: result.data.timestamp,
          auditLogId: result.data.auditLogId,
        });
      } else {
        onUploadError(result.error || 'Upload failed');
      }
    } catch (error: any) {
      onUploadError(error.message || 'Network error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        dragActive
          ? 'border-green-500 bg-green-50'
          : 'border-gray-300 bg-gray-50 hover:border-green-400 hover:bg-green-50'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/png,image/jpeg,image/jpg,application/dicom"
        onChange={handleFileSelect}
        disabled={uploading}
      />

      {uploading ? (
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-gray-700 font-medium">Processing and de-identifying image...</p>
          <p className="text-sm text-gray-600 mt-2">This may take a few seconds</p>
        </div>
      ) : (
        <>
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Upload Medical Image
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Drag and drop or click to select<br />
            Supports PNG, JPEG, DICOM files
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Select Image
          </button>
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 inline-block">
            <p className="text-xs text-green-800 flex items-center">
              <Lock className="w-3 h-3 mr-1" />
              Automatic HIPAA de-identification applied
            </p>
          </div>
        </>
      )}
    </div>
  );
}
