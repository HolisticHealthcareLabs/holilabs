/**
export const dynamic = 'force-dynamic';

 * Patient Login Page
 *
 * Industry-grade, bleeding-edge passwordless authentication
 * Features:
 * - Magic link login (primary method)
 * - SMS OTP backup (future)
 * - Smooth animations
 * - Clear error states
 * - Auto-focus and accessibility
 * - Mobile-optimized
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

type AuthMethod = 'email' | 'phone';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [devMagicLink, setDevMagicLink] = useState<string | null>(null);

  // Check for errors and timeout from URL params
  useEffect(() => {
    const errorParam = searchParams?.get('error');
    const timeoutParam = searchParams?.get('timeout');

    if (timeoutParam === 'true') {
      setError('⏰ Tu sesión expiró por inactividad. Por favor, inicia sesión de nuevo.');
    } else if (errorParam) {
      const errorMessages: Record<string, string> = {
        missing_token: 'Enlace inválido. Por favor, solicita uno nuevo.',
        invalid_link: 'El enlace ha expirado o es inválido.',
        server_error: 'Error del servidor. Por favor, intenta de nuevo.',
      };
      setError(errorMessages[errorParam] || 'Ha ocurrido un error.');
    }
  }, [searchParams]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/portal/auth/magic-link/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'No se pudo enviar el enlace.');
        setIsLoading(false);
        return;
      }

      // Capture dev magic link if provided
      if (data.devMode && data.magicLinkUrl) {
        setDevMagicLink(data.magicLinkUrl);
      }

      // Show success state
      setIsSuccess(true);
    } catch (err) {
      setError('Error de conexión. Por favor, verifica tu internet.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/portal/auth/otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'No se pudo enviar el código.');
        setIsLoading(false);
        return;
      }

      // Show OTP input
      setShowOtpInput(true);
      setIsLoading(false);
    } catch (err) {
      setError('Error de conexión. Por favor, verifica tu internet.');
      setIsLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/portal/auth/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, code: otpCode }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Código inválido.');
        setAttemptsLeft(data.attemptsLeft);
        setIsLoading(false);
        return;
      }

      // Redirect to dashboard
      router.push('/portal/dashboard');
    } catch (err) {
      setError('Error de conexión. Por favor, verifica tu internet.');
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-green-100 p-8">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center"
              >
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"
                  />
                </svg>
              </motion.div>
            </div>

            {/* Success Message */}
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
              ¡Revisa tu correo!
            </h2>
            <p className="text-gray-600 text-center mb-6">
              Te hemos enviado un enlace mágico a
              <br />
              <span className="font-semibold text-green-600">{email}</span>
            </p>

            {/* Instructions */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-green-600 font-bold">1</span>
                </div>
                <p className="text-sm text-gray-700">
                  Abre el correo que te acabamos de enviar
                </p>
              </div>
              <div className="flex items-start gap-3 mt-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-green-600 font-bold">2</span>
                </div>
                <p className="text-sm text-gray-700">
                  Haz clic en el botón "Iniciar Sesión de Forma Segura"
                </p>
              </div>
              <div className="flex items-start gap-3 mt-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-green-600 font-bold">3</span>
                </div>
                <p className="text-sm text-gray-700">
                  Serás redirigido automáticamente a tu portal
                </p>
              </div>
            </div>

            {/* Dev Mode Magic Link */}
            {devMagicLink && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2 mb-2">
                  <svg
                    className="w-5 h-5 text-yellow-600 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-yellow-900 mb-1">
                      🚀 Development Mode
                    </p>
                    <p className="text-xs text-yellow-800 mb-2">
                      Email service not configured. Use this direct login link:
                    </p>
                    <a
                      href={devMagicLink}
                      className="text-xs text-yellow-700 hover:text-yellow-900 underline break-all"
                    >
                      {devMagicLink}
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Security Note */}
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-3 mb-6">
              <svg
                className="w-4 h-4 text-green-500 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span>
                El enlace expira en <strong>15 minutos</strong> y solo puede usarse una vez por seguridad.
              </span>
            </div>

            {/* Actions */}
            <button
              onClick={() => {
                setIsSuccess(false);
                setEmail('');
              }}
              className="w-full text-sm text-green-600 hover:text-green-700 font-medium transition-colors"
            >
              ← Volver al inicio de sesión
            </button>
          </div>

          {/* Tip */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center mt-6"
          >
            <p className="text-sm text-gray-600">
              💡 <strong>Tip:</strong> Revisa tu carpeta de spam si no ves el correo en 1-2 minutos
            </p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-3xl">🌿</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
            Holi Labs
          </h1>
          <p className="text-gray-600 mt-2">Portal de Paciente</p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white rounded-2xl shadow-xl border border-green-100 p-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Inicia sesión sin contraseña
          </h2>
          <p className="text-gray-600 mb-6">
            Elige tu método preferido de autenticación.
          </p>

          {/* Auth Method Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => {
                setAuthMethod('email');
                setError(null);
                setShowOtpInput(false);
              }}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                authMethod === 'email'
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📧 Correo
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMethod('phone');
                setError(null);
                setIsSuccess(false);
              }}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                authMethod === 'phone'
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📱 SMS
            </button>
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
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
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
                  <div className="flex-1">
                    <p className="text-sm text-red-700">{error}</p>
                    {attemptsLeft !== null && (
                      <p className="text-xs text-red-600 mt-1">
                        {attemptsLeft} intentos restantes
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email Login Form */}
          {authMethod === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                  autoFocus
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-gray-900"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
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
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
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
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <span>Enviar enlace mágico</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Phone/OTP Login Form */}
          {authMethod === 'phone' && !showOtpInput && (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Número de teléfono
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+52 55 1234 5678"
                  required
                  autoFocus
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Incluye código de país (ej: +52 para México)
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading || !phone}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
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
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
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
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    <span>Enviar código por SMS</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* OTP Verification Form */}
          {authMethod === 'phone' && showOtpInput && (
            <form onSubmit={handleOtpVerify} className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700">
                  📱 Código enviado a: <span className="font-semibold">{phone}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setShowOtpInput(false)}
                  className="text-xs text-green-600 hover:text-green-700 mt-1"
                >
                  Cambiar número
                </button>
              </div>

              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                  Código de verificación
                </label>
                <input
                  id="otp"
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  required
                  autoFocus
                  disabled={isLoading}
                  maxLength={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 text-center text-2xl tracking-widest font-mono"
                />
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Válido por 10 minutos
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading || otpCode.length !== 6}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
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
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
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
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>Verificar código</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handlePhoneSubmit}
                disabled={isLoading}
                className="w-full text-sm text-green-600 hover:text-green-700 font-medium transition-colors disabled:opacity-50"
              >
                ¿No recibiste el código? Reenviar
              </button>
            </form>
          )}

          {/* Security Features */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs font-semibold text-gray-700 mb-3">
              🔒 Tu seguridad es nuestra prioridad:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-xs text-gray-600">Sin contraseñas</span>
              </div>
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-xs text-gray-600">Cifrado end-to-end</span>
              </div>
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-xs text-gray-600">HIPAA compliant</span>
              </div>
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-xs text-gray-600">Enlace de un solo uso</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-8"
        >
          <p className="text-sm text-gray-600">
            ¿No tienes una cuenta?{' '}
            <a href="/contact" className="text-green-600 hover:text-green-700 font-medium">
              Contáctanos
            </a>
          </p>
          <p className="text-xs text-gray-500 mt-4">
            Al iniciar sesión, aceptas nuestros{' '}
            <a href="/terms" className="text-green-600 hover:underline">
              Términos de Servicio
            </a>{' '}
            y{' '}
            <a href="/privacy" className="text-green-600 hover:underline">
              Política de Privacidad
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function PatientLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
          <div className="flex justify-center">
            <svg
              className="animate-spin h-10 w-10 text-green-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
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
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
