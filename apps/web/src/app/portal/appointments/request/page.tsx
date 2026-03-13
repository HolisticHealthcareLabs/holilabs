/**
export const dynamic = 'force-dynamic';

 * Request Appointment Page
 *
 * Beautiful mobile-first appointment request form
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function RequestAppointmentPage() {
  const router = useRouter();
  const t = useTranslations('portal.appointmentRequest');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    reason: '',
    preferredDate: '',
    preferredTime: 'MORNING' as 'MORNING' | 'AFTERNOON' | 'EVENING',
    type: 'IN_PERSON' as 'IN_PERSON' | 'VIRTUAL' | 'PHONE',
    notes: '',
    urgency: 'ROUTINE' as 'ROUTINE' | 'URGENT' | 'EMERGENCY',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/portal/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || t('submit'));
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/portal/appointments');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('title'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('successTitle')}</h2>
          <p className="text-gray-600 mb-6">{t('successMessage')}</p>
          <p className="text-sm text-gray-500">{t('redirecting')}</p>
        </motion.div>
      </div>
    );
  }

  // Get minimum date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  // Get maximum date (3 months from now)
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/portal/appointments"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('backToAppointments')}
          </Link>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            {t('title')}
          </h1>
          <p className="text-gray-600">
            {t('subtitle')}
          </p>
        </div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 lg:p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Reason */}
            <div>
              <label htmlFor="reason" className="block text-sm font-semibold text-gray-700 mb-2">
                {t('reasonRequired')}
              </label>
              <input
                id="reason"
                type="text"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                placeholder={t('reasonPlaceholder')}
                required
                minLength={10}
              />
              <p className="text-xs text-gray-500 mt-1">{t('reasonHint')}</p>
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                {t('typeLabel')} <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'IN_PERSON' })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.type === 'IN_PERSON'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">🏥</div>
                  <div className="text-sm font-semibold text-gray-900">{t('typePresencial')}</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'VIRTUAL' })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.type === 'VIRTUAL'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">💻</div>
                  <div className="text-sm font-semibold text-gray-900">{t('typeVirtual')}</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'PHONE' })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.type === 'PHONE'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">📞</div>
                  <div className="text-sm font-semibold text-gray-900">{t('typePhone')}</div>
                </button>
              </div>
            </div>

            {/* Preferred Date */}
            <div>
              <label htmlFor="preferredDate" className="block text-sm font-semibold text-gray-700 mb-2">
                {t('dateLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                id="preferredDate"
                type="date"
                value={formData.preferredDate}
                onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                min={minDate}
                max={maxDateStr}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                required
              />
            </div>

            {/* Preferred Time */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                {t('timeLabel')} <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, preferredTime: 'MORNING' })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.preferredTime === 'MORNING'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">🌅</div>
                  <div className="text-sm font-semibold text-gray-900">{t('timeMorning')}</div>
                  <div className="text-xs text-gray-500">{t('timeMorningHours')}</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, preferredTime: 'AFTERNOON' })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.preferredTime === 'AFTERNOON'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">☀️</div>
                  <div className="text-sm font-semibold text-gray-900">{t('timeAfternoon')}</div>
                  <div className="text-xs text-gray-500">{t('timeAfternoonHours')}</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, preferredTime: 'EVENING' })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.preferredTime === 'EVENING'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">🌙</div>
                  <div className="text-sm font-semibold text-gray-900">{t('timeEvening')}</div>
                  <div className="text-xs text-gray-500">{t('timeEveningHours')}</div>
                </button>
              </div>
            </div>

            {/* Urgency */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                {t('urgencyLabel')}
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, urgency: 'ROUTINE' })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.urgency === 'ROUTINE'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">📋</div>
                  <div className="text-sm font-semibold text-gray-900">{t('urgencyRoutine')}</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, urgency: 'URGENT' })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.urgency === 'URGENT'
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">⚠️</div>
                  <div className="text-sm font-semibold text-gray-900">{t('urgencyUrgent')}</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, urgency: 'EMERGENCY' })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.urgency === 'EMERGENCY'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">🚨</div>
                  <div className="text-sm font-semibold text-gray-900">{t('urgencyEmergency')}</div>
                </button>
              </div>
              {formData.urgency === 'EMERGENCY' && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{t('emergencyWarning')}</p>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-semibold text-gray-700 mb-2">
                {t('notesLabel')}
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                placeholder={t('notesPlaceholder')}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Link
                href="/portal/appointments"
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors text-center"
              >
                {t('cancel')}
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    {t('submitting')}
                  </>
                ) : (
                  t('submit')
                )}
              </button>
            </div>
          </form>
        </motion.div>

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">
            📋 {t('whatNextTitle')}
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600">1.</span>
              <span>{t('whatNextStep1')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">2.</span>
              <span>{t('whatNextStep2')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">3.</span>
              <span>{t('whatNextStep3')}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
