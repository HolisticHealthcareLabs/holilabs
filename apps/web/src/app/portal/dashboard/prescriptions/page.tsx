'use client';

/**
 * Patient Prescription Portal
 * Patients can view their prescriptions, track status, and download
 */

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

interface Prescription {
  id: string;
  medications: any[];
  diagnosis: string;
  instructions: string;
  status: 'PENDING' | 'SIGNED' | 'SENT' | 'FILLED' | 'CANCELLED';
  signedAt: string;
  createdAt: string;
  sentToPharmacy: boolean;
  pharmacyId: string | null;
  prescriptionHash: string;
  clinician: {
    id: string;
    firstName: string;
    lastName: string;
    licenseNumber: string;
  };
}

export default function PatientPrescriptionsPage() {
  const [patientId, setPatientId] = useState<string | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'history'>('active');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user?.email) {
        // Get patient record for this user
        try {
          const response = await fetch(`/api/patients?email=${encodeURIComponent(user.email)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.data && data.data.length > 0) {
              const patient = data.data[0];
              setPatientId(patient.id);
              loadPrescriptions(patient.id);
            } else {
              setError('No patient record found');
              setLoading(false);
            }
          } else {
            setError('Failed to load patient data');
            setLoading(false);
          }
        } catch (err: any) {
          setError(err.message);
          setLoading(false);
        }
      }
    });
  }, []);

  const loadPrescriptions = async (patientId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/prescriptions?patientId=${patientId}`);
      if (response.ok) {
        const data = await response.json();
        setPrescriptions(data.data || []);
      } else {
        setError('Failed to load prescriptions');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusInfo = (status: string, sentToPharmacy: boolean) => {
    if (status === 'FILLED') {
      return {
        label: 'Ready for Pickup',
        icon: '✓',
        color: 'text-green-700 bg-green-50 dark:bg-green-900/20',
        description: 'Your prescription has been filled and is ready to pick up',
      };
    } else if (status === 'SENT' || sentToPharmacy) {
      return {
        label: 'Sent to Pharmacy',
        icon: '📤',
        color: 'text-blue-700 bg-blue-50 dark:bg-blue-900/20',
        description: 'Your prescription has been sent to the pharmacy',
      };
    } else if (status === 'SIGNED') {
      return {
        label: 'Approved',
        icon: '✓',
        color: 'text-green-700 bg-green-50 dark:bg-green-900/20',
        description: 'Your prescription has been signed by your doctor',
      };
    } else if (status === 'PENDING') {
      return {
        label: 'Pending',
        icon: '⏳',
        color: 'text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20',
        description: 'Waiting for doctor signature',
      };
    } else {
      return {
        label: 'Cancelled',
        icon: '✕',
        color: 'text-gray-700 bg-gray-50 dark:bg-gray-900/20',
        description: 'This prescription was cancelled',
      };
    }
  };

  const filteredPrescriptions = prescriptions.filter((prescription) => {
    if (activeFilter === 'active') {
      return ['SIGNED', 'SENT', 'PENDING'].includes(prescription.status);
    } else if (activeFilter === 'history') {
      return ['FILLED', 'CANCELLED'].includes(prescription.status);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your prescriptions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-2xl mx-auto bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-yellow-900 dark:text-yellow-300 mb-2">
            Unable to Load Prescriptions
          </h2>
          <p className="text-yellow-700 dark:text-yellow-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-8">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          My Prescriptions
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          View and track your prescriptions from your healthcare provider
        </p>
      </div>

      {/* Filters */}
      <div className="max-w-5xl mx-auto mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveFilter('active')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeFilter === 'active'
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setActiveFilter('history')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeFilter === 'history'
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeFilter === 'all'
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Prescriptions List */}
      <div className="max-w-5xl mx-auto">
        {filteredPrescriptions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="text-6xl mb-4">💊</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No prescriptions found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {activeFilter === 'active'
                ? "You don't have any active prescriptions"
                : activeFilter === 'history'
                ? "You don't have any prescription history"
                : "You don't have any prescriptions yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPrescriptions.map((prescription) => {
              const statusInfo = getStatusInfo(prescription.status, prescription.sentToPharmacy);
              return (
                <div
                  key={prescription.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                          Prescription from Dr. {prescription.clinician.firstName}{' '}
                          {prescription.clinician.lastName}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Issued {formatDate(prescription.createdAt)}
                          {prescription.signedAt &&
                            ` • Signed ${formatDate(prescription.signedAt)}`}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                        {statusInfo.icon} {statusInfo.label}
                      </span>
                    </div>

                    {/* Status Description */}
                    <div className={`mb-4 p-3 rounded-lg ${statusInfo.color}`}>
                      <p className="text-sm font-medium">{statusInfo.description}</p>
                    </div>

                    {/* Medications */}
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Your Medications:
                      </h4>
                      <div className="space-y-3">
                        {prescription.medications.map((med: any, index: number) => (
                          <div
                            key={index}
                            className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-bold text-gray-900 dark:text-white text-base mb-1">
                                  {med.name}
                                </p>
                                {med.genericName && med.genericName !== med.name && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    Generic: {med.genericName}
                                  </p>
                                )}
                                <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Dose:</span>{' '}
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      {med.dose}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">How often:</span>{' '}
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      {med.frequency}
                                    </span>
                                  </div>
                                </div>
                                {med.instructions && (
                                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                      <strong>Instructions:</strong> {med.instructions}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Additional Instructions */}
                    {prescription.instructions && (
                      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700/50">
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">
                          Important Information:
                        </p>
                        <p className="text-sm text-blue-800 dark:text-blue-400">
                          {prescription.instructions}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    {prescription.status === 'SENT' && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Your prescription has been sent to the pharmacy. Contact them to confirm when it will be ready.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="max-w-5xl mx-auto mt-8 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700/50 rounded-xl p-6">
        <h3 className="text-lg font-bold text-primary-900 dark:text-primary-300 mb-2 flex items-center">
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
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Need Help?
        </h3>
        <p className="text-primary-800 dark:text-primary-400 mb-3">
          If you have questions about your prescriptions:
        </p>
        <ul className="space-y-1 text-primary-800 dark:text-primary-400 text-sm">
          <li>• Contact your healthcare provider through secure messaging</li>
          <li>• Call the pharmacy if you need to check on pickup times</li>
          <li>• Always follow your doctor's instructions for taking medications</li>
          <li>• Report any side effects to your healthcare provider immediately</li>
        </ul>
      </div>
    </div>
  );
}
