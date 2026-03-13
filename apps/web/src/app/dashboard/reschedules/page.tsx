'use client';

/**
 * Reschedule Requests Page
 * Manage pending reschedule requests from patients
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('dashboard.reschedules');
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<Appointment[]>([]);

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
        const appointments = data.data.appointments.map((apt: any) => ({
          ...apt,
          startTime: new Date(apt.startTime),
          endTime: new Date(apt.endTime),
          rescheduleNewTime: apt.rescheduleNewTime ? new Date(apt.rescheduleNewTime) : null,
          rescheduleRequestedAt: apt.rescheduleRequestedAt ? new Date(apt.rescheduleRequestedAt) : null,
        }));

        setPendingRequests(appointments);
      } else {
        setError(data.error || t('loadError'));
      }
    } catch (error) {
      console.error('Error fetching reschedule requests:', error);
      setError(t('connectError'));
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
    try {
      const reason = t('counterPropose', {
        date: newTime.toLocaleString(undefined, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
        }),
      });

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
          <p className="text-gray-600 dark:text-gray-400">{t('loadingRequests')}</p>
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
                {t('back')}
              </Link>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                🔄 {t('title')}
              </h1>
            </div>

            {pendingRequests.length > 0 && (
              <div className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full font-bold">
                {pendingRequests.length !== 1
                  ? t('pendingPlural', { count: pendingRequests.length })
                  : t('pendingSingular', { count: pendingRequests.length })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {pendingRequests.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {t('noPendingTitle')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('noPendingDesc')}
            </p>
            <Link
              href="/dashboard/agenda"
              className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all font-semibold"
            >
              {t('viewSchedule')}
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                💡 <strong>{t('tip')}</strong> {t('tipText')}
              </p>
            </div>

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
