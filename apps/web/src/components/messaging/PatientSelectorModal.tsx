'use client';

/**
 * Patient Selector Modal
 * Select patients to send reminders to
 * Supports single and bulk selection with search and filters
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface PatientSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedPatients: Patient[], channel: 'SMS' | 'EMAIL' | 'WHATSAPP') => void;
}

export default function PatientSelectorModal({
  isOpen,
  onClose,
  onConfirm,
}: PatientSelectorModalProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [channel, setChannel] = useState<'SMS' | 'EMAIL' | 'WHATSAPP'>('SMS');

  // Fetch patients from API
  useEffect(() => {
    if (isOpen) {
      fetchPatients();
    }
  }, [isOpen]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/patients');
      const data = await response.json();

      if (data.success) {
        setPatients(data.data);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter patients by search query
  const filteredPatients = patients.filter((p) => {
    const searchLower = searchQuery.toLowerCase();
    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
    const email = (p.email || '').toLowerCase();
    const phone = (p.phone || '').toLowerCase();

    return (
      fullName.includes(searchLower) ||
      email.includes(searchLower) ||
      phone.includes(searchLower) ||
      p.id.toLowerCase().includes(searchLower)
    );
  });

  // Toggle patient selection
  const togglePatient = (patientId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(patientId)) {
      newSelected.delete(patientId);
    } else {
      newSelected.add(patientId);
    }
    setSelectedIds(newSelected);
  };

  // Select/deselect all
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPatients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPatients.map((p) => p.id)));
    }
  };

  // Handle confirm
  const handleConfirm = () => {
    const selected = patients.filter((p) => selectedIds.has(p.id));
    onConfirm(selected, channel);
    onClose();
    setSelectedIds(new Set());
  };

  // Check if patient has required contact info for channel
  const hasContactInfo = (patient: Patient, ch: string) => {
    if (ch === 'EMAIL') return !!patient.email;
    if (ch === 'SMS' || ch === 'WHATSAPP') return !!patient.phone;
    return false;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-600">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Select Patients</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Channel Selection */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Delivery Channel
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'SMS', label: 'SMS', icon: '💬' },
                { value: 'EMAIL', label: 'Email', icon: '📧' },
                { value: 'WHATSAPP', label: 'WhatsApp', icon: '💚' },
              ].map((ch) => (
                <button
                  key={ch.value}
                  onClick={() => setChannel(ch.value as any)}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                    channel === ch.value
                      ? 'bg-blue-600 text-white shadow-lg ring-2 ring-offset-2 ring-blue-500'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  <span className="text-xl">{ch.icon}</span>
                  <span>{ch.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Search & Controls */}
          <div className="px-6 py-4 border-b border-gray-200 space-y-3">
            {/* Search */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search patients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Select All */}
            <div className="flex items-center justify-between">
              <button
                onClick={toggleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {selectedIds.size === filteredPatients.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-sm text-gray-600">
                {selectedIds.size} of {filteredPatients.length} selected
              </span>
            </div>
          </div>

          {/* Patient List */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600" />
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-2">No patients found</p>
                <p className="text-sm text-gray-400">Try adjusting your search</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPatients.map((patient) => {
                  const isSelected = selectedIds.has(patient.id);
                  const hasInfo = hasContactInfo(patient, channel);

                  return (
                    <button
                      key={patient.id}
                      onClick={() => togglePatient(patient.id)}
                      disabled={!hasInfo}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${
                        !hasInfo
                          ? 'opacity-50 cursor-not-allowed bg-gray-50'
                          : isSelected
                            ? 'bg-blue-50 border-2 border-blue-600 shadow-md'
                            : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100 hover:border-gray-300'
                      }`}
                    >
                      {/* Checkbox */}
                      <div
                        className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600'
                            : 'bg-white border-gray-300'
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="w-4 h-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>

                      {/* Patient Info */}
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-gray-900">
                          {patient.firstName} {patient.lastName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {channel === 'EMAIL'
                            ? patient.email || 'No email'
                            : patient.phone || 'No phone'}
                        </p>
                      </div>

                      {/* Warning if no contact info */}
                      {!hasInfo && (
                        <div className="flex-shrink-0 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                          No {channel.toLowerCase()}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className={`px-8 py-2.5 rounded-lg font-semibold transition-all ${
                selectedIds.size === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
              }`}
            >
              Send to {selectedIds.size} patient{selectedIds.size !== 1 ? 's' : ''}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
