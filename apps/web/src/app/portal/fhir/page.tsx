/**
 * FHIR Medical Records Page
 * Patient portal page for viewing FHIR resources
 */

import { redirect } from 'next/navigation';
import { getCurrentPatient } from '@/lib/auth/patient-session';
import FhirResourceViewer from '@/components/portal/FhirResourceViewer';

export const metadata = {
  title: 'Registros Médicos FHIR | Holi Labs',
  description: 'Accede a tus registros médicos en formato FHIR estándar',
};

export default async function FhirRecordsPage() {
  const patientUser = await getCurrentPatient();

  if (!patientUser) {
    redirect('/portal/login');
  }

  // Get patient token ID from session
  // This should be the de-identified patient token, not the actual patient ID
  const patientTokenId = patientUser.patient?.tokenId || patientUser.id;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            Registros Médicos FHIR
          </h1>
          <p className="text-gray-600">
            Accede a tus registros médicos en formato FHIR (Fast Healthcare Interoperability Resources)
          </p>
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-blue-900 mb-1">
              ¿Qué es FHIR?
            </h2>
            <p className="text-sm text-blue-700">
              FHIR es un estándar internacional para el intercambio de información de salud.
              Tus registros en este formato pueden compartirse de forma segura con otros sistemas de salud.
            </p>
          </div>
        </div>

        {/* FHIR Resource Viewer */}
        <FhirResourceViewer patientTokenId={patientTokenId} />
      </div>
    </div>
  );
}
