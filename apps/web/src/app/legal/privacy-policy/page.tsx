/**
 * Privacy Policy Page
 *
 * Renders the comprehensive Holi Labs' Privacy Policy
 * using the LegalDocumentViewer component with markdown content.
 *
 * @compliance LGPD, ANVISA RDC 657/2022, HIPAA, CCPA
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
  title: "Privacy Policy | Holi Labs",
  description:
    "Holi Labs' Privacy Policy — LGPD, HIPAA, and CCPA compliant healthcare data protection policy.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalDocumentViewer
      documentPath="/legal/privacy-policy.md"
      title="Holi Labs' Privacy Policy"
      description="Effective March 10, 2026 · Version 1.0"
    />
  );
}
