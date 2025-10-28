'use client';

/**
 * E-Prescriptions Dashboard
 * Provider dashboard for managing prescriptions
 * Features: List, filter, sign, send to pharmacy
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

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
  sentToPharmacy: boolean;
  prescriptionHash: string;
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
  };
}

export default function PrescriptionsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        loadPrescriptions();
      }
    });
  }, []);

  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      const url =
        filterStatus !== 'all'
          ? `/api/prescriptions?status=${filterStatus}`
          : '/api/prescriptions';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setPrescriptions(data.data || []);
      }
    } catch (error) {
      console.error('Error loading prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadPrescriptions();
    }
  }, [filterStatus, user]);

  const filteredPrescriptions = prescriptions.filter((prescription) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const patientName =
      `${prescription.patient.firstName} ${prescription.patient.lastName}`.toLowerCase();
    const medicationNames = prescription.medications
      .map((m: any) => m.name.toLowerCase())
      .join(' ');
    return (
      patientName.includes(searchLower) ||
      medicationNames.includes(searchLower) ||
      prescription.patient.tokenId?.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: {
        className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
        label: 'Pending Signature',
        icon: '⏳',
      },
      SIGNED: {
        className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
        label: 'Signed',
        icon: '✓',
      },
      SENT: {
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
        label: 'Sent to Pharmacy',
        icon: '📤',
      },
      FILLED: {
        className: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
        label: 'Filled',
        icon: '✓',
      },
      CANCELLED: {
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
        label: 'Cancelled',
        icon: '✕',
      },
    };
    const badge = badges[status as keyof typeof badges] || badges.PENDING;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.className}`}>
        {badge.icon} {badge.label}
      </span>
    );
  };

  const handleViewDetails = (prescriptionId: string) => {
    router.push(`/dashboard/prescriptions/${prescriptionId}`);
  };

  const handleNewPrescription = () => {
    // TODO: Navigate to new prescription page with patient selector
    alert('New prescription flow coming soon! Use the existing MedicationPrescription component in patient details for now.');
  };

  const stats = {
    total: prescriptions.length,
    pending: prescriptions.filter((p) => p.status === 'PENDING').length,
    signed: prescriptions.filter((p) => p.status === 'SIGNED').length,
    sent: prescriptions.filter((p) => p.status === 'SENT').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              E-Prescriptions
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage and send prescriptions electronically
            </p>
          </div>
          <button
            onClick={handleNewPrescription}
            className="px-6 py-3 bg-gradient-to-r from-primary-600 to-purple-600 text-white font-semibold rounded-lg hover:from-primary-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Prescription
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-700/50">
            <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-300">
              {stats.pending}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-700/50">
            <p className="text-sm text-green-700 dark:text-green-400 mb-1">Signed</p>
            <p className="text-2xl font-bold text-green-900 dark:text-green-300">
              {stats.signed}
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700/50">
            <p className="text-sm text-blue-700 dark:text-blue-400 mb-1">Sent</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">{stats.sent}</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by patient name, medication, or token..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Prescriptions</option>
              <option value="PENDING">Pending</option>
              <option value="SIGNED">Signed</option>
              <option value="SENT">Sent</option>
              <option value="FILLED">Filled</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Prescriptions List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading prescriptions...</p>
        </div>
      ) : filteredPrescriptions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="text-6xl mb-4">💊</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No prescriptions found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchTerm
              ? 'Try adjusting your search or filters'
              : 'Create your first prescription to get started'}
          </p>
          {!searchTerm && (
            <button
              onClick={handleNewPrescription}
              className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-all"
            >
              Create First Prescription
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPrescriptions.map((prescription) => (
            <div
              key={prescription.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                      {prescription.patient.firstName} {prescription.patient.lastName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Token: {prescription.patient.tokenId} • DOB:{' '}
                      {new Date(prescription.patient.dateOfBirth).toLocaleDateString()}
                    </p>
                  </div>
                  {getStatusBadge(prescription.status)}
                </div>

                {/* Diagnosis */}
                {prescription.diagnosis && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Diagnosis:
                    </p>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {prescription.diagnosis}
                    </p>
                  </div>
                )}

                {/* Medications Summary */}
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Medications ({prescription.medications.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {prescription.medications.map((med: any, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium"
                      >
                        {med.name} {med.dose}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p>
                      Created: {formatDate(prescription.createdAt)}
                      {prescription.signedAt &&
                        ` • Signed: ${formatDate(prescription.signedAt)}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewDetails(prescription.id)}
                      className="px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-all"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Banner */}
      <div className="mt-8 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700/50 rounded-xl p-6">
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
          E-Prescriptions Feature
        </h3>
        <p className="text-primary-800 dark:text-primary-400 mb-3">
          This system provides secure, blockchain-verified electronic prescriptions with:
        </p>
        <ul className="space-y-1 text-primary-800 dark:text-primary-400">
          <li>• Electronic signature support (PIN or signature pad)</li>
          <li>• Tamper-proof prescription hashing</li>
          <li>• Direct pharmacy transmission</li>
          <li>• HIPAA-compliant audit trails</li>
          <li>• Drug interaction checking</li>
        </ul>
      </div>
    </div>
  );
}
