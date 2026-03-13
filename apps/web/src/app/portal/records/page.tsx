/**
export const dynamic = 'force-dynamic';

 * Patient Medical Records Page
 *
 * Industry-grade medical records viewer with:
 * - Advanced filtering and search
 * - Pagination
 * - Loading states
 * - Error boundaries
 * - Mobile-responsive design
 * - Accessibility features
 */

import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getCurrentPatient } from '@/lib/auth/patient-session';
import MedicalRecordsList from '@/components/portal/MedicalRecordsList';

export default async function MedicalRecordsPage() {
  const t = await getTranslations('portal.records');
  const patientUser = await getCurrentPatient();

  if (!patientUser) {
    redirect('/portal/login');
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">{t('title')}</h1>
        <p className="text-gray-600">{t('subtitle')}</p>
      </div>

      {/* Records List Component (Client-side for interactivity) */}
      <MedicalRecordsList />
    </div>
  );
}
