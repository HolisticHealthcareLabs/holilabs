'use client';

/**
 * Agenda Page
 * World-class appointment management system with Daily/Weekly/Monthly calendar views
 * Interactive table with Status, Situation tags, and multi-channel notifications
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CalendarView } from '@/components/calendar/CalendarView';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Situation {
  id: string;
  name: string;
  color: string;
  priority: number;
  icon: string | null;
  requiresAction: boolean;
  actionLabel: string | null;
}

interface AppointmentWithDetails {
  id: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  status: 'SCHEDULED' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  confirmationStatus: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  type: 'IN_PERSON' | 'TELEHEALTH' | 'PHONE';
  branch: string | null;
  branchAddress: string | null;
  patientNotes: string | null;
  followUpCount: number;
  waitingRoomCheckedInAt: Date | null;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    photoUrl: string | null;
    preferences: {
      whatsappEnabled: boolean;
      emailEnabled: boolean;
      smsEnabled: boolean;
      pushEnabled: boolean;
    } | null;
  };
  clinician: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    specialty: string | null;
  };
  situations: Array<{
    situation: Situation;
    addedAt: Date;
    notes: string | null;
  }>;
}

export default function AgendaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [situations, setSituations] = useState<Situation[]>([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(),
    end: new Date(),
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch situations on mount
  useEffect(() => {
    fetchSituations();
  }, []);

  // Fetch appointments when date range changes
  useEffect(() => {
    fetchAppointments();
  }, [dateRange]);

  const fetchSituations = async () => {
    try {
      const response = await fetch('/api/appointments/situations');
      const data = await response.json();

      if (data.success && data.data) {
        setSituations(data.data.situations);
      }
    } catch (error) {
      console.error('Error fetching situations:', error);
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);

      const startStr = format(dateRange.start, 'yyyy-MM-dd');
      const endStr = format(dateRange.end, 'yyyy-MM-dd');

      const response = await fetch(
        `/api/appointments?startDate=${startStr}&endDate=${endStr}&includeDetails=true`
      );
      const data = await response.json();

      if (data.success && data.data) {
        // Convert date strings to Date objects
        const appointmentsWithDates = data.data.appointments.map((apt: any) => ({
          ...apt,
          startTime: new Date(apt.startTime),
          endTime: new Date(apt.endTime),
          waitingRoomCheckedInAt: apt.waitingRoomCheckedInAt
            ? new Date(apt.waitingRoomCheckedInAt)
            : null,
        }));

        setAppointments(appointmentsWithDates);
      } else {
        setError(data.error || 'Error al cargar citas');
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (start: Date, end: Date) => {
    setDateRange({ start, end });
  };

  const handleAppointmentClick = (appointmentId: string) => {
    router.push(`/dashboard/agenda/${appointmentId}`);
  };

  const handleStatusChange = async (
    appointmentId: string,
    newStatus: AppointmentWithDetails['status']
  ) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        setAppointments((prev) =>
          prev.map((apt) =>
            apt.id === appointmentId ? { ...apt, status: newStatus } : apt
          )
        );
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error al actualizar el estado');
    }
  };

  const handleNotificationSend = async (
    appointmentId: string,
    channel: 'whatsapp' | 'email' | 'all',
    type: 'notify' | 'followup-1' | 'followup-2'
  ) => {
    try {
      const appointment = appointments.find((apt) => apt.id === appointmentId);
      const followUpNumber = type === 'followup-1' ? 1 : type === 'followup-2' ? 2 : 0;

      const response = await fetch(`/api/appointments/${appointmentId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          type: 'appointment_reminder',
          followUpNumber,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Notificación enviada exitosamente');
        // Update follow-up count in local state
        if (followUpNumber > 0) {
          setAppointments((prev) =>
            prev.map((apt) =>
              apt.id === appointmentId
                ? { ...apt, followUpCount: (apt.followUpCount || 0) + 1 }
                : apt
            )
          );
        }
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Error al enviar notificación');
    }
  };

  const handleSituationsChange = async (
    appointmentId: string,
    situationIds: string[]
  ) => {
    try {
      const appointment = appointments.find((apt) => apt.id === appointmentId);
      if (!appointment) return;

      const currentSituationIds = appointment.situations.map((s) => s.situation.id);
      const situationsToAdd = situationIds.filter((id) => !currentSituationIds.includes(id));
      const situationsToRemove = currentSituationIds.filter((id) => !situationIds.includes(id));

      // Add new situations
      for (const situationId of situationsToAdd) {
        await fetch(`/api/appointments/${appointmentId}/situations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ situationId }),
        });
      }

      // Remove situations
      for (const situationId of situationsToRemove) {
        await fetch(
          `/api/appointments/${appointmentId}/situations?situationId=${situationId}`,
          {
            method: 'DELETE',
          }
        );
      }

      // Refresh appointments
      fetchAppointments();
    } catch (error) {
      console.error('Error updating situations:', error);
      alert('Error al actualizar situaciones');
    }
  };

  const handlePaymentNotificationSend = async (
    appointmentId: string,
    channel: 'whatsapp' | 'email' | 'in-app' | 'all'
  ) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: channel === 'in-app' ? 'push' : channel,
          type: 'payment_reminder',
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('💰 Notificación de pago enviada exitosamente');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error sending payment notification:', error);
      alert('Error al enviar notificación de pago');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => fetchAppointments()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
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
                ← Back
              </Link>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                📅 Agenda
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Quick Stats */}
              <div className="hidden md:flex items-center space-x-6 px-6 py-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full">
                <div className="text-center">
                  <div className="text-xs text-gray-600 dark:text-gray-400">Today</div>
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {
                      appointments.filter(
                        (apt) => format(apt.startTime, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                      ).length
                    }
                  </div>
                </div>
                <div className="h-8 w-px bg-gray-300 dark:bg-gray-600" />
                <div className="text-center">
                  <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {appointments.length}
                  </div>
                </div>
              </div>

              {/* New Appointment Button */}
              <Link
                href="/dashboard/agenda/new"
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all font-semibold"
              >
                + New
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      <div className="container mx-auto px-6 py-6">
        <CalendarView
          appointments={appointments}
          availableSituations={situations}
          onDateRangeChange={handleDateRangeChange}
          onAppointmentClick={handleAppointmentClick}
          onStatusChange={handleStatusChange}
          onNotificationSend={handleNotificationSend}
          onSituationsChange={handleSituationsChange}
          onPaymentNotificationSend={handlePaymentNotificationSend}
        />
      </div>
    </div>
  );
}
