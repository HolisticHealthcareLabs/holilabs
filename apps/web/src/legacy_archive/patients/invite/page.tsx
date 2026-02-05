'use client';
export const dynamic = 'force-dynamic';


/**
 * Patient Invitation System
 * Send secure invitations to patients for portal access
 *
 * Features:
 * - Email/SMS invitations
 * - WhatsApp invitations
 * - Invitation tracking
 * - Consent management
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InvitePatientPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    sendMethod: 'email', // 'email', 'sms', 'whatsapp', 'all'
    includePortalAccess: true,
    message: '',
  });

  // Get current user ID on mount
  // Note: Supabase auth removed - using NextAuth session instead
  useEffect(() => {
    // TODO: Replace with NextAuth session
    // For now, set a placeholder to prevent errors
    setCurrentUserId('demo-user-id');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Validate current user is set
      if (!currentUserId) {
        throw new Error('No se pudo obtener información del usuario actual');
      }

      // Create patient
      const patientRes = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          ageBand: '30-40', // Default
          gender: 'OTHER',
          assignedClinicianId: currentUserId, // CRITICAL: Assign patient to current clinician
        }),
      });

      const patientData = await patientRes.json();

      if (!patientData.success) {
        throw new Error(patientData.error || 'Error al crear paciente');
      }

      const patient = patientData.data;

      // Send invitation
      const channels: string[] = formData.sendMethod === 'all'
        ? ['email', 'sms', 'whatsapp']
        : [formData.sendMethod];

      const inviteRes = await fetch('/api/patients/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          channels,
          customMessage: formData.message,
          includePortalAccess: formData.includePortalAccess,
        }),
      });

      const inviteData = await inviteRes.json();

      if (inviteData.success) {
        setSuccessMessage(`✅ Invitación enviada a ${formData.firstName} ${formData.lastName}`);

        // Reset form
        setTimeout(() => {
          router.push('/dashboard/patients');
        }, 2000);
      } else {
        throw new Error(inviteData.error || 'Error al enviar invitación');
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Error al procesar solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900 transition"
            >
              ← Volver
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Invitar Paciente</h1>
              <p className="text-sm text-gray-600 mt-1">
                Envía una invitación segura para acceso al portal
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {errorMessage}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Patient Info */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Información del Paciente
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="María"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Apellidos <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="González García"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="maria@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="+52 55 1234 5678"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Formato internacional (ej. +52...)
                  </p>
                </div>
              </div>
            </div>

            {/* Delivery Method */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Método de Envío
              </h2>

              <div className="space-y-3">
                <label className="flex items-center space-x-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="radio"
                    name="sendMethod"
                    value="email"
                    checked={formData.sendMethod === 'email'}
                    onChange={(e) => setFormData({ ...formData, sendMethod: e.target.value })}
                    className="w-5 h-5 text-primary"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">📧</span>
                      <span className="font-medium text-gray-900">Email</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Enviar invitación por correo electrónico
                    </p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="radio"
                    name="sendMethod"
                    value="whatsapp"
                    checked={formData.sendMethod === 'whatsapp'}
                    onChange={(e) => setFormData({ ...formData, sendMethod: e.target.value })}
                    className="w-5 h-5 text-primary"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">📱</span>
                      <span className="font-medium text-gray-900">WhatsApp</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Enviar invitación por WhatsApp (requiere configuración)
                    </p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="radio"
                    name="sendMethod"
                    value="sms"
                    checked={formData.sendMethod === 'sms'}
                    onChange={(e) => setFormData({ ...formData, sendMethod: e.target.value })}
                    className="w-5 h-5 text-primary"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">💬</span>
                      <span className="font-medium text-gray-900">SMS</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Enviar invitación por mensaje de texto
                    </p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 p-4 border border-primary rounded-lg cursor-pointer bg-primary/5 transition">
                  <input
                    type="radio"
                    name="sendMethod"
                    value="all"
                    checked={formData.sendMethod === 'all'}
                    onChange={(e) => setFormData({ ...formData, sendMethod: e.target.value })}
                    className="w-5 h-5 text-primary"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">🚀</span>
                      <span className="font-medium text-gray-900">Todos los canales</span>
                      <span className="text-xs bg-primary text-white px-2 py-1 rounded-full">
                        Recomendado
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Enviar por Email, WhatsApp y SMS para mejor alcance
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Options */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Opciones</h2>

              <label className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.includePortalAccess}
                  onChange={(e) =>
                    setFormData({ ...formData, includePortalAccess: e.target.checked })
                  }
                  className="w-5 h-5 text-primary mt-1"
                />
                <div>
                  <span className="font-medium text-gray-900">
                    Incluir acceso al portal de pacientes
                  </span>
                  <p className="text-sm text-gray-600 mt-1">
                    El paciente recibirá un enlace para crear su cuenta y acceder a su historia
                    clínica
                  </p>
                </div>
              </label>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensaje personalizado (opcional)
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Hola María, te invito a unirte al portal de pacientes de Holi Labs donde podrás..."
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 text-gray-700 hover:text-gray-900 font-medium transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !currentUserId}
                className={`px-8 py-3 bg-gradient-to-r from-primary to-purple-700 text-white font-semibold rounded-lg transition-all ${
                  isSubmitting || !currentUserId
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:shadow-lg hover:scale-105'
                }`}
              >
                {!currentUserId ? 'Cargando...' : isSubmitting ? 'Enviando...' : 'Enviar Invitación'}
              </button>
            </div>
          </form>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">
            ℹ️ ¿Cómo funciona la invitación?
          </h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li className="flex items-start space-x-2">
              <span className="mt-1">1.</span>
              <span>El paciente recibe un enlace seguro de invitación</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="mt-1">2.</span>
              <span>Crea su cuenta en el portal con su email o teléfono</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="mt-1">3.</span>
              <span>Acepta el consentimiento informado (HIPAA compliant)</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="mt-1">4.</span>
              <span>Accede a su historia clínica, citas y recetas</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
