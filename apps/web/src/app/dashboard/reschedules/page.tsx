'use client';

/**
 * Reschedule Requests Page
 * Manage pending reschedule requests from patients
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RescheduleApprovalCard } from '@/components/reschedule/RescheduleApprovalCard';

interface Appointment {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  rescheduleRequested: boolean;
  rescheduleNewTime: Date | null;
  rescheduleReason: string | null;
  rescheduleRequestedAt: Date | null;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
  };
  clinician: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export default function ReschedulesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<Appointment[]>([]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/appointments?rescheduleRequested=true');
      const data = await response.json();

      if (data.success && data.data) {
        // Convert date strings to Date objects
        const appointments = data.data.appointments.map((apt: any) => ({
          ...apt,
          startTime: new Date(apt.startTime),
          endTime: new Date(apt.endTime),
          rescheduleNewTime: apt.rescheduleNewTime ? new Date(apt.rescheduleNewTime) : null,
          rescheduleRequestedAt: apt.rescheduleRequestedAt ? new Date(apt.rescheduleRequestedAt) : null,
        }));

        setPendingRequests(appointments);
      } else {
        setError(data.error || 'Error al cargar solicitudes');
      }
    } catch (error) {
      console.error('Error fetching reschedule requests:', error);
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (appointmentId: string) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/reschedule/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.success) {
        // Remove from pending requests
        setPendingRequests((prev) => prev.filter((apt) => apt.id !== appointmentId));
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error approving reschedule:', error);
      throw error;
    }
  };

  const handleDeny = async (appointmentId: string, reason: string) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/reschedule/deny`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      const data = await response.json();

      if (data.success) {
        // Remove from pending requests
        setPendingRequests((prev) => prev.filter((apt) => apt.id !== appointmentId));
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error denying reschedule:', error);
      throw error;
    }
  };

  const handleCounterPropose = async (appointmentId: string, newTime: Date) => {
    // This would require an additional API route for counter-proposing
    // For now, we'll treat it as a deny with a suggested alternative
    try {
      const reason = `Te proponemos otra fecha: ${newTime.toLocaleString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      })}. Por favor contáctanos para confirmar.`;

      await handleDeny(appointmentId, reason);
    } catch (error) {
      throw error;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando solicitudes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                ← Regresar
              </Link>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                🔄 Solicitudes de Reagendamiento
              </h1>
            </div>

            {/* Pending Count Badge */}
            {pendingRequests.length > 0 && (
              <div className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full font-bold">
                {pendingRequests.length} Pendiente{pendingRequests.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Pending Requests */}
        {pendingRequests.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No hay solicitudes pendientes
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Todas las solicitudes de reagendamiento han sido procesadas
            </p>
            <Link
              href="/dashboard/agenda"
              className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all font-semibold"
            >
              Ver Agenda
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Info Banner */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                💡 <strong>Tip:</strong> Las solicitudes se procesan en orden de llegada. Los pacientes recibirán una notificación automática cuando apruebes o niegues su solicitud.
              </p>
            </div>

            {/* Requests Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {pendingRequests.map((appointment) => (
                <RescheduleApprovalCard
                  key={appointment.id}
                  appointment={appointment}
                  onApprove={handleApprove}
                  onDeny={handleDeny}
                  onCounterPropose={handleCounterPropose}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
