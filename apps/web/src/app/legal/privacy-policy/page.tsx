/**
 * Privacy Policy Page
 *
 * @compliance GDPR, LGPD, HIPAA, CCPA
 * @updated 2025-12-02
 */

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Holi Labs',
  description: 'Holi Labs Privacy Policy - GDPR, LGPD, and HIPAA compliant healthcare data protection',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8 md:p-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>

        <p className="text-sm text-gray-600 mb-8">
          <strong>Last Updated:</strong> December 2, 2025<br />
          <strong>Effective Date:</strong> December 2, 2025
        </p>

        <div className="prose prose-lg max-w-none">
          {/* Introduction */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 mb-4">
              Holi Labs, Inc. ("Holi Labs," "we," "us," or "our") is committed to protecting the privacy and security
              of your personal health information (PHI) and personally identifiable information (PII). This Privacy
              Policy explains how we collect, use, disclose, and safeguard your information when you use our healthcare
              management platform.
            </p>
            <p className="text-gray-700 mb-4">
              We comply with:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>HIPAA</strong> - Health Insurance Portability and Accountability Act (United States)</li>
              <li><strong>GDPR</strong> - General Data Protection Regulation (European Union)</li>
              <li><strong>LGPD</strong> - Lei Geral de Proteção de Dados (Brazil)</li>
              <li><strong>CCPA</strong> - California Consumer Privacy Act (California, USA)</li>
            </ul>
          </section>

          {/* Information We Collect */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1 Personal Health Information (PHI)</h3>
            <p className="text-gray-700 mb-4">
              As a HIPAA-compliant healthcare platform, we collect and process:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Medical records, clinical notes, and SOAP notes</li>
              <li>Diagnoses, treatment plans, and prescriptions</li>
              <li>Lab results, imaging studies, and vital signs</li>
              <li>Appointment history and healthcare provider information</li>
              <li>Insurance information and billing records</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.2 Personal Information (PII)</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Name, date of birth, gender, and contact information</li>
              <li>Email address, phone number, and physical address</li>
              <li>Government identifiers (CPF, CNS, MRN)</li>
              <li>Emergency contact information</li>
              <li>Profile photo (with consent)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.3 Technical Information</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>IP address, browser type, and device information</li>
              <li>Usage data, session logs, and access timestamps</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1 Treatment, Payment, and Healthcare Operations (TPO)</h3>
            <p className="text-gray-700 mb-4">
              Under HIPAA, we use PHI for:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Treatment:</strong> Coordinating care between healthcare providers</li>
              <li><strong>Payment:</strong> Processing insurance claims and billing</li>
              <li><strong>Healthcare Operations:</strong> Quality improvement, care coordination, and clinical decision support</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2 Legal Obligations</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Compliance with healthcare regulations and legal requirements</li>
              <li>Responding to court orders, subpoenas, and regulatory requests</li>
              <li>Reporting communicable diseases as required by law</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.3 With Your Consent</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Sharing information with family members or caregivers (with explicit consent)</li>
              <li>Sending appointment reminders and health notifications</li>
              <li>Research purposes (only with de-identified data and consent)</li>
            </ul>
          </section>

          {/* Data Security */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Security & Protection</h2>
            <p className="text-gray-700 mb-4">
              We implement industry-leading security measures to protect your information:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Encryption:</strong> TLS 1.3 for data in transit, AES-256 for data at rest</li>
              <li><strong>Access Controls:</strong> Role-based access control (RBAC) and multi-factor authentication (MFA)</li>
              <li><strong>Audit Logging:</strong> Comprehensive audit trails for all PHI access</li>
              <li><strong>Data Backups:</strong> Daily encrypted backups with 30-day retention</li>
              <li><strong>Security Monitoring:</strong> 24/7 intrusion detection and threat monitoring</li>
              <li><strong>Employee Training:</strong> Annual HIPAA and security awareness training</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Your Privacy Rights</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">5.1 HIPAA Rights (United States)</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Right to Access:</strong> Request copies of your medical records</li>
              <li><strong>Right to Amend:</strong> Request corrections to inaccurate information</li>
              <li><strong>Right to Accounting:</strong> Request a list of PHI disclosures</li>
              <li><strong>Right to Restrict:</strong> Request limits on how we use/disclose PHI</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">5.2 GDPR Rights (European Union)</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Right to Erasure:</strong> Request deletion of your personal data (Article 17)</li>
              <li><strong>Right to Portability:</strong> Receive your data in machine-readable format</li>
              <li><strong>Right to Object:</strong> Object to processing of your data</li>
              <li><strong>Right to Rectification:</strong> Correct inaccurate personal data</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">5.3 LGPD Rights (Brazil)</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Right to Confirmation:</strong> Confirm existence of data processing</li>
              <li><strong>Right to Access:</strong> Access your stored personal data</li>
              <li><strong>Right to Correction:</strong> Correct incomplete or inaccurate data</li>
              <li><strong>Right to Deletion:</strong> Request deletion of your data (Article 18)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">5.4 CCPA Rights (California)</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Right to Know:</strong> Know what personal information is collected</li>
              <li><strong>Right to Delete:</strong> Request deletion of personal information</li>
              <li><strong>Right to Opt-Out:</strong> Opt-out of the sale of personal information (we do not sell data)</li>
            </ul>
          </section>

          {/* Data Retention */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
            <p className="text-gray-700 mb-4">
              We retain your information for as long as necessary to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Provide healthcare services and maintain medical records</li>
              <li>Comply with legal and regulatory requirements</li>
              <li>Resolve disputes and enforce agreements</li>
            </ul>
            <p className="text-gray-700 mb-4">
              <strong>Medical Records:</strong> Retained for a minimum of 7 years (or longer if required by state/country law)<br />
              <strong>Audit Logs:</strong> Retained for 7 years for HIPAA compliance<br />
              <strong>Deleted Data:</strong> Anonymized and retained for compliance purposes only
            </p>
          </section>

          {/* Data Sharing */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Data Sharing & Disclosure</h2>
            <p className="text-gray-700 mb-4">
              We do not sell your personal or health information. We may share information with:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Healthcare Providers:</strong> For coordinated care and treatment</li>
              <li><strong>Business Associates:</strong> Third-party service providers (cloud hosting, email services) under HIPAA Business Associate Agreements (BAAs)</li>
              <li><strong>Legal Requirements:</strong> When required by law, court order, or regulatory authority</li>
              <li><strong>Emergency Situations:</strong> To prevent serious harm or protect public health</li>
            </ul>
          </section>

          {/* Cookies */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Cookies & Tracking Technologies</h2>
            <p className="text-gray-700 mb-4">
              We use cookies and similar technologies to improve user experience and analyze platform usage.
              For detailed information, please see our{' '}
              <a href="/legal/cookie-policy" className="text-blue-600 hover:underline">Cookie Policy</a>.
            </p>
            <p className="text-gray-700 mb-4">
              You can control cookies through your browser settings and our Cookie Consent Banner.
            </p>
          </section>

          {/* International Transfers */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. International Data Transfers</h2>
            <p className="text-gray-700 mb-4">
              Your data may be transferred to and processed in countries other than your country of residence.
              We ensure adequate safeguards are in place, including:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>EU Standard Contractual Clauses (SCCs) for GDPR compliance</li>
              <li>Data Processing Agreements for LGPD compliance</li>
              <li>Business Associate Agreements for HIPAA compliance</li>
            </ul>
          </section>

          {/* Children's Privacy */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Children's Privacy</h2>
            <p className="text-gray-700 mb-4">
              Our platform is designed for healthcare providers managing patient records. We do not knowingly
              collect information from children under 13 without parental consent. Pediatric patient records
              are managed by authorized healthcare providers with appropriate parental/guardian authorization.
            </p>
          </section>

          {/* Data Breach Notification */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Data Breach Notification</h2>
            <p className="text-gray-700 mb-4">
              In the event of a data breach affecting PHI or personal information, we will:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Notify affected individuals within 72 hours (GDPR/LGPD requirement)</li>
              <li>Notify the Department of Health and Human Services (HHS) within 60 days (HIPAA requirement)</li>
              <li>Provide details about the breach and steps taken to mitigate harm</li>
              <li>Offer credit monitoring services if appropriate</li>
            </ul>
          </section>

          {/* Changes to Policy */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Changes to This Privacy Policy</h2>
            <p className="text-gray-700 mb-4">
              We may update this Privacy Policy periodically to reflect changes in our practices, technology,
              or legal requirements. We will notify you of significant changes by:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Posting a prominent notice on our platform</li>
              <li>Sending an email notification to registered users</li>
              <li>Updating the "Last Updated" date at the top of this policy</li>
            </ul>
          </section>

          {/* Contact Information */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Contact Us</h2>
            <p className="text-gray-700 mb-4">
              If you have questions about this Privacy Policy or wish to exercise your privacy rights, please contact:
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-4">
              <p className="text-gray-800 mb-2">
                <strong>Data Protection Officer (DPO)</strong><br />
                Holi Labs, Inc.<br />
                Email: <a href="mailto:dpo@holilabs.com" className="text-blue-600 hover:underline">dpo@holilabs.com</a><br />
                Privacy Requests: <a href="mailto:privacy@holilabs.com" className="text-blue-600 hover:underline">privacy@holilabs.com</a><br />
                Phone: +1 (555) 123-4567
              </p>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Exercise Your Rights</h3>
            <p className="text-gray-700 mb-4">
              To exercise your privacy rights (access, deletion, correction, portability):
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Visit your Account Settings and submit a request</li>
              <li>Email <a href="mailto:privacy@holilabs.com" className="text-blue-600 hover:underline">privacy@holilabs.com</a></li>
              <li>Contact your healthcare provider directly</li>
            </ul>
          </section>

          {/* Acknowledgment */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Acknowledgment</h2>
            <p className="text-gray-700 mb-4">
              By using Holi Labs, you acknowledge that you have read, understood, and agree to this Privacy Policy.
              If you do not agree with our policies and practices, please do not use our platform.
            </p>
          </section>

          {/* Additional Resources */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Additional Resources</h2>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><a href="/legal/terms-of-service" className="text-blue-600 hover:underline">Terms of Service</a></li>
              <li><a href="/legal/cookie-policy" className="text-blue-600 hover:underline">Cookie Policy</a></li>
              <li><a href="/legal/data-processing-agreement" className="text-blue-600 hover:underline">Data Processing Agreement</a></li>
              <li><a href="https://www.hhs.gov/hipaa" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">HIPAA Information (HHS)</a></li>
              <li><a href="https://gdpr.eu" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">GDPR Information</a></li>
              <li><a href="https://www.gov.br/anpd" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">LGPD Information (ANPD)</a></li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            © {new Date().getFullYear()} Holi Labs, Inc. All rights reserved.<br />
            <a href="/legal/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</a> •
            <a href="/legal/terms-of-service" className="text-blue-600 hover:underline ml-1">Terms of Service</a> •
            <a href="/legal/cookie-policy" className="text-blue-600 hover:underline ml-1">Cookie Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
