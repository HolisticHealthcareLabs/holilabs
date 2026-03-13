/**
 * Patient Registration Page
 *
 * Features:
 * - Public self-registration
 * - Password complexity validation with visual feedback
 * - Email verification flow
 * - Clean, user-friendly interface
 * - Terms & conditions acceptance
 * - HIPAA-compliant data collection
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Input, PasswordInput } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { validatePassword } from '@/lib/auth/password-validation';

export default function PatientRegisterPage() {
  const router = useRouter();
  const t = useTranslations('portal.register');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phone: '',
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState<{ verificationUrl?: string; emailDevInboxFile?: string; emailConfigured?: boolean } | null>(null);

  // Password validation
  const passwordValidation = validatePassword(formData.password);
  const { strength, errors: passwordErrors } = passwordValidation;

  const getStrengthColor = () => {
    if (strength <= 1) return 'bg-red-500';
    if (strength === 2) return 'bg-orange-500';
    if (strength === 3) return 'bg-yellow-500';
    if (strength === 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = () => {
    if (strength === 0) return t('strengthVeryWeak');
    if (strength === 1) return t('strengthWeak');
    if (strength === 2) return t('strengthFair');
    if (strength === 3) return t('strengthGood');
    if (strength === 4) return t('strengthStrong');
    return t('strengthExcellent');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError(t('passwordsDontMatch'));
      return;
    }

    if (!passwordValidation.valid) {
      setError(t('passwordRequirements'));
      return;
    }

    if (!acceptTerms) {
      setError(t('mustAcceptTerms'));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/portal/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // In dev, the API returns verificationUrl/devInboxFile so it's not "silent" when email isn't configured.
      setSuccessInfo({
        verificationUrl: data?.verificationUrl,
        emailDevInboxFile: data?.emailDevInboxFile,
        emailConfigured: data?.emailConfigured,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (successInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-gray-900">{t('accountCreated')}</h1>
          <p className="mt-2 text-gray-700">
            {t('checkEmail')}
          </p>

          {successInfo.emailConfigured === false ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {t('emailNotConfigured')}
            </div>
          ) : null}

          {successInfo.verificationUrl ? (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs font-semibold text-gray-700 mb-1">Verification link (dev)</div>
              <a className="text-sm text-green-700 break-all underline" href={successInfo.verificationUrl}>
                {successInfo.verificationUrl}
              </a>
            </div>
          ) : null}

          {successInfo.emailDevInboxFile ? (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs font-semibold text-gray-700 mb-1">Dev email inbox file</div>
              <div className="text-xs text-gray-700 break-all">{successInfo.emailDevInboxFile}</div>
            </div>
          ) : null}

          <Button className="mt-6" variant="primary" fullWidth onClick={() => router.push('/portal/login')}>
            {t('goToLogin')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <img
            src="/logos/Logo 1_Dark.svg"
            alt="Holi Labs"
            className="h-12 mx-auto mb-4"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600 mt-2">{t('subtitle')}</p>
        </div>

        {/* Registration Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('firstName')}
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                placeholder="María"
              />
              <Input
                label={t('lastName')}
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                placeholder="González"
              />
            </div>

            {/* Email */}
            <Input
              label={t('email')}
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="maria@ejemplo.com"
            />

            {/* Date of Birth */}
            <Input
              label={t('dateOfBirth')}
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              required
            />

            {/* Phone (Optional) */}
            <Input
              label={t('phone')}
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+52 55 1234 5678"
            />

            {/* Password */}
            <PasswordInput
              label={t('password')}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              placeholder="••••••••"
            />

            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">{t('strengthLabel')}</span>
                  <span className={`font-semibold ${
                    strength >= 4 ? 'text-green-600' :
                    strength >= 3 ? 'text-blue-600' :
                    strength >= 2 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {getStrengthLabel()}
                  </span>
                </div>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i < strength ? getStrengthColor() : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>

                {/* Password Requirements */}
                <div className="text-xs space-y-1 mt-3">
                  <div className={passwordErrors.includes('At least 8 characters') ? 'text-gray-400' : 'text-green-600'}>
                    {passwordErrors.includes('At least 8 characters') ? '○' : '✓'} {t('reqMinChars')}
                  </div>
                  <div className={passwordErrors.includes('One uppercase letter') ? 'text-gray-400' : 'text-green-600'}>
                    {passwordErrors.includes('One uppercase letter') ? '○' : '✓'} {t('reqUppercase')}
                  </div>
                  <div className={passwordErrors.includes('One lowercase letter') ? 'text-gray-400' : 'text-green-600'}>
                    {passwordErrors.includes('One lowercase letter') ? '○' : '✓'} {t('reqLowercase')}
                  </div>
                  <div className={passwordErrors.includes('One number') ? 'text-gray-400' : 'text-green-600'}>
                    {passwordErrors.includes('One number') ? '○' : '✓'} {t('reqNumber')}
                  </div>
                  <div className={passwordErrors.includes('One special character (@$!%*?&)') ? 'text-gray-400' : 'text-green-600'}>
                    {passwordErrors.includes('One special character (@$!%*?&)') ? '○' : '✓'} {t('reqSpecial')}
                  </div>
                </div>
              </div>
            )}

            {/* Confirm Password */}
            <PasswordInput
              label={t('confirmPassword')}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              placeholder="••••••••"
            />

            {/* Terms and Conditions */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="w-4 h-4 mt-1 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">
                {t('acceptTerms')}{' '}
                <a href="/terms" target="_blank" className="text-green-600 hover:underline">
                  {t('termsAndConditions')}
                </a>{' '}
                {t('and')}{' '}
                <a href="/privacy" target="_blank" className="text-green-600 hover:underline">
                  {t('privacyPolicy')}
                </a>
              </span>
            </label>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
            >
              {t('createAccountBtn')}
            </Button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {t('alreadyHaveAccount')}{' '}
              <a
                href="/portal/login"
                className="font-semibold text-green-600 hover:text-green-700"
              >
                {t('signIn')}
              </a>
            </p>
          </div>
        </div>

        {/* Security Badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{t('securityBadge')}</span>
        </div>
      </motion.div>
    </div>
  );
}
