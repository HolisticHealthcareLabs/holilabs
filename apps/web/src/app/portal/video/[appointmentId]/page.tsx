/**
 * Patient Video Call Page
 *
 * Beautiful, simple telemedicine interface for patients
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import WaitingRoom from '@/components/video/WaitingRoom';
import VideoRoom from '@/components/video/VideoRoom';

export default function PatientVideoCallPage({
  params,
}: {
  params: { appointmentId: string };
}) {
  const [isInCall, setIsInCall] = useState(false);
  const router = useRouter();

  // Mock data - replace with actual data fetching
  const userName = 'María González';
  const appointmentTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

  const handleJoinCall = () => {
    setIsInCall(true);
  };

  const handleLeaveCall = () => {
    setIsInCall(false);
    router.push('/portal/appointments');
  };

  if (isInCall) {
    return (
      <VideoRoom
        roomId={params.appointmentId}
        userName={userName}
        userType="patient"
        onLeave={handleLeaveCall}
      />
    );
  }

  return (
    <WaitingRoom
      userName={userName}
      userType="patient"
      appointmentTime={appointmentTime}
      onJoinCall={handleJoinCall}
    />
  );
}
