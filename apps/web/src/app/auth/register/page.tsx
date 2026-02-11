/**
 * Clinician Registration Page
 *
 * Allows new clinicians to request access to the system
 */

'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { validatePassword } from '@/lib/auth/password-validation';

export default function ClinicianRegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'doctor',
    organization: '',
    reason: '',
    licenseCountry: 'BR',
    licenseNumber: '',
    licenseState: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [devInboxFile, setDevInboxFile] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'failed' | null>(null);
  const [enableDemoMode, setEnableDemoMode] = useState(false);

  useEffect(() => {
    // Only show Google OAuth if the provider is actually configured in NextAuth.
    fetch('/api/auth/providers')
      .then((r) => (r.ok ? r.json() : {}))
      .then((providers: any) => setGoogleEnabled(!!providers?.google))
      .catch(() => setGoogleEnabled(false));
  }, []);

  const passwordValidation = validatePassword(formData.password);
  const { strength, errors: passwordErrors } = passwordValidation;

  const getStrengthColor = () => {
    if (strength <= 1) return 'bg-red-500';
    if (strength === 2) return 'bg-orange-500';
    if (strength === 3) return 'bg-yellow-500';
    if (strength === 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (!passwordValidation.valid) {
      setError('Password must meet all requirements');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          enableDemoMode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.details
          ? `${data.error}: ${data.details}`
          : data.error || 'Registration failed. Please try again.';
        setError(errorMsg);
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setSuccessMessage(data?.message || 'Account created successfully. Please check your email.');
      setDevInboxFile(typeof data?.emailDevInboxFile === 'string' ? data.emailDevInboxFile : null);
      const callbackUrl = searchParams?.get('callbackUrl');
      const loginHref = callbackUrl
        ? `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
        : '/auth/login';
      setTimeout(() => router.push(loginHref), 3000);
    } catch (err) {
      setError('Connection error. Please check your internet.');
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4 relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.05),transparent_50%),radial-gradient(circle_at_70%_60%,rgba(59,130,246,0.05),transparent_50%)] pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8 text-center"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Account Created</h2>
          <p className="text-gray-600 mb-6">
            {successMessage || 'Your account is ready. Please check your email for next steps.'}
          </p>
          {devInboxFile ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left">
              <div className="text-xs font-semibold text-amber-800">Dev mode email inbox</div>
              <div className="mt-1 text-xs text-amber-800 break-all">
                {devInboxFile}
              </div>
              <div className="mt-2 text-xs text-amber-700">
                If you didn’t receive an email, open the file above (written locally by the app).
              </div>
            </div>
          ) : null}
          <p className="text-sm text-gray-500">Redirecting to login...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.05),transparent_50%),radial-gradient(circle_at_70%_60%,rgba(59,130,246,0.05),transparent_50%)] pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-6 sm:mb-8"
        >
          <div className="inline-flex items-center justify-center mb-4">
            <div className="relative w-12 h-12 sm:w-16 sm:h-16">
              <Image
                src="/logos/Logo 1_Dark.svg"
                alt="Holi Labs"
                width={64}
                height={64}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
            Holi Labs
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-xs sm:text-sm">Clinician Portal</p>
        </motion.div>

        {/* Registration Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 sm:p-8"
        >
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Request Access
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4 sm:mb-6 text-sm sm:text-base">
            Create a new clinician profile
          </p>

          {/* Google Sign Up Button (only if provider is configured) */}
          {googleEnabled && (
            <button
              type="button"
              onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
              className="w-full mb-4 sm:mb-6 flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all font-medium text-gray-700 dark:text-gray-200"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="truncate">Sign up with Google</span>
            </button>
          )}

          <div className="relative mb-4 sm:mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-xs sm:text-sm">
              <span className="px-3 sm:px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or continue with email</span>
            </div>
          </div>

          {/* Error Alert */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mb-4"
              >
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
                  <svg
                    className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-xs sm:text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="registration-form space-y-3 sm:space-y-4">
            {/* Demo Mode Option (moved to top for visibility) - enforced light mode styling */}
            <div
              className="rounded-xl p-4 sm:p-5 space-y-3 border-2"
              style={{
                background: 'linear-gradient(to bottom right, rgb(239 246 255), rgb(238 242 255))',
                borderColor: 'rgb(191 219 254)',
              }}
            >
              <label className="flex items-start gap-3 sm:gap-4 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={enableDemoMode}
                  onChange={(e) => setEnableDemoMode(e.target.checked)}
                  disabled={isLoading}
                  className="mt-0.5 sm:mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-sm sm:text-base" style={{ color: 'rgb(30 58 138)' }}>
                      Start with Demo Mode
                    </span>
                    <span className="px-2 py-0.5 bg-blue-500 text-white text-[10px] sm:text-xs font-bold rounded-full whitespace-nowrap">
                      QUICK START
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'rgb(30 64 175)' }}>
                    Get started immediately with 10 pre-loaded sample patients. Perfect for exploring the platform&apos;s features. You can disable this later or add real patients at any time.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
                    <span className="px-2 py-1 bg-white/80 text-[10px] sm:text-xs rounded border" style={{ color: 'rgb(30 64 175)', borderColor: 'rgb(191 219 254)' }}>
                      ✨ Instant setup
                    </span>
                    <span className="px-2 py-1 bg-white/80 text-[10px] sm:text-xs rounded border" style={{ color: 'rgb(30 64 175)', borderColor: 'rgb(191 219 254)' }}>
                      🎯 Full features
                    </span>
                    <span className="px-2 py-1 bg-white/80 text-[10px] sm:text-xs rounded border" style={{ color: 'rgb(30 64 175)', borderColor: 'rgb(191 219 254)' }}>
                      🔄 Reversible
                    </span>
                  </div>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="doctor@hospital.com"
                required
                disabled={isLoading}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white bg-white dark:bg-gray-700"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-11 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="space-y-2">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i < strength ? getStrengthColor() : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-xs space-y-1">
                  <div className={passwordErrors.includes('At least 8 characters') ? 'text-gray-400 dark:text-gray-500' : 'text-green-600 dark:text-green-400'}>
                    {passwordErrors.includes('At least 8 characters') ? '○' : '✓'} At least 8 characters
                  </div>
                  <div className={passwordErrors.includes('One uppercase letter') ? 'text-gray-400 dark:text-gray-500' : 'text-green-600 dark:text-green-400'}>
                    {passwordErrors.includes('One uppercase letter') ? '○' : '✓'} One uppercase letter
                  </div>
                  <div className={passwordErrors.includes('One lowercase letter') ? 'text-gray-400 dark:text-gray-500' : 'text-green-600 dark:text-green-400'}>
                    {passwordErrors.includes('One lowercase letter') ? '○' : '✓'} One lowercase letter
                  </div>
                  <div className={passwordErrors.includes('One number') ? 'text-gray-400 dark:text-gray-500' : 'text-green-600 dark:text-green-400'}>
                    {passwordErrors.includes('One number') ? '○' : '✓'} One number
                  </div>
                  <div className={passwordErrors.includes('One special character (@$!%*?&)') ? 'text-gray-400 dark:text-gray-500' : 'text-green-600 dark:text-green-400'}>
                    {passwordErrors.includes('One special character (@$!%*?&)') ? '○' : '✓'} One special character
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-11 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                Role
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white bg-white dark:bg-gray-700"
              >
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
                <option value="staff">Staff</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            {/* Medical License Section */}
            {formData.role === 'doctor' && (
              <>
                <div className="col-span-2 border-t border-gray-200 dark:border-gray-700 pt-3 sm:pt-4 mt-2">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Medical License Verification</h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-3 sm:mb-4">
                    Your medical license will be automatically verified with official medical boards.
                  </p>
                </div>

                <div>
                  <label htmlFor="licenseCountry" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    Country <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <select
                    id="licenseCountry"
                    name="licenseCountry"
                    value={formData.licenseCountry}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  >
                    <option value="BR">Brazil (Brasil)</option>
                    <option value="AR">Argentina</option>
                    <option value="US">United States</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="licenseState" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    {formData.licenseCountry === 'BR' && 'State (UF) '}
                    {formData.licenseCountry === 'AR' && 'Province '}
                    {formData.licenseCountry === 'US' && 'State '}
                    <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  {formData.licenseCountry === 'BR' && (
                    <select
                      id="licenseState"
                      name="licenseState"
                      value={formData.licenseState}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                    >
                      <option value="">Select State...</option>
                      <option value="AC">Acre (AC)</option>
                      <option value="AL">Alagoas (AL)</option>
                      <option value="AP">Amapá (AP)</option>
                      <option value="AM">Amazonas (AM)</option>
                      <option value="BA">Bahia (BA)</option>
                      <option value="CE">Ceará (CE)</option>
                      <option value="DF">Distrito Federal (DF)</option>
                      <option value="ES">Espírito Santo (ES)</option>
                      <option value="GO">Goiás (GO)</option>
                      <option value="MA">Maranhão (MA)</option>
                      <option value="MT">Mato Grosso (MT)</option>
                      <option value="MS">Mato Grosso do Sul (MS)</option>
                      <option value="MG">Minas Gerais (MG)</option>
                      <option value="PA">Pará (PA)</option>
                      <option value="PB">Paraíba (PB)</option>
                      <option value="PR">Paraná (PR)</option>
                      <option value="PE">Pernambuco (PE)</option>
                      <option value="PI">Piauí (PI)</option>
                      <option value="RJ">Rio de Janeiro (RJ)</option>
                      <option value="RN">Rio Grande do Norte (RN)</option>
                      <option value="RS">Rio Grande do Sul (RS)</option>
                      <option value="RO">Rondônia (RO)</option>
                      <option value="RR">Roraima (RR)</option>
                      <option value="SC">Santa Catarina (SC)</option>
                      <option value="SP">São Paulo (SP)</option>
                      <option value="SE">Sergipe (SE)</option>
                      <option value="TO">Tocantins (TO)</option>
                    </select>
                  )}
                  {formData.licenseCountry === 'AR' && (
                    <select
                      id="licenseState"
                      name="licenseState"
                      value={formData.licenseState}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                    >
                      <option value="">Select Province...</option>
                      <option value="Buenos Aires">Buenos Aires</option>
                      <option value="Catamarca">Catamarca</option>
                      <option value="Chaco">Chaco</option>
                      <option value="Chubut">Chubut</option>
                      <option value="Córdoba">Córdoba</option>
                      <option value="Corrientes">Corrientes</option>
                      <option value="Entre Ríos">Entre Ríos</option>
                      <option value="Formosa">Formosa</option>
                      <option value="Jujuy">Jujuy</option>
                      <option value="La Pampa">La Pampa</option>
                      <option value="La Rioja">La Rioja</option>
                      <option value="Mendoza">Mendoza</option>
                      <option value="Misiones">Misiones</option>
                      <option value="Neuquén">Neuquén</option>
                      <option value="Río Negro">Río Negro</option>
                      <option value="Salta">Salta</option>
                      <option value="San Juan">San Juan</option>
                      <option value="San Luis">San Luis</option>
                      <option value="Santa Cruz">Santa Cruz</option>
                      <option value="Santa Fe">Santa Fe</option>
                      <option value="Santiago del Estero">Santiago del Estero</option>
                      <option value="Tierra del Fuego">Tierra del Fuego</option>
                      <option value="Tucumán">Tucumán</option>
                      <option value="CABA">Ciudad Autónoma de Buenos Aires (CABA)</option>
                    </select>
                  )}
                  {formData.licenseCountry === 'US' && (
                    <input
                      id="licenseState"
                      name="licenseState"
                      type="text"
                      value={formData.licenseState}
                      onChange={handleChange}
                      placeholder="e.g., California, New York"
                      required
                      disabled={isLoading}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                    />
                  )}
                </div>

                <div className="col-span-2">
                  <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    Medical License Number <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <input
                    id="licenseNumber"
                    name="licenseNumber"
                    type="text"
                    value={formData.licenseNumber}
                    onChange={handleChange}
                    placeholder={
                      formData.licenseCountry === 'BR' ? 'CRM Number (e.g., 123456)' :
                      formData.licenseCountry === 'AR' ? 'Matrícula Number' :
                      'License Number'
                    }
                    required
                    disabled={isLoading}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                  <p className="mt-1.5 sm:mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {formData.licenseCountry === 'BR' && 'Enter your CRM number. Will be verified with CFM/CRM database.'}
                    {formData.licenseCountry === 'AR' && 'Enter your Matrícula number. Will be verified with CONFEMED.'}
                    {formData.licenseCountry === 'US' && 'Enter your NPI or State License number. Will be verified with NPPES.'}
                  </p>
                  {verificationStatus === 'verified' && (
                    <div className="mt-1.5 sm:mt-2 flex items-center gap-2 text-green-600 dark:text-green-400 text-xs sm:text-sm">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium">License verified successfully!</span>
                    </div>
                  )}
                  {verificationStatus === 'failed' && (
                    <div className="mt-1.5 sm:mt-2 flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs sm:text-sm">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium">Automatic verification pending. Manual review required.</span>
                    </div>
                  )}
                </div>
              </>
            )}

            <div>
              <label htmlFor="organization" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                Organization
              </label>
              <input
                id="organization"
                name="organization"
                type="text"
                value={formData.organization}
                onChange={handleChange}
                placeholder="Hospital or Clinic Name"
                required
                disabled={isLoading}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white bg-white dark:bg-gray-700"
              />
            </div>

            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                Reason for Access
              </label>
              <textarea
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                placeholder="Briefly describe why you need access..."
                rows={3}
                required
                disabled={isLoading}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white bg-white dark:bg-gray-700 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-2.5 sm:py-3 px-5 sm:px-6 text-sm sm:text-base rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? 'Submitting...' : 'Request Access'}
            </button>
          </form>

          {/* Back to Login */}
          <div className="back-to-login-link mt-4 sm:mt-6 text-center">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-6 sm:mt-8"
        >
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            Need help?{' '}
            <a href="/contact" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
              Contact Support
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
