/**
 * Consent Forms Page
 *
 * Directory of all available consent forms
 * @updated 2025-12-15
 */

import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Consent Forms | HoliLabs',
  description: 'HoliLabs consent forms for EHR, telemedicine, data sharing, and marketing communications',
};

export default function ConsentFormsPage() {
  const consentForms = [
    {
      title: 'Electronic Health Records Consent',
      description: 'Consent to use electronic health records to maintain your health information.',
      href: '/legal/consent/ehr-consent.md',
      icon: '📋',
    },
    {
      title: 'Telemedicine Consent',
      description: 'Consent to receive healthcare services via telemedicine and video consultations.',
      href: '/legal/consent/telemedicine-consent.md',
      icon: '💻',
    },
    {
      title: 'Data Sharing Consent',
      description: 'Authorization to share your Protected Health Information with specific individuals or organizations.',
      href: '/legal/consent/data-sharing-consent.md',
      icon: '🔐',
    },
    {
      title: 'Marketing Communications Consent',
      description: 'Opt-in to receive marketing and promotional communications from HoliLabs.',
      href: '/legal/consent/marketing-communications-consent.md',
      icon: '📧',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Consent Forms</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Review and download our consent forms. These forms are required for various aspects of
            your care and communication with HoliLabs.
          </p>
        </div>

        {/* Consent Forms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {consentForms.map((form) => (
            <div
              key={form.title}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start mb-4">
                <span className="text-4xl mr-4">{form.icon}</span>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">{form.title}</h2>
                  <p className="text-gray-600 mb-4">{form.description}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <a
                  href={form.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Form
                </a>
                <a
                  href={form.href}
                  download
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Download
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Important Information */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-8">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Important Information</h3>
          <ul className="list-disc pl-5 text-yellow-700 space-y-2">
            <li>These forms are templates and must be reviewed by legal counsel before use</li>
            <li>Some forms are required for specific services (e.g., telemedicine consent)</li>
            <li>You may revoke consent at any time by contacting our Privacy Officer</li>
            <li>Consents are stored securely in your patient record</li>
          </ul>
        </div>

        {/* Additional Resources */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Additional Legal Documents</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/legal/terms-of-service"
              className="text-center p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
            >
              <div className="text-3xl mb-2">📜</div>
              <div className="font-semibold text-gray-900">Terms of Service</div>
            </Link>
            <Link
              href="/legal/privacy-policy"
              className="text-center p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
            >
              <div className="text-3xl mb-2">🔒</div>
              <div className="font-semibold text-gray-900">Privacy Policy</div>
            </Link>
            <Link
              href="/legal/baa"
              className="text-center p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
            >
              <div className="text-3xl mb-2">🤝</div>
              <div className="font-semibold text-gray-900">Business Associate Agreement</div>
            </Link>
            <Link
              href="/legal/hipaa-notice"
              className="text-center p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
            >
              <div className="text-3xl mb-2">🏥</div>
              <div className="font-semibold text-gray-900">HIPAA Notice</div>
            </Link>
          </div>
        </div>

        {/* Contact Information */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Questions About Consent Forms?</h3>
          <p className="text-blue-800 mb-4">
            If you have questions about any consent form or need assistance completing one, please contact:
          </p>
          <div className="text-blue-900">
            <p><strong>Privacy Officer</strong></p>
            <p>Email: <a href="mailto:privacy@holilabs.com" className="underline">privacy@holilabs.com</a></p>
            <p>Phone: [Privacy Phone Number]</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            © {new Date().getFullYear()} HoliLabs, Inc. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
