/**
 * Business Associate Agreement Page
 *
 * Displays the complete BAA document for covered entities
 * @updated 2025-12-15
 */

import { Metadata } from 'next';
import LegalDocumentViewer from '@/components/legal/LegalDocumentViewer';

export const metadata: Metadata = {
  title: 'Business Associate Agreement | HoliLabs',
  description: 'HoliLabs Business Associate Agreement - HIPAA-compliant BAA for covered entities',
};

export default function BAAPage() {
  return (
    <LegalDocumentViewer
      documentPath="/legal/business-associate-agreement.md"
      title="Business Associate Agreement"
      description="HIPAA-compliant Business Associate Agreement for covered entities using HoliLabs services."
    />
  );
}
