/**
 * Patient Forgot Password Page
 *
 * Features:
 * - Email-based password reset request
 * - Rate limiting protection (3 requests per hour)
 * - User-friendly error messages
 * - Success confirmation
 * - Back to login link
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function PatientForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          userType: 'PATIENT',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900">¿Olvidaste tu contraseña?</h1>
          <p className="text-gray-600 mt-2">
            Te enviaremos un enlace para restablecer tu contraseña
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
                ¡Correo enviado!
              </h2>

              <p className="text-gray-600 mb-6">
                Si existe una cuenta con el correo <strong>{email}</strong>, recibirás instrucciones para restablecer tu contraseña.
              </p>

              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm text-left">
                <p className="font-semibold mb-1">📧 Revisa tu bandeja de entrada</p>
                <p className="text-xs">
                  El correo puede tardar unos minutos en llegar. No olvides revisar tu carpeta de spam.
                </p>
              </div>

              <button
                onClick={() => router.push('/portal/login')}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Volver al inicio de sesión
              </button>
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
                <Input
                  label="Correo Electrónico"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="tu@correo.com"
                  helperText="Ingresa el correo asociado a tu cuenta"
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                >
                  Enviar enlace de restablecimiento
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
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>El enlace de restablecimiento expira en 1 hora</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
