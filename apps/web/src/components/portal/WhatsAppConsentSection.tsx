/**
 * WhatsApp Consent Section Component
 * HIPAA/LGPD compliant consent management for WhatsApp adherence monitoring
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ConsentData {
  consentGiven: boolean;
  consentDate: string | null;
  consentMethod: string | null;
  withdrawnAt: string | null;
  language: string;
  phoneNumber: string | null;
  preferences: {
    medicationReminders: boolean;
    appointmentReminders: boolean;
    labResultsAlerts: boolean;
    preventiveCareAlerts: boolean;
    preferredContactTimeStart: string | null;
    preferredContactTimeEnd: string | null;
    doNotDisturb: boolean;
  };
}

export default function WhatsAppConsentSection() {
  const [consent, setConsent] = useState<ConsentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConsentForm, setShowConsentForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [language, setLanguage] = useState<'en' | 'es' | 'pt'>('en');
  const [medicationReminders, setMedicationReminders] = useState(true);
  const [appointmentReminders, setAppointmentReminders] = useState(true);
  const [labResultsAlerts, setLabResultsAlerts] = useState(true);
  const [preventiveCareAlerts, setPreventiveCareAlerts] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [doNotDisturb, setDoNotDisturb] = useState(false);

  // Fetch consent status on mount
  useEffect(() => {
    fetchConsentStatus();
  }, []);

  const fetchConsentStatus = async () => {
    try {
      const response = await fetch('/api/portal/consent/whatsapp');
      if (!response.ok) throw new Error('Failed to fetch consent status');
      const result = await response.json();
      setConsent(result.data);

      // Populate form with existing preferences
      if (result.data.preferences) {
        setMedicationReminders(result.data.preferences.medicationReminders);
        setAppointmentReminders(result.data.preferences.appointmentReminders);
        setLabResultsAlerts(result.data.preferences.labResultsAlerts);
        setPreventiveCareAlerts(result.data.preferences.preventiveCareAlerts);
        setStartTime(result.data.preferences.preferredContactTimeStart || '09:00');
        setEndTime(result.data.preferences.preferredContactTimeEnd || '18:00');
        setDoNotDisturb(result.data.preferences.doNotDisturb);
      }
      setLanguage(result.data.language as 'en' | 'es' | 'pt');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load consent status');
    } finally {
      setLoading(false);
    }
  };

  const handleGrantConsent = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/portal/consent/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consentMethod: 'Portal',
          language,
          medicationReminders,
          appointmentReminders,
          labResultsAlerts,
          preventiveCareAlerts,
          preferredContactTimeStart: startTime,
          preferredContactTimeEnd: endTime,
          doNotDisturb,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to grant consent');
      }

      setSuccess('WhatsApp consent granted successfully! You will start receiving reminders.');
      setShowConsentForm(false);
      fetchConsentStatus(); // Refresh consent status
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to grant consent');
    } finally {
      setSaving(false);
    }
  };

  const handleWithdrawConsent = async () => {
    if (!confirm('Are you sure you want to withdraw WhatsApp consent? You will stop receiving all WhatsApp reminders.')) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/portal/consent/whatsapp', {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to withdraw consent');
      }

      setSuccess('WhatsApp consent withdrawn. You will no longer receive WhatsApp reminders.');
      fetchConsentStatus(); // Refresh consent status
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to withdraw consent');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
    >
      <div className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0 w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600 dark:text-green-300" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              WhatsApp Adherence Monitoring
            </h2>
            {/* Decorative - low contrast intentional for description text, helper text, and terms list */}
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Stay on track with automated medication reminders, appointment notifications, and health alerts via WhatsApp.
            </p>

            {/* Status Badge */}
            {consent?.consentGiven && !consent?.withdrawnAt ? (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 mb-4">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Active - Enrolled on {new Date(consent.consentDate!).toLocaleDateString()}
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 mb-4">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                Not Enrolled
              </div>
            )}

            {/* Error/Success Messages */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
              </div>
            )}

            {/* Benefits List */}
            {!consent?.consentGiven && !showConsentForm && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Benefits of WhatsApp Reminders:
                </p>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Never miss a medication dose with timely reminders</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Get notified about upcoming appointments</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Receive lab results and preventive care alerts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>HIPAA-compliant secure messaging</span>
                  </li>
                </ul>
              </div>
            )}

            {/* Consent Form */}
            {showConsentForm && (
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 mb-4 space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Customize Your Preferences</h3>

                {/* Language Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Preferred Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'en' | 'es' | 'pt')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="pt">Português</option>
                  </select>
                </div>

                {/* Reminder Types */}
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={medicationReminders}
                      onChange={(e) => setMedicationReminders(e.target.checked)}
                      className="w-4 h-4 text-green-600 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Medication reminders</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={appointmentReminders}
                      onChange={(e) => setAppointmentReminders(e.target.checked)}
                      className="w-4 h-4 text-green-600 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Appointment reminders</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={labResultsAlerts}
                      onChange={(e) => setLabResultsAlerts(e.target.checked)}
                      className="w-4 h-4 text-green-600 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Lab results alerts</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={preventiveCareAlerts}
                      onChange={(e) => setPreventiveCareAlerts(e.target.checked)}
                      className="w-4 h-4 text-green-600 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Preventive care alerts</span>
                  </label>
                </div>

                {/* Contact Time Preferences */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>

                {/* Do Not Disturb */}
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={doNotDisturb}
                    onChange={(e) => setDoNotDisturb(e.target.checked)}
                    className="w-4 h-4 text-green-600 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Enable Do Not Disturb mode</span>
                </label>

                {/* HIPAA Consent Statement */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    <strong>Consent Statement:</strong> By enabling WhatsApp reminders, I consent to receive automated health-related messages via WhatsApp. I understand that:
                  </p>
                  <ul className="text-xs text-gray-600 dark:text-gray-400 mt-2 space-y-1 list-disc list-inside">
                    <li>Messages will not contain detailed PHI, only secure links</li>
                    <li>I can withdraw consent at any time</li>
                    <li>Standard messaging rates may apply</li>
                    <li>This is HIPAA-compliant secure messaging</li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleGrantConsent}
                    disabled={saving || !consent?.phoneNumber}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {saving ? 'Saving...' : 'Grant Consent'}
                  </button>
                  <button
                    onClick={() => setShowConsentForm(false)}
                    disabled={saving}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>

                {!consent?.phoneNumber && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Please add a phone number to your profile before enabling WhatsApp reminders.
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {!showConsentForm && (
              <div className="flex gap-3">
                {consent?.consentGiven && !consent?.withdrawnAt ? (
                  <>
                    <button
                      onClick={() => setShowConsentForm(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Update Preferences
                    </button>
                    <button
                      onClick={handleWithdrawConsent}
                      disabled={saving}
                      className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium"
                    >
                      {saving ? 'Processing...' : 'Withdraw Consent'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowConsentForm(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    Enable WhatsApp Reminders
                  </button>
                )}
              </div>
            )}

            {/* Current Preferences Display */}
            {consent?.consentGiven && !consent?.withdrawnAt && !showConsentForm && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Current Settings:
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>Language: {consent.language.toUpperCase()}</li>
                  <li>Phone: {consent.phoneNumber}</li>
                  {consent.preferences.preferredContactTimeStart && (
                    <li>Contact hours: {consent.preferences.preferredContactTimeStart} - {consent.preferences.preferredContactTimeEnd}</li>
                  )}
                  <li>Active reminders: {[
                    consent.preferences.medicationReminders && 'Medications',
                    consent.preferences.appointmentReminders && 'Appointments',
                    consent.preferences.labResultsAlerts && 'Lab Results',
                    consent.preferences.preventiveCareAlerts && 'Preventive Care'
                  ].filter(Boolean).join(', ')}</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
