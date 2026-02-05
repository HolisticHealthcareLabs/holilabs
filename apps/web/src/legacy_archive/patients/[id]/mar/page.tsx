'use client';

import { MARSheet } from '@/components/mar/MARSheet';

/**
 * MAR (Medication Administration Record) Page
 *
 * Phase 4: Nursing Workflows
 * Primary interface for nurses to view and administer medications
 */

export default function MARPage({ params }: { params: { id: string } }) {
  const { id } = params;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-[1600px] mx-auto">
        <MARSheet patientId={id} />
      </div>
    </div>
  );
}
