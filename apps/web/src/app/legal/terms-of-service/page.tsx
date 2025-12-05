/**
 * Terms of Service Page
 *
 * @compliance HIPAA, Medical Liability, Service Agreement
 * @updated 2025-12-02
 */

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Holi Labs',
  description: 'Holi Labs Terms of Service - Healthcare platform usage agreement',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8 md:p-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>

        <p className="text-sm text-gray-600 mb-8">
          <strong>Last Updated:</strong> December 2, 2025<br />
          <strong>Effective Date:</strong> December 2, 2025
        </p>

        <div className="prose prose-lg max-w-none">
          {/* Introduction */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Agreement to Terms</h2>
            <p className="text-gray-700 mb-4">
              These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your")
              and Holi Labs, Inc. ("Holi Labs," "we," "us," or "our") governing your access to and use of the Holi Labs
              healthcare management platform (the "Service" or "Platform").
            </p>
            <p className="text-gray-700 mb-4">
              By accessing or using the Service, you agree to be bound by these Terms. If you do not agree to these Terms,
              you must not access or use the Service.
            </p>
          </section>

          {/* Definitions */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Definitions</h2>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>"Platform"</strong> means the Holi Labs healthcare management software, including web and mobile applications</li>
              <li><strong>"PHI"</strong> means Protected Health Information as defined by HIPAA</li>
              <li><strong>"Healthcare Provider"</strong> means licensed clinicians, physicians, nurses, and healthcare professionals using the Platform</li>
              <li><strong>"Patient"</strong> means individuals whose health information is managed through the Platform</li>
              <li><strong>"Covered Entity"</strong> means healthcare organizations subject to HIPAA regulations</li>
            </ul>
          </section>

          {/* Eligibility */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Eligibility & Account Registration</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1 Eligibility Requirements</h3>
            <p className="text-gray-700 mb-4">
              To use the Service, you must:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Be at least 18 years of age</li>
              <li>Be a licensed healthcare professional (for clinician accounts)</li>
              <li>Have legal authority to enter into these Terms</li>
              <li>Provide accurate, complete, and current registration information</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2 Account Security</h3>
            <p className="text-gray-700 mb-4">
              You are responsible for:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Immediately notifying us of any unauthorized access</li>
              <li>Using strong passwords and enabling multi-factor authentication (MFA)</li>
            </ul>
          </section>

          {/* Permitted Use */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Permitted Use of Service</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 Healthcare Providers</h3>
            <p className="text-gray-700 mb-4">
              Healthcare providers may use the Platform for:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Managing patient records and medical documentation</li>
              <li>Coordinating patient care and treatment plans</li>
              <li>Clinical decision support and care recommendations</li>
              <li>Scheduling appointments and managing workflows</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.2 Patients</h3>
            <p className="text-gray-700 mb-4">
              Patients may use the Platform to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>View their medical records (with appropriate authorization)</li>
              <li>Communicate with healthcare providers</li>
              <li>Manage appointments and prescriptions</li>
              <li>Exercise privacy rights (access, correction, deletion)</li>
            </ul>
          </section>

          {/* Prohibited Activities */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Prohibited Activities</h2>
            <p className="text-gray-700 mb-4">
              You may NOT:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Access PHI for which you lack authorization</li>
              <li>Share login credentials with unauthorized individuals</li>
              <li>Attempt to bypass security measures or access controls</li>
              <li>Reverse engineer, decompile, or disassemble the Platform</li>
              <li>Use the Platform for any illegal or unauthorized purpose</li>
              <li>Introduce viruses, malware, or other malicious code</li>
              <li>Scrape, harvest, or collect user data without permission</li>
              <li>Impersonate another user or entity</li>
              <li>Violate HIPAA, GDPR, LGPD, or other applicable laws</li>
            </ul>
          </section>

          {/* HIPAA Compliance */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. HIPAA Compliance & Business Associate Agreement</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">6.1 Business Associate Relationship</h3>
            <p className="text-gray-700 mb-4">
              Holi Labs acts as a Business Associate under HIPAA when providing services to Covered Entities.
              A separate Business Associate Agreement (BAA) is required for healthcare organizations.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">6.2 PHI Protection</h3>
            <p className="text-gray-700 mb-4">
              All users must:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Access PHI only as necessary for treatment, payment, or healthcare operations</li>
              <li>Follow the principle of minimum necessary access</li>
              <li>Report any suspected HIPAA violations or data breaches immediately</li>
              <li>Complete required HIPAA training</li>
            </ul>
          </section>

          {/* Medical Disclaimer */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Medical Disclaimer</h2>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <p className="text-yellow-800 font-semibold">IMPORTANT MEDICAL DISCLAIMER</p>
            </div>
            <p className="text-gray-700 mb-4">
              The Platform is a tool to support healthcare providers in clinical decision-making. It is NOT:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>A substitute for professional medical judgment</li>
              <li>A diagnostic tool or medical device (unless specifically cleared by FDA/regulatory authorities)</li>
              <li>A guarantee of clinical outcomes or treatment success</li>
            </ul>
            <p className="text-gray-700 mb-4">
              <strong>Healthcare providers retain sole responsibility for:</strong>
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>All clinical decisions and diagnoses</li>
              <li>Verifying accuracy of AI-generated recommendations</li>
              <li>Patient care and treatment outcomes</li>
              <li>Compliance with medical standards of care</li>
            </ul>
          </section>

          {/* AI-Generated Content */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. AI-Generated Clinical Recommendations</h2>
            <p className="text-gray-700 mb-4">
              The Platform may use artificial intelligence to provide clinical decision support. Users acknowledge:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>AI recommendations are advisory only and require clinical validation</li>
              <li>AI models may produce errors or inaccurate suggestions</li>
              <li>Healthcare providers must independently verify all AI-generated content</li>
              <li>Final clinical decisions rest with the treating healthcare provider</li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Intellectual Property Rights</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">9.1 Holi Labs IP</h3>
            <p className="text-gray-700 mb-4">
              The Platform, including all software, designs, algorithms, and content, is owned by Holi Labs and protected
              by copyright, trademark, and other intellectual property laws. These Terms grant you a limited, non-exclusive,
              non-transferable license to use the Platform for its intended purpose.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">9.2 User Data</h3>
            <p className="text-gray-700 mb-4">
              You retain ownership of all patient data and clinical information you input into the Platform. By using the
              Service, you grant Holi Labs a limited license to process this data solely to provide the Service and comply
              with legal obligations.
            </p>
          </section>

          {/* Payment Terms */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Payment Terms & Subscription</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">10.1 Subscription Fees</h3>
            <p className="text-gray-700 mb-4">
              Certain features of the Platform require a paid subscription. Subscription fees are:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Billed in advance on a monthly or annual basis</li>
              <li>Non-refundable except as required by law</li>
              <li>Subject to change with 30 days' notice</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">10.2 Cancellation</h3>
            <p className="text-gray-700 mb-4">
              You may cancel your subscription at any time. Upon cancellation:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Access to paid features will end at the end of the current billing period</li>
              <li>Your data will be retained for 90 days, then anonymized or deleted</li>
              <li>You may export your data before cancellation</li>
            </ul>
          </section>

          {/* Data Backup & Export */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Data Backup & Export</h2>
            <p className="text-gray-700 mb-4">
              While we maintain regular backups, you are responsible for:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Maintaining independent backups of critical patient data</li>
              <li>Regularly exporting data in portable formats (CSV, JSON, FHIR)</li>
              <li>Verifying data integrity after migration or export</li>
            </ul>
          </section>

          {/* Warranty Disclaimer */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Warranty Disclaimer</h2>
            <div className="bg-gray-100 border border-gray-300 rounded p-4 mb-4">
              <p className="text-gray-800 uppercase font-semibold">
                THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED,
                INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
              </p>
            </div>
            <p className="text-gray-700 mb-4">
              We do not warrant that:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>The Platform will be uninterrupted, error-free, or secure</li>
              <li>AI-generated recommendations will be accurate or complete</li>
              <li>The Platform will meet your specific requirements</li>
              <li>Data transmission will be secure from interception</li>
            </ul>
          </section>

          {/* Limitation of Liability */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Limitation of Liability</h2>
            <div className="bg-gray-100 border border-gray-300 rounded p-4 mb-4">
              <p className="text-gray-800 uppercase font-semibold">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, HOLI LABS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
                SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOST PROFITS, DATA LOSS,
                OR MEDICAL MALPRACTICE CLAIMS ARISING FROM USE OF THE PLATFORM.
              </p>
            </div>
            <p className="text-gray-700 mb-4">
              Our total liability for any claim arising from these Terms or the Service shall not exceed the amount
              you paid to Holi Labs in the 12 months preceding the claim.
            </p>
          </section>

          {/* Indemnification */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Indemnification</h2>
            <p className="text-gray-700 mb-4">
              You agree to indemnify, defend, and hold harmless Holi Labs and its officers, directors, employees, and agents
              from any claims, damages, losses, liabilities, and expenses (including attorneys' fees) arising from:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Your use or misuse of the Platform</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of HIPAA, GDPR, LGPD, or other applicable laws</li>
              <li>Clinical decisions made using the Platform</li>
              <li>Unauthorized access to PHI through your account</li>
            </ul>
          </section>

          {/* Dispute Resolution */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Dispute Resolution & Arbitration</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">15.1 Informal Resolution</h3>
            <p className="text-gray-700 mb-4">
              Before filing a formal dispute, you agree to contact us at{' '}
              <a href="mailto:legal@holilabs.com" className="text-blue-600 hover:underline">legal@holilabs.com</a> to
              attempt informal resolution.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">15.2 Binding Arbitration</h3>
            <p className="text-gray-700 mb-4">
              Any dispute that cannot be resolved informally shall be resolved by binding arbitration in accordance with
              the rules of the American Arbitration Association. You waive your right to a jury trial.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">15.3 Class Action Waiver</h3>
            <p className="text-gray-700 mb-4">
              You agree to resolve disputes on an individual basis and waive the right to participate in class action
              lawsuits or class-wide arbitration.
            </p>
          </section>

          {/* Termination */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. Termination</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">16.1 Termination by You</h3>
            <p className="text-gray-700 mb-4">
              You may terminate your account at any time by contacting support or using account settings.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">16.2 Termination by Holi Labs</h3>
            <p className="text-gray-700 mb-4">
              We may suspend or terminate your access immediately if you:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Violate these Terms or applicable laws</li>
              <li>Engage in fraudulent or malicious activity</li>
              <li>Fail to pay subscription fees</li>
              <li>Pose a security risk to the Platform or other users</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">16.3 Effect of Termination</h3>
            <p className="text-gray-700 mb-4">
              Upon termination:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Your license to use the Platform immediately terminates</li>
              <li>We will retain data as required by law (typically 7 years for medical records)</li>
              <li>You may request data export within 30 days of termination</li>
              <li>Provisions regarding liability, indemnification, and dispute resolution survive termination</li>
            </ul>
          </section>

          {/* Changes to Terms */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">17. Changes to Terms</h2>
            <p className="text-gray-700 mb-4">
              We reserve the right to modify these Terms at any time. We will notify you of material changes by:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Posting a prominent notice on the Platform</li>
              <li>Sending an email to your registered address</li>
              <li>Requiring acceptance upon next login (for significant changes)</li>
            </ul>
            <p className="text-gray-700 mb-4">
              Continued use of the Service after changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          {/* Governing Law */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">18. Governing Law</h2>
            <p className="text-gray-700 mb-4">
              These Terms are governed by the laws of the State of California, United States, without regard to conflict
              of law principles. International users also subject to GDPR (EU), LGPD (Brazil), and other local laws.
            </p>
          </section>

          {/* Severability */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">19. Severability</h2>
            <p className="text-gray-700 mb-4">
              If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited or
              eliminated to the minimum extent necessary, and the remaining provisions will remain in full force and effect.
            </p>
          </section>

          {/* Contact Information */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">20. Contact Information</h2>
            <p className="text-gray-700 mb-4">
              For questions about these Terms, please contact:
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-4">
              <p className="text-gray-800 mb-2">
                <strong>Holi Labs, Inc.</strong><br />
                Legal Department<br />
                Email: <a href="mailto:legal@holilabs.com" className="text-blue-600 hover:underline">legal@holilabs.com</a><br />
                Phone: +1 (555) 123-4567<br />
                Address: [Company Address]
              </p>
            </div>
          </section>

          {/* Acknowledgment */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">21. Acknowledgment</h2>
            <p className="text-gray-700 mb-4">
              BY CLICKING "I ACCEPT" OR BY USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE
              TO BE BOUND BY THESE TERMS OF SERVICE.
            </p>
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
