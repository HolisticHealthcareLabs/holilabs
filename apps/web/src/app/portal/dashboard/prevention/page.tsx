/**
 * Prevention Hub - Patient Portal
 *
 * Patient-facing view of their preventive health data
 * Features:
 * - Personal risk scores with explanations
 * - Upcoming preventive screenings
 * - Health goals and progress
 * - Personalized recommendations
 * - Educational content
 */

import { redirect } from 'next/navigation';
import { getCurrentPatient } from '@/lib/auth/patient-session';
import PreventionClient from './PreventionClient';
import { logger } from '@/lib/logger';

async function fetchPreventionData(patientId: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/portal/prevention?patientId=${patientId}`,
      {
        method: 'GET',
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch prevention data');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error('Error fetching prevention data:', error);
    return {
      riskScores: [],
      interventions: [],
      goals: [],
      recommendations: [],
    };
  }
}

export default async function PreventionPage() {
  const patientUser = await getCurrentPatient();

  if (!patientUser) {
    redirect('/portal/login');
  }

  const preventionData = await fetchPreventionData(patientUser.patient.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-5xl">🛡️</span>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Mi Salud Preventiva
              </h1>
              <p className="text-gray-600 mt-1">
                Monitorea tu salud y previene enfermedades antes de que aparezcan
              </p>
            </div>
          </div>
        </div>

        <PreventionClient
          initialData={preventionData}
          patientName={`${patientUser.patient.firstName} ${patientUser.patient.lastName}`}
          patientAge={calculateAge(patientUser.patient.dateOfBirth)}
        />
      </div>
    </div>
  );
}

function calculateAge(dateOfBirth: Date | string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}
