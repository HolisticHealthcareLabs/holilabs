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
import { Input, PasswordInput } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { validatePassword } from '@/lib/auth/password-validation';

export default function PatientRegisterPage() {
  const router = useRouter();
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
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    // Validate password strength
    if (!passwordValidation.valid) {
      setError('La contraseña debe cumplir todos los requisitos');
      return;
    }

    // Validate terms acceptance
    if (!acceptTerms) {
      setError('Debes aceptar los términos y condiciones');
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

      // Show success message and redirect to login
      alert('¡Cuenta creada exitosamente! Revisa tu correo para verificar tu cuenta.');
      router.push('/portal/login');
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
          <h1 className="text-3xl font-bold text-gray-900">Crear Cuenta</h1>
          <p className="text-gray-600 mt-2">Únete a Holi Labs</p>
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
                label="Nombre"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                placeholder="María"
              />
              <Input
                label="Apellido"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                placeholder="González"
              />
            </div>

            {/* Email */}
            <Input
              label="Correo Electrónico"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="maria@ejemplo.com"
            />

            {/* Date of Birth */}
            <Input
              label="Fecha de Nacimiento"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              required
            />

            {/* Phone (Optional) */}
            <Input
              label="Teléfono (opcional)"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+52 55 1234 5678"
            />

            {/* Password */}
            <PasswordInput
              label="Contraseña"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              placeholder="••••••••"
            />

            {/* Password Strength Indicator */}
            {formData.password && (
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
              label="Confirmar Contraseña"
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
                Acepto los{' '}
                <a href="/terms" target="_blank" className="text-green-600 hover:underline">
                  términos y condiciones
                </a>{' '}
                y la{' '}
                <a href="/privacy" target="_blank" className="text-green-600 hover:underline">
                  política de privacidad
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
              Crear Cuenta
            </Button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ¿Ya tienes cuenta?{' '}
              <a
                href="/portal/login"
                className="font-semibold text-green-600 hover:text-green-700"
              >
                Inicia sesión
              </a>
            </p>
          </div>
        </div>

        {/* Security Badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Tus datos están protegidos con cifrado HIPAA</span>
        </div>
      </motion.div>
    </div>
  );
}
