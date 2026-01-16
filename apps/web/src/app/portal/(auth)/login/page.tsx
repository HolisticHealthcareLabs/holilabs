/**
 * Patient Portal Login Page - Simplified Password-First Authentication
 *
 * Features:
 * - Password authentication as primary method
 * - Magic link as alternative option
 * - Demo account quick access
 * - Remember Me functionality
 * - Account lockout handling
 * - Email verification check
 * - Clean, minimal UI (~300 lines)
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Input, PasswordInput } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LanguageSwitch } from '@/components/ui/LanguageSwitch';

export const dynamic = 'force-dynamic';

export default function PatientLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  type Lang = 'en' | 'es' | 'pt';
  const LANG_KEY = 'holilabs_language';
  const [lang, setLang] = useState<Lang>('en');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Check for URL parameters
  const urlError = searchParams?.get('error');
  const urlMessage = searchParams?.get('message');
  const verified = searchParams?.get('verified');

  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY) as Lang | null;
    if (saved && (saved === 'en' || saved === 'es' || saved === 'pt')) {
      setLang(saved);
    }
  }, []);

  const tr = (translations: Record<Lang, string>) => translations[lang];

  // Handle password login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/portal/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Redirect to portal dashboard
      router.push('/portal/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle magic link request
  const handleMagicLinkRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/portal/auth/magic-link/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setSuccessMessage(
        tr({
          en: 'Check your email for your magic link.',
          es: 'Revisa tu correo para el enlace mágico.',
          pt: 'Verifique seu e-mail para o link mágico.',
        })
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fill demo credentials
  const fillDemoCredentials = () => {
    setEmail('demo@holilabs.xyz');
    setPassword('Demo123!@#');
    setRememberMe(false);
    setShowMagicLink(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4 relative">
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitch />
      </div>

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
              // Fallback if logo doesn't exist yet
              e.currentTarget.style.display = 'none';
            }}
          />
          <h1 className="text-3xl font-bold text-gray-900">
            {tr({ en: 'Patient Portal', es: 'Portal de Paciente', pt: 'Portal do Paciente' })}
          </h1>
          <p className="text-gray-600 mt-2">
            {tr({
              en: 'Access your clinical history',
              es: 'Accede a tu historia clínica',
              pt: 'Acesse seu histórico clínico',
            })}
          </p>
        </div>

        {/* Separator */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-gradient-to-br from-green-50 via-white to-green-50 text-gray-500">
              {tr({
                en: 'Sign in with your account',
                es: 'Inicia sesión con tu cuenta',
                pt: 'Entre com sua conta',
              })}
            </span>
          </div>
        </div>

        {/* Demo Access Banner - BELOW separator as requested */}
        <div className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-900 mb-1">
                {tr({ en: 'Try the Demo', es: 'Prueba la Demostración', pt: 'Experimente a Demonstração' })}
              </p>
              <p className="text-xs text-blue-800 mb-3">
                {tr({
                  en: 'Explore HoliLabs with a demo patient account pre-loaded with sample data.',
                  es: 'Explora HoliLabs con una cuenta demo pre-cargada con historial médico completo.',
                  pt: 'Explore a HoliLabs com uma conta demo pré-carregada com dados de exemplo.',
                })}
              </p>
              <button
                type="button"
                onClick={fillDemoCredentials}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
              >
                {tr({ en: 'Load Demo Credentials', es: 'Cargar Credenciales Demo', pt: 'Carregar Credenciais Demo' })}
              </button>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Success Messages */}
          {verified && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {tr({
                en: 'Email verified successfully. Welcome to Holi Labs!',
                es: 'Email verificado exitosamente. Bienvenido a Holi Labs!',
                pt: 'E-mail verificado com sucesso. Bem-vindo(a) à Holi Labs!',
              })}
            </div>
          )}
          {urlMessage === 'already_verified' && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
              {tr({
                en: 'Your email is already verified. You can sign in.',
                es: 'Tu correo ya está verificado. Puedes iniciar sesión.',
                pt: 'Seu e-mail já está verificado. Você pode entrar.',
              })}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {successMessage}
            </div>
          )}

          {/* Error Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          {urlError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {urlError === 'invalid_verification_token' && 'Token de verificación inválido o expirado'}
              {urlError === 'verification_token_used' && 'Este token de verificación ya fue usado'}
              {urlError === 'verification_token_expired' && 'Token de verificación expirado. Solicita uno nuevo'}
              {urlError === 'verification_failed' && 'Error al verificar email. Intenta nuevamente'}
            </div>
          )}

          {!showMagicLink ? (
            // Password Login Form
            <form onSubmit={handlePasswordLogin}>
              <div className="space-y-4">
                <Input
                  label={tr({ en: 'Email address', es: 'Correo Electrónico', pt: 'E-mail' })}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder={tr({ en: 'you@email.com', es: 'tu@correo.com', pt: 'voce@email.com' })}
                />

                <PasswordInput
                  label={tr({ en: 'Password', es: 'Contraseña', pt: 'Senha' })}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-gray-700">
                      {tr({ en: 'Remember me', es: 'Recordarme', pt: 'Lembrar-me' })}
                    </span>
                  </label>

                  <a
                    href="/portal/forgot-password"
                    className="text-green-600 hover:text-green-700 font-medium"
                  >
                    {tr({
                      en: 'Forgot password?',
                      es: '¿Olvidaste tu contraseña?',
                      pt: 'Esqueceu sua senha?',
                    })}
                  </a>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  className="!from-green-600 !to-green-700 hover:!from-green-700 hover:!to-green-800"
                >
                  {tr({ en: 'Sign in', es: 'Iniciar Sesión', pt: 'Entrar' })}
                </Button>

                <button
                  type="button"
                  onClick={() => setShowMagicLink(true)}
                  className="w-full text-sm text-gray-600 hover:text-gray-900 py-2"
                >
                  {tr({
                    en: 'Prefer a magic link? →',
                    es: '¿Prefieres enlace mágico? →',
                    pt: 'Prefere link mágico? →',
                  })}
                </button>
              </div>
            </form>
          ) : (
            // Magic Link Form
            <form onSubmit={handleMagicLinkRequest}>
              <div className="space-y-4">
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                  {tr({
                    en: "We'll email you a secure link to sign in without a password.",
                    es: 'Te enviaremos un enlace seguro a tu correo para iniciar sesión sin contraseña.',
                    pt: 'Enviaremos um link seguro para seu e-mail para entrar sem senha.',
                  })}
                </div>

                <Input
                  label={tr({ en: 'Email address', es: 'Correo Electrónico', pt: 'E-mail' })}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder={tr({ en: 'you@email.com', es: 'tu@correo.com', pt: 'voce@email.com' })}
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  className="!from-green-600 !to-green-700 hover:!from-green-700 hover:!to-green-800"
                >
                  {tr({ en: 'Send magic link', es: 'Enviar Enlace Mágico', pt: 'Enviar link mágico' })}
                </Button>

                <button
                  type="button"
                  onClick={() => setShowMagicLink(false)}
                  className="w-full text-sm text-gray-600 hover:text-gray-900 py-2"
                >
                  {tr({ en: '← Back to password', es: '← Volver a contraseña', pt: '← Voltar para senha' })}
                </button>
              </div>
            </form>
          )}

          {/* Create Account Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {tr({ en: "Don't have an account?", es: '¿No tienes cuenta?', pt: 'Não tem conta?' })}{' '}
              <a
                href="/portal/register"
                className="font-semibold text-green-600 hover:text-green-700"
              >
                {tr({ en: 'Create account', es: 'Crear cuenta', pt: 'Criar conta' })}
              </a>
            </p>
          </div>
        </div>

        {/* Security Badges */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span>Cifrado end-to-end</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>HIPAA Compliant</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
