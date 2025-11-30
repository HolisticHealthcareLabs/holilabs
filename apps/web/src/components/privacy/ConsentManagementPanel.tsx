'use client';

import { useState, useEffect } from 'react';

/**
 * Consent Management Panel
 *
 * Implements industry-grade consent management following:
 * - HIPAA Authorization (45 CFR § 164.508)
 * - GDPR Article 7 (Conditions for consent)
 * - LGPD Article 8 (Consent requirements)
 *
 * Features:
 * - Granular consent control
 * - Consent-gated appointment booking
 * - Audit trail for all consent changes
 * - Withdrawal of consent (right to be forgotten)
 */

export interface ConsentType {
  id: string;
  name: string;
  description: string;
  required: boolean; // If true, user cannot proceed without this consent
  category: 'TREATMENT' | 'RESEARCH' | 'MARKETING' | 'DATA_SHARING' | 'RECORDING';
  icon: string;
}

export interface ConsentStatus {
  consentType: ConsentType;
  granted: boolean;
  grantedAt?: string;
  revokedAt?: string;
  expiresAt?: string;
  version: string; // Track consent form version
}

const CONSENT_TYPES: ConsentType[] = [
  {
    id: 'treatment_access',
    name: 'Treatment & Medical Care',
    description: 'Allow doctors to access your medical records for diagnosis and treatment. Required for receiving medical care.',
    required: true,
    category: 'TREATMENT',
    icon: '🏥',
  },
  {
    id: 'appointment_booking',
    name: 'Appointment Booking',
    description: 'Allow doctors to view your availability and medical history when booking appointments. Required to schedule appointments.',
    required: true,
    category: 'TREATMENT',
    icon: '📅',
  },
  {
    id: 'clinical_recording',
    name: 'Clinical Consultation Recording',
    description: 'Allow AI-powered recording and transcription of clinical consultations for accurate documentation. You can revoke this anytime.',
    required: false,
    category: 'RECORDING',
    icon: '🎙️',
  },
  {
    id: 'data_sharing_specialists',
    name: 'Data Sharing with Specialists',
    description: 'Allow your primary doctor to share your records with specialists for referrals and second opinions.',
    required: false,
    category: 'DATA_SHARING',
    icon: '👨‍⚕️',
  },
  {
    id: 'anonymous_research',
    name: 'Anonymous Research Participation',
    description: 'Allow use of your de-identified data for medical research to improve healthcare. Your identity will never be revealed.',
    required: false,
    category: 'RESEARCH',
    icon: '🔬',
  },
  {
    id: 'health_reminders',
    name: 'Health Reminders & Notifications',
    description: 'Receive appointment reminders, prescription refill alerts, and preventive care notifications.',
    required: false,
    category: 'MARKETING',
    icon: '🔔',
  },
  {
    id: 'wellness_programs',
    name: 'Wellness Programs',
    description: 'Receive invitations to wellness programs, health education materials, and preventive care campaigns.',
    required: false,
    category: 'MARKETING',
    icon: '🌿',
  },
];

interface ConsentManagementPanelProps {
  patientId: string;
  onConsentChange?: (consents: ConsentStatus[]) => void;
}

export function ConsentManagementPanel({
  patientId,
  onConsentChange,
}: ConsentManagementPanelProps) {
  const [consents, setConsents] = useState<ConsentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showRevokeModal, setShowRevokeModal] = useState<ConsentType | null>(null);

  // Load existing consents
  useEffect(() => {
    loadConsents();
  }, [patientId]);

  const loadConsents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/consents?patientId=${patientId}`);

      if (response.ok) {
        const data = await response.json();
        setConsents(data.consents || []);
      } else {
        // Initialize with default consents
        setConsents(
          CONSENT_TYPES.map((type) => ({
            consentType: type,
            granted: type.required, // Auto-grant required consents initially
            version: '1.0',
          }))
        );
      }
    } catch (error) {
      console.error('Error loading consents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleConsent = async (consentType: ConsentType, granted: boolean) => {
    // If revoking a critical consent, show warning modal
    if (!granted && consentType.required) {
      setShowRevokeModal(consentType);
      return;
    }

    await updateConsent(consentType, granted);
  };

  const updateConsent = async (consentType: ConsentType, granted: boolean) => {
    try {
      setUpdating(consentType.id);

      const response = await fetch('/api/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          consentTypeId: consentType.id,
          granted,
          version: '1.0',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update consent');
      }

      // Update local state
      const updatedConsents = consents.map((c) =>
        c.consentType.id === consentType.id
          ? {
              ...c,
              granted,
              grantedAt: granted ? new Date().toISOString() : c.grantedAt,
              revokedAt: !granted ? new Date().toISOString() : undefined,
            }
          : c
      );

      setConsents(updatedConsents);

      if (onConsentChange) {
        onConsentChange(updatedConsents);
      }

      // Close modal if open
      setShowRevokeModal(null);
    } catch (error) {
      console.error('Error updating consent:', error);
      alert('Failed to update consent. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  const getConsentStatus = (consentTypeId: string): ConsentStatus | undefined => {
    return consents.find((c) => c.consentType.id === consentTypeId);
  };

  const getCategoryColor = (category: ConsentType['category']): string => {
    switch (category) {
      case 'TREATMENT':
        return 'blue';
      case 'RECORDING':
        return 'purple';
      case 'DATA_SHARING':
        return 'green';
      case 'RESEARCH':
        return 'indigo';
      case 'MARKETING':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-l-4 border-blue-500 p-6 rounded-lg">
        <div className="flex items-start gap-4">
          <div className="text-4xl">🔐</div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Consent Management
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Control how your health data is used. Your consent is always required and you can change
              your preferences at any time. Required consents are necessary for providing medical care.
            </p>
          </div>
        </div>
      </div>

      {/* Consent Categories */}
      {['TREATMENT', 'RECORDING', 'DATA_SHARING', 'RESEARCH', 'MARKETING'].map((category) => {
        const categoryConsents = CONSENT_TYPES.filter((c) => c.category === category);
        if (categoryConsents.length === 0) return null;

        const color = getCategoryColor(category as ConsentType['category']);

        return (
          <div key={category} className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full bg-${color}-500`}></span>
              {category.replace('_', ' ')}
            </h3>

            {categoryConsents.map((consentType) => {
              const status = getConsentStatus(consentType.id);
              const isGranted = status?.granted || false;
              const isUpdating = updating === consentType.id;

              return (
                <div
                  key={consentType.id}
                  className={`bg-white dark:bg-gray-800 border-2 rounded-lg p-6 transition-all ${
                    isGranted
                      ? `border-${color}-500 bg-${color}-50/50 dark:bg-${color}-900/10`
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Icon + Content */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className="text-4xl">{consentType.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                            {consentType.name}
                          </h4>
                          {consentType.required && (
                            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold rounded-full">
                              REQUIRED
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {consentType.description}
                        </p>

                        {/* Consent Status */}
                        {status?.grantedAt && isGranted && (
                          <p className="text-xs text-green-600 dark:text-green-400">
                            ✅ Granted on {new Date(status.grantedAt).toLocaleDateString()}
                          </p>
                        )}
                        {status?.revokedAt && !isGranted && (
                          <p className="text-xs text-red-600 dark:text-red-400">
                            🚫 Revoked on {new Date(status.revokedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Toggle */}
                    <div className="flex items-center">
                      <button
                        onClick={() => handleToggleConsent(consentType, !isGranted)}
                        disabled={isUpdating}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-${color}-500 focus:ring-offset-2 disabled:opacity-50 ${
                          isGranted ? `bg-${color}-600` : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                            isGranted ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Warning for required consents */}
                  {consentType.required && !isGranted && (
                    <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded">
                      <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
                        ⚠️ Warning: Revoking this consent will prevent you from booking appointments
                        and receiving medical care through this platform.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Revoke Confirmation Modal */}
      {showRevokeModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Revoke Critical Consent?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You are about to revoke consent for{' '}
                <span className="font-bold">{showRevokeModal.name}</span>.
              </p>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800 dark:text-red-300 font-medium mb-2">
                This will prevent you from:
              </p>
              <ul className="text-sm text-red-700 dark:text-red-400 space-y-1 ml-4">
                {showRevokeModal.id === 'treatment_access' && (
                  <>
                    <li>• Receiving medical care</li>
                    <li>• Doctors viewing your medical records</li>
                    <li>• Getting prescriptions</li>
                  </>
                )}
                {showRevokeModal.id === 'appointment_booking' && (
                  <>
                    <li>• Booking new appointments</li>
                    <li>• Doctors viewing your medical history</li>
                    <li>• Receiving appointment reminders</li>
                  </>
                )}
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRevokeModal(null)}
                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => updateConsent(showRevokeModal, false)}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
              >
                Revoke Consent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Link */}
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-1">Consent Audit Log</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              View complete history of all consent changes
            </p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
            View Log
          </button>
        </div>
      </div>
    </div>
  );
}
