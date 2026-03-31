'use client';

/**
 * Patient Selector Modal
 * Select patients and delivery channels to send reminders to.
 * Supports multi-channel selection (SMS + Email + WhatsApp simultaneously)
 * and bulk patient selection with search and filters.
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type DeliveryChannel = 'SMS' | 'EMAIL' | 'WHATSAPP';

export interface Patient {
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
  onConfirm: (selectedPatients: Patient[], channels: DeliveryChannel[]) => void;
}

const CHANNEL_OPTIONS: { value: DeliveryChannel; label: string }[] = [
  { value: 'SMS', label: 'SMS' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
];

export default function PatientSelectorModal({
  isOpen,
  onClose,
  onConfirm,
}: PatientSelectorModalProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [channels, setChannels] = useState<Set<DeliveryChannel>>(new Set(['SMS']));

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

  const toggleChannel = (ch: DeliveryChannel) => {
    const next = new Set(channels);
    if (next.has(ch)) {
      if (next.size > 1) next.delete(ch); // Prevent deselecting all
    } else {
      next.add(ch);
    }
    setChannels(next);
  };

  const togglePatient = (patientId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(patientId)) {
      newSelected.delete(patientId);
    } else {
      newSelected.add(patientId);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    const selectable = filteredPatients.filter((p) => hasAnyContactInfo(p));
    if (selectedIds.size === selectable.length && selectable.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectable.map((p) => p.id)));
    }
  };

  // Patient is selectable if they have contact info for ANY selected channel
  const hasAnyContactInfo = (patient: Patient) => {
    if (channels.has('EMAIL') && patient.email) return true;
    if ((channels.has('SMS') || channels.has('WHATSAPP')) && patient.phone) return true;
    return false;
  };

  // Which selected channels this patient is missing contact info for
  const getMissingChannels = (patient: Patient): string[] => {
    const missing: string[] = [];
    if (channels.has('EMAIL') && !patient.email) missing.push('email');
    if (channels.has('SMS') && !patient.phone) missing.push('sms');
    if (channels.has('WHATSAPP') && !patient.phone) missing.push('whatsapp');
    return missing;
  };

  const handleConfirm = () => {
    const selected = patients.filter((p) => selectedIds.has(p.id));
    onConfirm(selected, Array.from(channels) as DeliveryChannel[]);
    onClose();
    setSelectedIds(new Set());
  };

  const channelLabel = useMemo(() => {
    const active = CHANNEL_OPTIONS.filter((c) => channels.has(c.value));
    return active.map((c) => c.label).join(', ');
  }, [channels]);

  const selectableCount = useMemo(
    () => filteredPatients.filter((p) => hasAnyContactInfo(p)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredPatients, channels],
  );

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
          className="relative dark:bg-gray-900 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--surface-primary)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--token-shadow-xl)' }}
        >
          {/* Header */}
          <div className="px-6 py-4 dark:border-gray-700 bg-gradient-to-r from-blue-500 to-purple-600" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Select Patients</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Channel Selection — multi-select toggles */}
          <div className="px-6 py-4 dark:border-gray-700 dark:bg-gray-800" style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--surface-secondary)' }}>
            <label className="text-sm font-semibold dark:text-gray-300 mb-2 block" style={{ color: 'var(--text-secondary)' }}>
              Delivery Channels
            </label>
            <div className="grid grid-cols-3 gap-3">
              {CHANNEL_OPTIONS.map((ch) => {
                const isActive = channels.has(ch.value);
                return (
                  <button
                    key={ch.value}
                    onClick={() => toggleChannel(ch.value)}
                    className={`flex items-center justify-center gap-2 px-4 py-3 font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800'
                        : 'dark:bg-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 dark:border-gray-600'
                    }`}
                    style={{ borderRadius: 'var(--radius-lg)', ...(isActive ? { boxShadow: 'var(--token-shadow-lg)' } : { backgroundColor: 'var(--surface-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-strong)' }) }}
                  >
                    <span>{ch.label}</span>
                    {isActive && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
            {channels.size > 1 && (
              <p className="text-xs dark:text-gray-400 mt-2" style={{ color: 'var(--text-tertiary)' }}>
                Patients will receive the message on all selected channels.
              </p>
            )}
          </div>

          {/* Search & Controls */}
          <div className="px-6 py-4 dark:border-gray-700 space-y-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search patients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent" style={{ border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)' }}
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={toggleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {selectedIds.size === selectableCount && selectableCount > 0 ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-sm dark:text-gray-400" style={{ color: 'var(--text-secondary)' }}>
                {selectedIds.size} of {selectableCount} selected
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
                <p className="dark:text-gray-400 mb-2" style={{ color: 'var(--text-tertiary)' }}>No patients found</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Try adjusting your search</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPatients.map((patient) => {
                  const isSelected = selectedIds.has(patient.id);
                  const hasInfo = hasAnyContactInfo(patient);
                  const missing = getMissingChannels(patient);

                  return (
                    <button
                      key={patient.id}
                      onClick={() => togglePatient(patient.id)}
                      disabled={!hasInfo}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${
                        !hasInfo
                          ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800'
                          : isSelected
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-600 shadow-md'
                            : 'bg-gray-50 dark:bg-gray-800 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      {/* Checkbox */}
                      <div
                        className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600'
                            : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>

                      {/* Patient Info */}
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {patient.firstName} {patient.lastName}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                          {patient.phone && <span>{patient.phone}</span>}
                          {patient.phone && patient.email && <span className="text-gray-300 dark:text-gray-600">|</span>}
                          {patient.email && <span>{patient.email}</span>}
                          {!patient.phone && !patient.email && <span>No contact info</span>}
                        </div>
                      </div>

                      {/* Missing channel badges */}
                      {hasInfo && missing.length > 0 && (
                        <div className="flex-shrink-0 flex gap-1">
                          {missing.map((ch) => (
                            <span
                              key={ch}
                              className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-[10px] font-medium rounded"
                            >
                              No {ch}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Fully missing warning */}
                      {!hasInfo && (
                        <div className="flex-shrink-0 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium rounded">
                          No contact info
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 dark:border-gray-700 dark:bg-gray-800 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-default)', backgroundColor: 'var(--surface-secondary)' }}>
            <button
              onClick={onClose}
              className="px-6 py-2.5 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" style={{ color: 'var(--text-secondary)', borderRadius: 'var(--radius-lg)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className={`px-8 py-2.5 font-semibold transition-all ${
                selectedIds.size === 0
                  ? 'dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:shadow-xl'
              }`}
              style={{ borderRadius: 'var(--radius-lg)', ...(selectedIds.size === 0 ? { backgroundColor: 'var(--border-strong)', color: 'var(--text-tertiary)' } : { boxShadow: 'var(--token-shadow-lg)' }) }}
            >
              Send to {selectedIds.size} patient{selectedIds.size !== 1 ? 's' : ''} via {channelLabel}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
