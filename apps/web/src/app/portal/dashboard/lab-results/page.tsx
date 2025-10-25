/**
 * Lab Results Page - Patient Portal
 *
 * Displays patient's laboratory results with trend visualization
 * Features:
 * - Historical results timeline
 * - Interactive trend charts
 * - Reference ranges with color coding
 * - Doctor's comments/interpretation
 * - PDF export capability
 * - Filtering by test type and date
 */

import { redirect } from 'next/navigation';
import { getCurrentPatient } from '@/lib/auth/patient-session';
import LabResultsClient from './LabResultsClient';

async function fetchLabResults(patientId: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/portal/lab-results?patientId=${patientId}`,
      {
        method: 'GET',
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch lab results');
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching lab results:', error);
    return [];
  }
}

export default async function LabResultsPage() {
  const patientUser = await getCurrentPatient();

  if (!patientUser) {
    redirect('/portal/login');
  }

  const labResults = await fetchLabResults(patientUser.patient.id);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <span className="text-4xl">🧪</span>
            <span>Resultados de Laboratorio</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Visualiza tus resultados de pruebas de laboratorio y su evolución en el tiempo
          </p>
        </div>

        <LabResultsClient
          initialResults={labResults}
          patientName={`${patientUser.patient.firstName} ${patientUser.patient.lastName}`}
        />
      </div>
    </div>
  );
}
