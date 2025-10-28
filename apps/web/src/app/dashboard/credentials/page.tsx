'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Shield, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { CredentialCard } from '@/components/credentials/CredentialCard';
import { CredentialForm, CredentialFormData } from '@/components/credentials/CredentialForm';
import { CredentialUpload } from '@/components/credentials/CredentialUpload';

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadedDoc, setUploadedDoc] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Demo user ID (in production, get from session/auth)
  const userId = 'demo-user-id';

  // Fetch credentials
  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/credentials?userId=${userId}`);
      const data = await response.json();

      if (data.success) {
        setCredentials(data.credentials || []);
      } else {
        setError('Failed to load credentials');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load credentials');
    } finally {
      setLoading(false);
    }
  };

  // Handle upload complete
  const handleUploadComplete = (file: File, credentialData: any) => {
    setUploadedDoc(credentialData);
    setShowUpload(false);
    setShowAddForm(true);
  };

  // Handle form submit
  const handleFormSubmit = async (formData: CredentialFormData) => {
    try {
      const response = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ...formData,
          documentUrl: uploadedDoc?.documentUrl,
          ocrData: uploadedDoc?.ocrData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Credential added successfully!');
        setShowAddForm(false);
        setUploadedDoc(null);
        fetchCredentials(); // Refresh list
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(data.error || 'Failed to add credential');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add credential');
    }
  };

  // Handle verify credential
  const handleVerify = async (credentialId: string) => {
    try {
      const response = await fetch(`/api/credentials/${credentialId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoVerify: true }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Verification initiated successfully!');
        fetchCredentials(); // Refresh list
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(data.error || 'Failed to initiate verification');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initiate verification');
    }
  };

  // Calculate stats
  const stats = {
    total: credentials.length,
    verified: credentials.filter((c) => c.verificationStatus === 'VERIFIED' || c.verificationStatus === 'AUTO_VERIFIED').length,
    pending: credentials.filter((c) => c.verificationStatus === 'PENDING' || c.verificationStatus === 'IN_REVIEW').length,
    needsReview: credentials.filter((c) => c.verificationStatus === 'MANUAL_REVIEW').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Credential Verification</h1>
              <p className="text-gray-600 mt-1">
                Manage and verify your professional credentials
              </p>
            </div>
            {!showAddForm && !showUpload && (
              <button
                onClick={() => setShowUpload(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Credential
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Credentials</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
                </div>
                <Shield className="w-8 h-8 text-gray-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Verified</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{stats.verified}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Needs Review</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">{stats.needsReview}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
            <CheckCircle2 className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Add Credential Flow */}
        {showUpload && (
          <div className="mb-8">
            <CredentialUpload
              onUploadComplete={handleUploadComplete}
              onCancel={() => {
                setShowUpload(false);
                setUploadedDoc(null);
              }}
            />
          </div>
        )}

        {showAddForm && (
          <div className="mb-8">
            <CredentialForm
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setShowAddForm(false);
                setUploadedDoc(null);
              }}
              documentUrl={uploadedDoc?.documentUrl}
              ocrData={uploadedDoc?.ocrData}
            />
          </div>
        )}

        {/* Credentials List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <p className="text-gray-600 mt-4">Loading credentials...</p>
          </div>
        ) : credentials.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No credentials yet</h3>
            <p className="text-gray-600 mb-6">
              Start by adding your professional credentials for verification
            </p>
            <button
              onClick={() => setShowUpload(true)}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors inline-flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Credential
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {credentials.map((credential) => (
              <CredentialCard
                key={credential.id}
                credential={credential}
                onView={(id) => {
                  // TODO: Implement credential detail view
                  console.log('View credential:', id);
                }}
                onVerify={handleVerify}
              />
            ))}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-base font-semibold text-blue-900 mb-2">
            Why verify your credentials?
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start">
              <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
              <span>Build trust with patients and healthcare organizations</span>
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
              <span>Required for regulatory compliance (HIPAA, state licensing)</span>
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
              <span>Automatic verification with state and national databases</span>
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
              <span>Display verified badges on your profile</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
