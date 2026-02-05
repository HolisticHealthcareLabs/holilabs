'use client';

/**
 * E-Prescriptions Dashboard
 * Provider dashboard for managing prescriptions
 * Features: List, filter, sign, send to pharmacy, 5-step wizard
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';

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

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  tokenId: string;
}

interface Medication {
  name: string;
  genericName?: string;
  dose: string;
  frequency: string;
  route: string;
  instructions: string;
  duration?: string;
}

interface DrugInteraction {
  medication1: string;
  medication2: string;
  severity: 'severe' | 'moderate' | 'mild';
  description: string;
}

export default function PrescriptionsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [currentMedication, setCurrentMedication] = useState<Medication>({
    name: '',
    dose: '',
    frequency: '',
    route: 'oral',
    instructions: '',
  });
  const [diagnosis, setDiagnosis] = useState('');
  const [instructions, setInstructions] = useState('');
  const [signatureMethod, setSignatureMethod] = useState<'pin' | 'signature'>('pin');
  const [signatureData, setSignatureData] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Medication search
  const [medicationSearch, setMedicationSearch] = useState('');
  const [medicationSuggestions, setMedicationSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Drug interactions
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);

  useEffect(() => {
    if (session?.user?.id) {
      loadPrescriptions();
      loadPatients();
    }
  }, [session]);

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

  const loadPatients = async () => {
    try {
      const response = await fetch('/api/patients?limit=100');
      if (response.ok) {
        const data = await response.json();
        setPatients(data.data || []);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  useEffect(() => {
    if (session?.user) {
      loadPrescriptions();
    }
  }, [filterStatus, session]);

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
    resetWizard();
    setShowWizard(true);
  };

  const resetWizard = () => {
    setWizardStep(1);
    setSelectedPatient(null);
    setMedications([]);
    setCurrentMedication({ name: '', dose: '', frequency: '', route: 'oral', instructions: '' });
    setDiagnosis('');
    setInstructions('');
    setSignatureMethod('pin');
    setSignatureData('');
    setInteractions([]);
  };

  // Common medications database (mock)
  const commonMedications = [
    'Amoxicillin', 'Lisinopril', 'Metformin', 'Atorvastatin', 'Omeprazole',
    'Levothyroxine', 'Amlodipine', 'Metoprolol', 'Albuterol', 'Gabapentin',
    'Hydrochlorothiazide', 'Losartan', 'Sertraline', 'Simvastatin', 'Montelukast',
    'Escitalopram', 'Rosuvastatin', 'Pantoprazole', 'Furosemide', 'Prednisone',
    'Azithromycin', 'Ibuprofen', 'Acetaminophen', 'Clopidogrel', 'Warfarin',
  ];

  const handleMedicationSearch = (value: string) => {
    setMedicationSearch(value);
    setCurrentMedication({ ...currentMedication, name: value });

    if (value.length >= 2) {
      const filtered = commonMedications.filter(med =>
        med.toLowerCase().includes(value.toLowerCase())
      );
      setMedicationSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectMedication = (medName: string) => {
    setMedicationSearch(medName);
    setCurrentMedication({ ...currentMedication, name: medName });
    setShowSuggestions(false);
  };

  const addMedication = () => {
    if (currentMedication.name && currentMedication.dose && currentMedication.frequency) {
      setMedications([...medications, currentMedication]);
      setCurrentMedication({ name: '', dose: '', frequency: '', route: 'oral', instructions: '' });
      setMedicationSearch('');
    }
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const checkDrugInteractions = () => {
    // Mock drug interaction checker
    const mockInteractions: DrugInteraction[] = [];

    // Simple mock logic: check for common interactions
    const medNames = medications.map(m => m.name.toLowerCase());

    if (medNames.includes('warfarin') && medNames.includes('ibuprofen')) {
      mockInteractions.push({
        medication1: 'Warfarin',
        medication2: 'Ibuprofen',
        severity: 'severe',
        description: 'Increased risk of bleeding. Consider alternative pain management or close monitoring.'
      });
    }

    if (medNames.includes('metformin') && medNames.includes('furosemide')) {
      mockInteractions.push({
        medication1: 'Metformin',
        medication2: 'Furosemide',
        severity: 'moderate',
        description: 'May increase risk of lactic acidosis. Monitor renal function.'
      });
    }

    if (medNames.includes('lisinopril') && medNames.includes('losartan')) {
      mockInteractions.push({
        medication1: 'Lisinopril',
        medication2: 'Losartan',
        severity: 'moderate',
        description: 'Concurrent use of ACE inhibitors and ARBs may increase risk of hypotension and renal impairment.'
      });
    }

    setInteractions(mockInteractions);
  };

  useEffect(() => {
    if (wizardStep === 3 && medications.length > 1) {
      checkDrugInteractions();
    }
  }, [wizardStep, medications]);

  const handleSubmitPrescription = async () => {
    if (!selectedPatient || medications.length === 0 || !signatureData) {
      alert('Please complete all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          medications,
          diagnosis,
          instructions,
          signatureMethod,
          signatureData,
        }),
      });

      if (response.ok) {
        setShowWizard(false);
        resetWizard();
        loadPrescriptions();
        alert('Prescription created successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to create prescription'}`);
      }
    } catch (error) {
      console.error('Error creating prescription:', error);
      alert('Failed to create prescription');
    } finally {
      setSubmitting(false);
    }
  };

  const getInteractionSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe':
        return 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-400';
      case 'moderate':
        return 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-900 dark:text-orange-400';
      case 'mild':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-400';
      default:
        return 'border-gray-500 bg-gray-50 dark:bg-gray-900/20 text-gray-900 dark:text-gray-400';
    }
  };

  const stats = {
    total: prescriptions.length,
    pending: prescriptions.filter((p) => p.status === 'PENDING').length,
    signed: prescriptions.filter((p) => p.status === 'SIGNED').length,
    sent: prescriptions.filter((p) => p.status === 'SENT').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-3xl">💊</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                E-Prescriptions
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Secure electronic prescriptions with blockchain verification
              </p>
            </div>
          </div>
          <Button onClick={handleNewPrescription} size="lg">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Prescription
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'from-gray-500 to-gray-600', icon: '📊' },
            { label: 'Pending', value: stats.pending, color: 'from-yellow-500 to-orange-500', icon: '⏳' },
            { label: 'Signed', value: stats.signed, color: 'from-green-500 to-emerald-600', icon: '✓' },
            { label: 'Sent', value: stats.sent, color: 'from-blue-500 to-indigo-600', icon: '📤' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.label}</p>
                <span className="text-2xl">{stat.icon}</span>
              </div>
              <p className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                {stat.value}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              🔍 Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by patient name, medication, or token..."
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              📋 Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
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
      </motion.div>

      {/* Prescriptions List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 dark:border-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading prescriptions...</p>
        </div>
      ) : filteredPrescriptions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-12 text-center"
        >
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-full flex items-center justify-center mb-6">
            <span className="text-6xl">💊</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            No prescriptions found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {searchTerm
              ? 'Try adjusting your search or filters'
              : 'Create your first prescription to get started'}
          </p>
          {!searchTerm && (
            <Button onClick={handleNewPrescription} size="lg">
              Create First Prescription
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-4">
          {filteredPrescriptions.map((prescription, index) => (
            <motion.div
              key={prescription.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all"
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
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-400 mb-1">
                      📋 Diagnosis:
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      {prescription.diagnosis}
                    </p>
                  </div>
                )}

                {/* Medications Summary */}
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    💊 Medications ({prescription.medications.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {prescription.medications.map((med: any, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium border border-purple-200 dark:border-purple-800"
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
                  <Button onClick={() => handleViewDetails(prescription.id)} variant="secondary">
                    View Details →
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Prescription Wizard Modal */}
      <AnimatePresence>
        {showWizard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowWizard(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden border-2 border-purple-200 dark:border-purple-800"
            >
              {/* Wizard Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-purple-500 to-blue-600 text-white">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <span>💊</span> New Prescription
                  </h2>
                  <button
                    onClick={() => setShowWizard(false)}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-between">
                  {[
                    { step: 1, label: 'Patient', icon: '👤' },
                    { step: 2, label: 'Medications', icon: '💊' },
                    { step: 3, label: 'Interactions', icon: '⚠️' },
                    { step: 4, label: 'Details', icon: '📝' },
                    { step: 5, label: 'Sign', icon: '✍️' },
                  ].map((s, i) => (
                    <div key={s.step} className="flex items-center">
                      <div className={`flex flex-col items-center ${wizardStep >= s.step ? 'opacity-100' : 'opacity-50'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                          wizardStep === s.step
                            ? 'bg-white text-purple-600 shadow-lg scale-110'
                            : wizardStep > s.step
                            ? 'bg-white/80 text-purple-600'
                            : 'bg-purple-700/50 text-white'
                        } transition-all`}>
                          {s.icon}
                        </div>
                        <span className="text-xs mt-1 font-medium">{s.label}</span>
                      </div>
                      {i < 4 && (
                        <div className={`w-12 h-1 mx-2 rounded-full ${
                          wizardStep > s.step ? 'bg-white' : 'bg-white/30'
                        } transition-all`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Wizard Content */}
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {/* Step 1: Select Patient */}
                {wizardStep === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <span>👤</span> Select Patient
                    </h3>
                    <div className="space-y-3">
                      {patients.map(patient => (
                        <button
                          key={patient.id}
                          onClick={() => setSelectedPatient(patient)}
                          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                            selectedPatient?.id === patient.id
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                          }`}
                        >
                          <div className="font-bold text-gray-900 dark:text-white">
                            {patient.firstName} {patient.lastName}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            DOB: {new Date(patient.dateOfBirth).toLocaleDateString()} • Token: {patient.tokenId}
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Add Medications */}
                {wizardStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <span>💊</span> Add Medications
                    </h3>

                    {/* Medication Input Form */}
                    <div className="space-y-4 mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                      <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Medication Name *
                        </label>
                        <input
                          type="text"
                          value={medicationSearch}
                          onChange={(e) => handleMedicationSearch(e.target.value)}
                          onFocus={() => medicationSearch.length >= 2 && setShowSuggestions(true)}
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white transition-all"
                          placeholder="Start typing medication name..."
                        />
                        {showSuggestions && medicationSuggestions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {medicationSuggestions.map((med, i) => (
                              <button
                                key={i}
                                onClick={() => selectMedication(med)}
                                className="w-full px-4 py-2 text-left hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
                              >
                                {med}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Dose *
                          </label>
                          <input
                            type="text"
                            value={currentMedication.dose}
                            onChange={(e) => setCurrentMedication({ ...currentMedication, dose: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white transition-all"
                            placeholder="e.g., 500mg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Frequency *
                          </label>
                          <input
                            type="text"
                            value={currentMedication.frequency}
                            onChange={(e) => setCurrentMedication({ ...currentMedication, frequency: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white transition-all"
                            placeholder="e.g., twice daily"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Route
                          </label>
                          <select
                            value={currentMedication.route}
                            onChange={(e) => setCurrentMedication({ ...currentMedication, route: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white transition-all"
                          >
                            <option value="oral">Oral</option>
                            <option value="topical">Topical</option>
                            <option value="injection">Injection</option>
                            <option value="inhalation">Inhalation</option>
                            <option value="sublingual">Sublingual</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Duration
                          </label>
                          <input
                            type="text"
                            value={currentMedication.duration || ''}
                            onChange={(e) => setCurrentMedication({ ...currentMedication, duration: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white transition-all"
                            placeholder="e.g., 7 days"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Instructions
                        </label>
                        <textarea
                          value={currentMedication.instructions}
                          onChange={(e) => setCurrentMedication({ ...currentMedication, instructions: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white transition-all"
                          rows={2}
                          placeholder="e.g., Take with food"
                        />
                      </div>

                      <Button onClick={addMedication} fullWidth disabled={!currentMedication.name || !currentMedication.dose || !currentMedication.frequency}>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Medication
                      </Button>
                    </div>

                    {/* Added Medications List */}
                    {medications.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                          Added Medications ({medications.length}):
                        </h4>
                        <div className="space-y-2">
                          {medications.map((med, index) => (
                            <div
                              key={index}
                              className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg flex items-start justify-between"
                            >
                              <div className="flex-1">
                                <div className="font-bold text-gray-900 dark:text-white">{med.name}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {med.dose} • {med.frequency} • {med.route}
                                  {med.duration && ` • Duration: ${med.duration}`}
                                </div>
                                {med.instructions && (
                                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Instructions: {med.instructions}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => removeMedication(index)}
                                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 ml-4"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Step 3: Drug Interactions */}
                {wizardStep === 3 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <span>⚠️</span> Drug Interaction Check
                    </h3>

                    {interactions.length === 0 ? (
                      <div className="p-8 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl text-center">
                        <div className="text-6xl mb-4">✅</div>
                        <h4 className="font-bold text-green-900 dark:text-green-400 text-lg mb-2">
                          No Interactions Detected
                        </h4>
                        <p className="text-green-700 dark:text-green-500">
                          The medications selected do not have any known interactions.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {interactions.map((interaction, index) => (
                          <div
                            key={index}
                            className={`p-4 rounded-xl border-2 ${getInteractionSeverityColor(interaction.severity)}`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-bold mb-1">
                                  {interaction.medication1} + {interaction.medication2}
                                </h4>
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                  interaction.severity === 'severe' ? 'bg-red-200 dark:bg-red-900' :
                                  interaction.severity === 'moderate' ? 'bg-orange-200 dark:bg-orange-900' :
                                  'bg-yellow-200 dark:bg-yellow-900'
                                }`}>
                                  {interaction.severity.toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm">{interaction.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Step 4: Details */}
                {wizardStep === 4 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <span>📝</span> Additional Details
                    </h3>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Diagnosis
                      </label>
                      <textarea
                        value={diagnosis}
                        onChange={(e) => setDiagnosis(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white transition-all"
                        rows={3}
                        placeholder="Enter diagnosis or indication for prescription"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        General Instructions
                      </label>
                      <textarea
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white transition-all"
                        rows={4}
                        placeholder="Enter general instructions for the patient or pharmacy"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Step 5: Sign */}
                {wizardStep === 5 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <span>✍️</span> Sign Prescription
                    </h3>

                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                      <h4 className="font-bold text-blue-900 dark:text-blue-400 mb-2">Prescription Summary</h4>
                      <div className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                        <p><strong>Patient:</strong> {selectedPatient?.firstName} {selectedPatient?.lastName}</p>
                        <p><strong>Medications:</strong> {medications.length} medication(s)</p>
                        {diagnosis && <p><strong>Diagnosis:</strong> {diagnosis}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Signature Method
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => setSignatureMethod('pin')}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            signatureMethod === 'pin'
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                          }`}
                        >
                          <div className="text-2xl mb-2">🔢</div>
                          <div className="font-semibold">PIN</div>
                        </button>
                        <button
                          onClick={() => setSignatureMethod('signature')}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            signatureMethod === 'signature'
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                          }`}
                        >
                          <div className="text-2xl mb-2">✍️</div>
                          <div className="font-semibold">Digital Signature</div>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {signatureMethod === 'pin' ? 'Enter PIN' : 'Enter Signature'}
                      </label>
                      <input
                        type={signatureMethod === 'pin' ? 'password' : 'text'}
                        value={signatureData}
                        onChange={(e) => setSignatureData(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white transition-all"
                        placeholder={signatureMethod === 'pin' ? 'Enter 4-digit PIN' : 'Type your full name'}
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Wizard Footer */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <Button
                  onClick={() => wizardStep > 1 && setWizardStep(wizardStep - 1)}
                  variant="ghost"
                  disabled={wizardStep === 1}
                >
                  ← Back
                </Button>

                {wizardStep < 5 ? (
                  <Button
                    onClick={() => {
                      if (wizardStep === 1 && !selectedPatient) {
                        alert('Please select a patient');
                        return;
                      }
                      if (wizardStep === 2 && medications.length === 0) {
                        alert('Please add at least one medication');
                        return;
                      }
                      setWizardStep(wizardStep + 1);
                    }}
                  >
                    Next →
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmitPrescription}
                    loading={submitting}
                    disabled={!signatureData || submitting}
                    variant="success"
                  >
                    {submitting ? 'Submitting...' : '✓ Submit Prescription'}
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
