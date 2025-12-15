/**
 * Patient Portal Settings Page
 *
 * Features:
 * - Profile information
 * - Privacy & security settings
 * - GDPR data export
 * - Account preferences
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import WhatsAppConsentSection from '@/components/portal/WhatsAppConsentSection';

export default function SettingsPage() {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExportData = async () => {
    setIsExporting(true);
    setExportError(null);
    setExportSuccess(false);

    try {
      const response = await fetch('/api/portal/export', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      // Get the filename from headers
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : 'patient-data-export.json';

      // Convert response to blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 5000);
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : 'Failed to export data'
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-blue-600 mb-4 transition-colors"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <span className="text-4xl">⚙️</span>
            <span>Configuración</span>
          </h1>
          {/* Decorative - low contrast intentional for page description */}
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Administra tu información personal, privacidad y preferencias
          </p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Profile Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Información Personal
              </h2>
              {/* Decorative - low contrast intentional for profile info helper text */}
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Para actualizar tu información personal, por favor contacta a nuestro equipo de soporte.
              </p>
              <a
                href="mailto:support@holilabs.com"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contactar Soporte
              </a>
            </div>
          </motion.div>

          {/* Privacy & Security */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Privacidad y Seguridad
              </h2>

              {/* Multi-factor Authentication */}
              <div className="mb-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      Autenticación de Dos Factores (2FA)
                    </h3>
                    {/* Decorative - low contrast intentional for 2FA description */}
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Protege tu cuenta con verificación por SMS o correo electrónico
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      Activo
                    </span>
                  </div>
                </div>
              </div>

              {/* Session Management */}
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      Sesiones Activas
                    </h3>
                    {/* Decorative - low contrast intentional for session management description */}
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Administra los dispositivos donde has iniciado sesión
                    </p>
                  </div>
                  <button className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
                    Ver Sesiones
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* WhatsApp Adherence Monitoring Consent */}
          <WhatsAppConsentSection />

          {/* GDPR Data Export */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Exportar Mis Datos (GDPR)
                  </h2>
                  {/* Decorative - low contrast intentional for GDPR description */}
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    De acuerdo con el Artículo 20 del GDPR, tienes derecho a recibir una copia de todos tus datos personales en un formato estructurado y legible por máquina.
                  </p>

                  {/* What's Included */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Tu exportación incluirá:
                    </p>
                    <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Información personal y de contacto
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Historial de citas y consultas
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Medicamentos y prescripciones
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Resultados de laboratorio
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Documentos médicos (metadatos)
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Registro de auditoría (últimos 100 accesos)
                      </li>
                    </ul>
                  </div>

                  {/* Export Button */}
                  <button
                    onClick={handleExportData}
                    disabled={isExporting}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {isExporting ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Exportando datos...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                        </svg>
                        <span>Descargar Mis Datos (JSON)</span>
                      </>
                    )}
                  </button>

                  {/* Success Message */}
                  {exportSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start gap-3"
                    >
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-green-900 dark:text-green-300">
                          ¡Exportación exitosa!
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                          Tu archivo ha sido descargado. Revisa tu carpeta de descargas.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Error Message */}
                  {exportError && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3"
                    >
                      <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-red-900 dark:text-red-300">
                          Error al exportar datos
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                          {exportError}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Privacy Note */}
                  {/* Decorative - low contrast intentional for privacy note helper text */}
                  <div className="mt-4 flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span>
                      Tu archivo se descarga directamente en tu dispositivo. No se almacena en ningún servidor. Esta acción queda registrada en tu registro de auditoría por seguridad.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Account Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-200 dark:border-red-800"
          >
            <div className="p-6">
              <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">
                Zona de Peligro
              </h2>
              <div className="space-y-4">
                <div className="flex items-start justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      Cerrar Cuenta
                    </h3>
                    {/* Decorative - low contrast intentional for account deletion warning */}
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Eliminar permanentemente tu cuenta y todos tus datos. Esta acción no se puede deshacer.
                    </p>
                  </div>
                  <button className="ml-4 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-600 rounded-lg font-medium transition-colors">
                    Cerrar Cuenta
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
