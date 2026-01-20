/**
 * Clinician Video Call Page
 *
 * Telemedicine interface for clinicians with real appointment data
 */

'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import WaitingRoom from '@/components/video/WaitingRoom';
import VideoRoom from '@/components/video/VideoRoom';

interface AppointmentData {
  appointmentId: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  userType: 'clinician' | 'patient';
  userName: string;
  otherParticipantName: string;
}

export default function ClinicianVideoCallPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const resolvedParams = use(params);
  const [isInCall, setIsInCall] = useState(false);
  const [appointmentData, setAppointmentData] = useState<AppointmentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const response = await fetch(`/api/video/appointment/${resolvedParams.appointmentId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch appointment');
        }

        setAppointmentData(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load appointment');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointment();
  }, [resolvedParams.appointmentId]);

  const handleJoinCall = () => {
    setIsInCall(true);
  };

  const handleLeaveCall = () => {
    setIsInCall(false);
    router.push('/dashboard/appointments');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando cita...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !appointmentData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Error</h3>
          <p className="text-gray-600 mb-6">{error || 'No se pudo cargar la cita'}</p>
          <button
            onClick={() => router.push('/dashboard/appointments')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Volver a citas
          </button>
        </div>
      </div>
    );
  }

  if (isInCall) {
    return (
      <VideoRoom
        roomId={resolvedParams.appointmentId}
        userName={appointmentData.userName}
        userType="clinician"
        onLeave={handleLeaveCall}
      />
    );
  }

  return (
    <WaitingRoom
      userName={appointmentData.userName}
      userType="clinician"
      appointmentTime={new Date(appointmentData.startTime)}
      onJoinCall={handleJoinCall}
    />
  );
}
