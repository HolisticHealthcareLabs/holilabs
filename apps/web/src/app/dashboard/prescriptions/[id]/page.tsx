'use client';

/**
 * Prescription Detail View
 * View full prescription details, sign, send to pharmacy
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ElectronicSignature, {
  SignatureMethod,
} from '@/components/prescriptions/ElectronicSignature';

export const dynamic = 'force-dynamic';

interface Prescription {
  id: string;
  patientId: string;
  medications: any[];
  diagnosis: string;
  instructions: string;
  status: 'PENDING' | 'SIGNED' | 'SENT' | 'FILLED' | 'CANCELLED';
  signedAt: string;
  createdAt: string;
  updatedAt: string;
  sentToPharmacy: boolean;
  pharmacyId: string | null;
  prescriptionHash: string;
  signatureMethod: string | null;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    tokenId: string;
    dateOfBirth: string;
  };
  clinician: {
    id: string;
    firstName: string;
    lastName: string;
    licenseNumber: string;
    email: string;
  };
}

export default function PrescriptionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const prescriptionId = (params?.id as string) || '';

  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [isSigningOrSending, setIsSigningOrSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadPrescription();
  }, [prescriptionId]);

  const loadPrescription = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/prescriptions/${prescriptionId}`);
      if (response.ok) {
        const data = await response.json();
        setPrescription(data.data);
      } else {
        setError('Failed to load prescription');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async (method: SignatureMethod, signatureData: string) => {
    try {
      setIsSigningOrSending(true);
      const response = await fetch(`/api/prescriptions/${prescriptionId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureMethod: method, signatureData }),
      });

      if (response.ok) {
        const data = await response.json();
        setPrescription(data.data);
        setShowSignatureModal(false);
        setSuccessMessage('Prescription signed successfully!');
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to sign prescription');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSigningOrSending(false);
    }
  };

  const handleSendToPharmacy = async () => {
    if (!confirm('Send this prescription to pharmacy?')) return;

    try {
      setIsSigningOrSending(true);
      const response = await fetch(`/api/prescriptions/${prescriptionId}/send-to-pharmacy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pharmacyId: 'default-pharmacy' }), // TODO: Let user select pharmacy
      });

      if (response.ok) {
        const data = await response.json();
        setPrescription(data.data);
        setSuccessMessage('Prescription sent to pharmacy successfully!');
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to send to pharmacy');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSigningOrSending(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: {
        className: 'bg-yellow-100 text-yellow-700',
        label: 'Pending Signature',
        icon: '⏳',
      },
      SIGNED: {
        className: 'bg-green-100 text-green-700',
        label: 'Signed',
        icon: '✓',
      },
      SENT: {
        className: 'bg-blue-100 text-blue-700',
        label: 'Sent to Pharmacy',
        icon: '📤',
      },
      FILLED: {
        className: 'bg-purple-100 text-purple-700',
        label: 'Filled',
        icon: '✓',
      },
      CANCELLED: {
        className: 'bg-gray-100 text-gray-700',
        label: 'Cancelled',
        icon: '✕',
      },
    };
    const badge = badges[status as keyof typeof badges] || badges.PENDING;
    return (
      <span className={`px-4 py-2 rounded-full text-sm font-semibold ${badge.className}`}>
        {badge.icon} {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading prescription...</p>
        </div>
      </div>
    );
  }

  if (error || !prescription) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-2xl mx-auto bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-red-900 dark:text-red-300 mb-2">
            Error Loading Prescription
          </h2>
          <p className="text-red-700 dark:text-red-400 mb-4">
            {error || 'Prescription not found'}
          </p>
          <Link
            href="/dashboard/prescriptions"
            className="inline-block px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition"
          >
            Back to Prescriptions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-8">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-6">
        <Link
          href="/dashboard/prescriptions"
          className="text-primary-600 hover:text-primary-700 font-medium mb-4 inline-flex items-center"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Prescriptions
        </Link>
        <div className="flex items-start justify-between mt-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Prescription Details
            </h1>
            <p className="text-gray-600 dark:text-gray-400">ID: {prescription.id}</p>
          </div>
          {getStatusBadge(prescription.status)}
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="max-w-5xl mx-auto mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded-xl p-4 flex items-center">
          <svg
            className="w-6 h-6 text-green-600 mr-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <p className="text-green-800 dark:text-green-300 font-medium">{successMessage}</p>
        </div>
      )}

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <svg
                className="w-6 h-6 mr-2"
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
              Patient Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {prescription.patient.firstName} {prescription.patient.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Date of Birth</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {new Date(prescription.patient.dateOfBirth).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Patient Token</p>
                <p className="font-semibold text-gray-900 dark:text-white font-mono">
                  {prescription.patient.tokenId}
                </p>
              </div>
            </div>
          </div>

          {/* Diagnosis */}
          {prescription.diagnosis && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Diagnosis
              </h2>
              <p className="text-gray-900 dark:text-white">{prescription.diagnosis}</p>
            </div>
          )}

          {/* Medications */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Medications ({prescription.medications.length})
            </h2>
            <div className="space-y-4">
              {prescription.medications.map((med: any, index: number) => (
                <div
                  key={index}
                  className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700/50"
                >
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2">
                    {med.name}
                  </h3>
                  {med.genericName && med.genericName !== med.name && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Generic: {med.genericName}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Dose:</span>{' '}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {med.dose}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Frequency:</span>{' '}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {med.frequency}
                      </span>
                    </div>
                    {med.route && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Route:</span>{' '}
                        <span className="font-medium text-gray-900 dark:text-white">
                          {med.route}
                        </span>
                      </div>
                    )}
                  </div>
                  {med.instructions && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 pt-2 border-t border-blue-200 dark:border-blue-700/50">
                      <strong>Instructions:</strong> {med.instructions}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Additional Instructions */}
          {prescription.instructions && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Additional Instructions
              </h2>
              <p className="text-gray-900 dark:text-white">{prescription.instructions}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Actions</h2>
            <div className="space-y-3">
              {prescription.status === 'PENDING' && (
                <button
                  onClick={() => setShowSignatureModal(true)}
                  disabled={isSigningOrSending}
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                  Sign Prescription
                </button>
              )}
              {prescription.status === 'SIGNED' && !prescription.sentToPharmacy && (
                <button
                  onClick={handleSendToPharmacy}
                  disabled={isSigningOrSending}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                  Send to Pharmacy
                </button>
              )}
              <button
                onClick={handlePrint}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2"
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
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                Print
              </button>
            </div>
          </div>

          {/* Prescriber Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Prescriber
            </h2>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  Dr. {prescription.clinician.firstName} {prescription.clinician.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">License Number</p>
                <p className="font-semibold text-gray-900 dark:text-white font-mono">
                  {prescription.clinician.licenseNumber}
                </p>
              </div>
              {prescription.signatureMethod && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Signature Method</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {prescription.signatureMethod === 'pin' ? 'PIN Entry' : 'Signature Pad'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Blockchain Verification */}
          {prescription.prescriptionHash && (
            <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-200 dark:border-primary-700/50 p-6">
              <h2 className="text-lg font-bold text-primary-900 dark:text-primary-300 mb-2 flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                Blockchain Verified
              </h2>
              <p className="text-xs text-primary-700 dark:text-primary-400 mb-2">
                This prescription is tamper-proof and verified on the blockchain.
              </p>
              <p className="text-xs font-mono text-primary-900 dark:text-primary-300 break-all bg-white dark:bg-primary-900/20 p-2 rounded">
                {prescription.prescriptionHash}
              </p>
            </div>
          )}

          {/* Timestamps */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Timeline</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-gray-400 rounded-full mt-1.5 mr-3"></div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Created</p>
                  <p className="text-gray-600 dark:text-gray-400">
                    {formatDate(prescription.createdAt)}
                  </p>
                </div>
              </div>
              {prescription.signedAt && (
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 mr-3"></div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Signed</p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {formatDate(prescription.signedAt)}
                    </p>
                  </div>
                </div>
              )}
              {prescription.sentToPharmacy && (
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 mr-3"></div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Sent to Pharmacy
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {formatDate(prescription.updatedAt)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Electronic Signature Modal */}
      {showSignatureModal && (
        <ElectronicSignature
          onSign={handleSign}
          onCancel={() => setShowSignatureModal(false)}
          isSubmitting={isSigningOrSending}
        />
      )}
    </div>
  );
}
