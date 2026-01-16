/**
 * Patient Reset Password Page
 *
 * Features:
 * - Token-based password reset
 * - Password complexity validation
 * - Password strength indicator
 * - Token expiration handling
 * - Success redirect to login
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { PasswordInput } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { validatePassword } from '@/lib/auth/password-validation';

export default function PatientResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Password validation
  const passwordValidation = validatePassword(password);
  const { strength, errors: passwordErrors } = passwordValidation;

  useEffect(() => {
    if (!token) {
      setError('Token de restablecimiento inválido');
    }
  }, [token]);

  const getStrengthColor = () => {
    if (strength <= 1) return 'bg-red-500';
    if (strength === 2) return 'bg-orange-500';
    if (strength === 3) return 'bg-yellow-500';
    if (strength === 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = () => {
    if (strength === 0) return 'Muy Débil';
    if (strength === 1) return 'Débil';
    if (strength === 2) return 'Aceptable';
    if (strength === 3) return 'Buena';
    if (strength === 4) return 'Fuerte';
    return 'Excelente';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    // Validate password strength
    if (!passwordValidation.valid) {
      setError('La contraseña debe cumplir todos los requisitos');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword: password,
          userType: 'PATIENT',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/portal/login?message=password_reset_success');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Enlace inválido
          </h2>
          <p className="text-gray-600 mb-6">
            El enlace de restablecimiento es inválido o ha expirado.
          </p>
          <button
            onClick={() => router.push('/portal/forgot-password')}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Solicitar nuevo enlace
          </button>
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
          <h1 className="text-3xl font-bold text-gray-900">Restablecer Contraseña</h1>
          <p className="text-gray-600 mt-2">
            Crea una nueva contraseña segura
          </p>
        </div>

        {/* Reset Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {success ? (
            // Success State
            <div className="text-center">
              <div className="mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-2">
                ¡Contraseña restablecida!
              </h2>

              <p className="text-gray-600 mb-6">
                Tu contraseña ha sido actualizada exitosamente.
              </p>

              <p className="text-sm text-gray-500">
                Redirigiendo al inicio de sesión...
              </p>
            </div>
          ) : (
            // Form State
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New Password */}
                <PasswordInput
                  label="Nueva Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  placeholder="••••••••"
                />

                {/* Password Strength Indicator */}
                {password && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Seguridad:</span>
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
                        {passwordErrors.includes('At least 8 characters') ? '○' : '✓'} Mínimo 8 caracteres
                      </div>
                      <div className={passwordErrors.includes('One uppercase letter') ? 'text-gray-400' : 'text-green-600'}>
                        {passwordErrors.includes('One uppercase letter') ? '○' : '✓'} Una letra mayúscula
                      </div>
                      <div className={passwordErrors.includes('One lowercase letter') ? 'text-gray-400' : 'text-green-600'}>
                        {passwordErrors.includes('One lowercase letter') ? '○' : '✓'} Una letra minúscula
                      </div>
                      <div className={passwordErrors.includes('One number') ? 'text-gray-400' : 'text-green-600'}>
                        {passwordErrors.includes('One number') ? '○' : '✓'} Un número
                      </div>
                      <div className={passwordErrors.includes('One special character (@$!%*?&)') ? 'text-gray-400' : 'text-green-600'}>
                        {passwordErrors.includes('One special character (@$!%*?&)') ? '○' : '✓'} Un carácter especial (@$!%*?&)
                      </div>
                    </div>
                  </div>
                )}

                {/* Confirm Password */}
                <PasswordInput
                  label="Confirmar Nueva Contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                >
                  Restablecer Contraseña
                </Button>
              </form>

              {/* Back to Login */}
              <div className="mt-6 text-center">
                <button
                  onClick={() => router.push('/portal/login')}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  ← Volver al inicio de sesión
                </button>
              </div>
            </>
          )}
        </div>

        {/* Security Info */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span>Todas las sesiones anteriores serán cerradas por seguridad</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
