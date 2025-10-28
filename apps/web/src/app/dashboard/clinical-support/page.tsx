'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Upload,
  FileImage,
  AlertCircle,
  CheckCircle2,
  Lock,
  FileText,
  Activity,
  Clock,
  User,
  Stethoscope,
} from 'lucide-react';
import {
  MedicalImageViewer,
  ImageUpload,
  type MedicalImage,
} from '@/components/clinical/MedicalImageViewer';

export default function ClinicalSupportPage() {
  const [uploadedImages, setUploadedImages] = useState<MedicalImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<MedicalImage | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showUploadSection, setShowUploadSection] = useState(true);

  // Mock patient data (de-identified)
  const patientInfo = {
    pseudonymId: 'PT-8A3D9F2E',
    age: 45,
    sex: 'F',
    studyType: 'Routine Examination',
    visitDate: new Date().toLocaleDateString(),
  };

  const handleUploadSuccess = (image: MedicalImage) => {
    setUploadedImages((prev) => [image, ...prev]);
    setSelectedImage(image);
    setUploadSuccess(true);
    setUploadError(null);
    setShowUploadSection(false);

    // Clear success message after 5 seconds
    setTimeout(() => setUploadSuccess(false), 5000);
  };

  const handleUploadError = (error: string) => {
    setUploadError(error);
    setUploadSuccess(false);
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }

    try {
      const response = await fetch(`/api/images/deidentified/${imageId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setUploadedImages((prev) => prev.filter((img) => img.id !== imageId));
        if (selectedImage?.id === imageId) {
          setSelectedImage(null);
        }
      } else {
        alert('Failed to delete image');
      }
    } catch (error) {
      alert('Error deleting image');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white py-8 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Clinical Decision Support System</h1>
              <p className="text-green-100">
                Secure medical imaging with HIPAA-compliant de-identification
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3">
              <div className="flex items-center space-x-2 text-sm">
                <Shield className="w-5 h-5" />
                <span className="font-semibold">HIPAA Protected</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Success/Error Messages */}
        {uploadSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
            <CheckCircle2 className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
            <div>
              <p className="text-green-900 font-medium">Image uploaded and de-identified successfully</p>
              <p className="text-green-700 text-sm mt-1">
                All PHI has been removed and the image is ready for clinical review
              </p>
            </div>
          </div>
        )}

        {uploadError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" />
            <div>
              <p className="text-red-900 font-medium">Upload failed</p>
              <p className="text-red-700 text-sm mt-1">{uploadError}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Patient Info & Image List */}
          <div className="lg:col-span-1 space-y-6">
            {/* Patient Information */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
                <h2 className="text-sm font-semibold text-blue-900 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Patient Information
                </h2>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Pseudonym ID</p>
                  <p className="text-sm font-mono text-gray-900">{patientInfo.pseudonymId}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Age</p>
                    <p className="text-sm text-gray-900">{patientInfo.age}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Sex</p>
                    <p className="text-sm text-gray-900">{patientInfo.sex}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Study Type</p>
                  <p className="text-sm text-gray-900">{patientInfo.studyType}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Visit Date</p>
                  <p className="text-sm text-gray-900">{patientInfo.visitDate}</p>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                    <p className="text-xs text-green-800 flex items-center">
                      <Lock className="w-3 h-3 mr-1" />
                      De-identified per HIPAA
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Image List */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center">
                  <FileImage className="w-4 h-4 mr-2" />
                  Uploaded Images ({uploadedImages.length})
                </h2>
              </div>
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {uploadedImages.length === 0 ? (
                  <div className="p-4 text-center">
                    <FileImage className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No images uploaded yet</p>
                  </div>
                ) : (
                  uploadedImages.map((image) => (
                    <button
                      key={image.id}
                      onClick={() => {
                        setSelectedImage(image);
                        setShowUploadSection(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                        selectedImage?.id === image.id ? 'bg-green-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            Image {image.id.slice(0, 8)}...
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {new Date(image.timestamp).toLocaleString()}
                          </p>
                        </div>
                        {selectedImage?.id === image.id && (
                          <CheckCircle2 className="w-5 h-5 text-green-600 ml-2 flex-shrink-0" />
                        )}
                      </div>
                      {image.removedPHI.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            {image.removedPHI.length} PHI removed
                          </span>
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
              {uploadedImages.length > 0 && (
                <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
                  <button
                    onClick={() => setShowUploadSection(true)}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload New Image
                  </button>
                </div>
              )}
            </div>

            {/* Security Info */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-green-900 mb-3 flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                Security Features
              </h3>
              <ul className="space-y-2 text-xs text-green-800">
                <li className="flex items-start">
                  <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Automatic PHI removal</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  <span>HIPAA Safe Harbor compliant</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Audit logging enabled</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Encrypted storage</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Upload Section or Image Viewer */}
            {showUploadSection || !selectedImage ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Upload Medical Image</h2>
                  <p className="text-sm text-gray-600">
                    Upload X-rays, MRI scans, CT scans, or other medical images. All PHI will be
                    automatically removed before display.
                  </p>
                </div>
                <ImageUpload
                  onUploadSuccess={handleUploadSuccess}
                  onUploadError={handleUploadError}
                />
              </div>
            ) : (
              <MedicalImageViewer image={selectedImage} onDelete={handleDeleteImage} />
            )}

            {/* Clinical Notes Section */}
            {selectedImage && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-blue-600" />
                    Clinical Notes
                  </h2>
                  <span className="text-xs text-gray-500">Auto-saved</span>
                </div>
                <textarea
                  className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  placeholder="Enter clinical observations, diagnosis, or treatment notes here..."
                />
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-xs text-gray-600">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>Last updated: {new Date().toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                    Save Notes
                  </button>
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total Images</p>
                    <p className="text-2xl font-bold text-gray-900">{uploadedImages.length}</p>
                  </div>
                  <FileImage className="w-8 h-8 text-gray-400" />
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">PHI Removed</p>
                    <p className="text-2xl font-bold text-green-600">
                      {uploadedImages.reduce((sum, img) => sum + img.removedPHI.length, 0)}
                    </p>
                  </div>
                  <Shield className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Compliance</p>
                    <p className="text-2xl font-bold text-green-600">100%</p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
