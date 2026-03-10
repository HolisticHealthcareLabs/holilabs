/**
 * Terms of Service Page
 *
 * Renders the comprehensive Holi Labs' Terms of Service
 * using the LegalDocumentViewer component with markdown content.
 *
 * @compliance LGPD, ANVISA RDC 657/2022, CFM 2.314/2022, HIPAA
 * @updated 2026-03-10
 */

import { Metadata } from 'next';
import dynamic from 'next/dynamic';

const LegalDocumentViewer = dynamic(
  () => import('@/components/legal/LegalDocumentViewer'),
  {
    loading: () => (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8 md:p-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8" />
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    ),
  }
);

export const metadata: Metadata = {
  title: "Terms of Service | Holi Labs",
  description:
    "Holi Labs' Terms of Service — Clinical decision support platform usage agreement. LGPD, ANVISA, and HIPAA compliant.",
};

export default function TermsOfServicePage() {
  return (
    <LegalDocumentViewer
      documentPath="/legal/terms-of-service.md"
      title="Holi Labs' Terms of Service"
      description="Effective March 10, 2026 · Version 1.0"
    />
  );
}
