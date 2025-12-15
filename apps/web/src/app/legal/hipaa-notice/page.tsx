/**
 * HIPAA Notice of Privacy Practices Page
 *
 * Displays the complete HIPAA Notice as required by law
 * @updated 2025-12-15
 */

import { Metadata } from 'next';
import LegalDocumentViewer from '@/components/legal/LegalDocumentViewer';

export const metadata: Metadata = {
  title: 'HIPAA Notice of Privacy Practices | HoliLabs',
  description: 'HoliLabs HIPAA Notice of Privacy Practices - Your rights and our responsibilities',
};

export default function HIPAANoticePage() {
  return (
    <LegalDocumentViewer
      documentPath="/legal/hipaa-notice-of-privacy-practices.md"
      title="HIPAA Notice of Privacy Practices"
      description="This notice describes how medical information about you may be used and disclosed and how you can get access to this information."
    />
  );
}
