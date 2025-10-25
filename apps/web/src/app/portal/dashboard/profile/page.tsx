'use client';
export const dynamic = 'force-dynamic';


/**
 * Patient Profile & Settings Page
 * View and manage personal information and preferences
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronLeftIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  IdentificationIcon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';

interface PatientProfile {
  patient: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    email: string | null;
    phone: string | null;
  };
  user: {
    email: string;
    emailVerifiedAt: string | null;
    phoneVerifiedAt: string | null;
    lastLoginAt: string | null;
  };
}

interface SessionResponse {
  success: boolean;
  session?: any;
  patient?: PatientProfile['patient'];
  error?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/portal/auth/session');
      const data: SessionResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar perfil');
      }

      if (data.success && data.patient) {
        setProfile({
          patient: data.patient,
          user: {
            email: data.session?.email || '',
            emailVerifiedAt: data.session?.emailVerifiedAt || null,
            phoneVerifiedAt: null,
            lastLoginAt: null,
          },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm('�Est�s seguro de que deseas cerrar sesi�n?')) {
      return;
    }

    try {
      setLoggingOut(true);

      const response = await fetch('/api/portal/auth/logout', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Error al cerrar sesi�n');
      }

      // Redirect to login
      router.push('/portal/login');
    } catch (err) {
      alert('Error al cerrar sesi�n');
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push('/portal/dashboard')}
            className="flex items-center text-gray-600 hover:text-blue-600 mb-4 transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5 mr-1" />
            Volver al Dashboard
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 mb-4">{error || 'Error al cargar perfil'}</p>
            <button
              onClick={fetchProfile}
              className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const genderLabels: Record<string, string> = {
    MALE: 'Masculino',
    FEMALE: 'Femenino',
    OTHER: 'Otro',
    PREFER_NOT_TO_SAY: 'Prefiero no decir',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/portal/dashboard')}
            className="flex items-center text-gray-600 hover:text-blue-600 mb-4 transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5 mr-1" />
            Volver al Dashboard
          </button>

          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            =d Mi Perfil
          </h1>
          <p className="text-gray-600">
            Informaci�n personal y configuraci�n de cuenta
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <UserIcon className="h-12 w-12 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-2">
                  {profile.patient.firstName} {profile.patient.lastName}
                </h2>
                <p className="text-blue-100">MRN: {profile.patient.mrn}</p>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Informaci�n Personal
              </h3>
              <button
                onClick={() => alert('Funci�n de edici�n pr�ximamente')}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <PencilIcon className="h-4 w-4" />
                Editar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* MRN */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <IdentificationIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">N�mero de Registro M�dico</p>
                  <p className="font-semibold text-gray-900">{profile.patient.mrn}</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <EnvelopeIcon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Correo Electr�nico</p>
                  <p className="font-semibold text-gray-900">
                    {profile.patient.email || profile.user.email}
                  </p>
                  {profile.user.emailVerifiedAt && (
                    <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                      <ShieldCheckIcon className="h-3 w-3" />
                      Verificado
                    </p>
                  )}
                </div>
              </div>

              {/* Phone */}
              {profile.patient.phone && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <PhoneIcon className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Tel�fono</p>
                    <p className="font-semibold text-gray-900">{profile.patient.phone}</p>
                  </div>
                </div>
              )}

              {/* Date of Birth */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CalendarIcon className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Fecha de Nacimiento</p>
                  <p className="font-semibold text-gray-900">
                    {format(new Date(profile.patient.dateOfBirth), "d 'de' MMMM, yyyy", {
                      locale: es,
                    })}
                  </p>
                </div>
              </div>

              {/* Gender */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <UserIcon className="h-5 w-5 text-pink-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">G�nero</p>
                  <p className="font-semibold text-gray-900">
                    {genderLabels[profile.patient.gender] || profile.patient.gender}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Privacy Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            Seguridad y Privacidad
          </h3>

          <div className="space-y-4">
            {/* Session Activity */}
            <button
              onClick={() => router.push('/portal/dashboard/security')}
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all"
            >
              <div className="flex items-center gap-3">
                <ShieldCheckIcon className="h-6 w-6 text-purple-600" />
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Actividad de Sesión</p>
                  <p className="text-sm text-gray-600">Ver inicios de sesión y eventos de seguridad</p>
                </div>
              </div>
              <PencilIcon className="h-5 w-5 text-gray-400" />
            </button>

            {/* Change Password */}
            <button
              onClick={() => alert('Función de cambio de contraseña próximamente')}
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all"
            >
              <div className="flex items-center gap-3">
                <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Cambiar Contraseña</p>
                  <p className="text-sm text-gray-600">Actualiza tu contraseña de acceso</p>
                </div>
              </div>
              <PencilIcon className="h-5 w-5 text-gray-400" />
            </button>

            {/* Two-Factor Auth */}
            <button
              onClick={() => alert('Función de 2FA próximamente')}
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all"
            >
              <div className="flex items-center gap-3">
                <ShieldCheckIcon className="h-6 w-6 text-green-600" />
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Autenticación de Dos Factores</p>
                  <p className="text-sm text-gray-600">Añade una capa extra de seguridad</p>
                </div>
              </div>
              <div className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                Próximamente
              </div>
            </button>
          </div>
        </div>

        {/* Preferences Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            Preferencias
          </h3>

          <div className="space-y-4">
            {/* Notifications */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <p className="font-semibold text-gray-900">Notificaciones por Email</p>
                <p className="text-sm text-gray-600">Recibe actualizaciones importantes</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* SMS Notifications */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <p className="font-semibold text-gray-900">Notificaciones por SMS</p>
                <p className="text-sm text-gray-600">Recordatorios de citas</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Language */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <p className="font-semibold text-gray-900">Idioma</p>
                <p className="text-sm text-gray-600">Espa�ol</p>
              </div>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Cambiar
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 rounded-xl border-2 border-red-200 p-6 mb-6">
          <h3 className="text-xl font-bold text-red-900 mb-4">
            Zona de Peligro
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-red-900">Cerrar Sesi�n</p>
              <p className="text-sm text-red-700">Terminar tu sesi�n actual</p>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              {loggingOut ? 'Cerrando...' : 'Cerrar Sesi�n'}
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <p className="text-sm text-blue-800">
            =� <strong>Consejo:</strong> Mant�n tu informaci�n de contacto actualizada para recibir
            notificaciones importantes sobre tu salud.
          </p>
        </div>
      </div>
    </div>
  );
}
