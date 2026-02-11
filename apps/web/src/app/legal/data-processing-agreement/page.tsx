/**
 * Data Processing Agreement (DPA) Page
 *
 * @compliance GDPR Article 28, LGPD Article 41, HIPAA Business Associate Agreement
 * @updated 2025-12-02
 */

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Data Processing Agreement | Holi Labs',
  description: 'Holi Labs Data Processing Agreement - GDPR, LGPD, and HIPAA compliant data processing terms',
};

export default function DataProcessingAgreementPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8 md:p-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Data Processing Agreement (DPA)</h1>

        <p className="text-sm text-gray-600 mb-8">
          <strong>Last Updated:</strong> December 2, 2025<br />
          <strong>Effective Date:</strong> December 2, 2025
        </p>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
          <p className="text-blue-800">
            <strong>Important:</strong> This Data Processing Agreement (DPA) is incorporated into our Terms of Service
            and applies to all healthcare organizations and covered entities using Holi Labs to process personal data
            or protected health information (PHI).
          </p>
        </div>

        <div className="prose prose-lg max-w-none">
          {/* Introduction */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Parties & Definitions</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">1.1 Parties</h3>
            <p className="text-gray-700 mb-4">
              This Data Processing Agreement ("DPA") is entered into between:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>"Data Controller" / "Covered Entity"</strong> - The healthcare organization or entity that
                determines the purposes and means of processing personal data/PHI (you, the customer)</li>
              <li><strong>"Data Processor" / "Business Associate"</strong> - Holi Labs, Inc., which processes personal
                data/PHI on behalf of the Data Controller</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">1.2 Definitions</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>"Personal Data"</strong> - Any information relating to an identified or identifiable natural person
                as defined by GDPR and LGPD</li>
              <li><strong>"PHI"</strong> - Protected Health Information as defined by HIPAA (45 CFR § 160.103)</li>
              <li><strong>"Processing"</strong> - Any operation performed on Personal Data or PHI, including collection,
                storage, use, disclosure, or deletion</li>
              <li><strong>"Data Subject"</strong> - The individual to whom Personal Data or PHI relates (patients, users)</li>
              <li><strong>"Sub-processor"</strong> - Third-party service providers engaged by Holi Labs to process data</li>
            </ul>
          </section>

          {/* Scope of Processing */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Scope of Data Processing</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1 Purpose</h3>
            <p className="text-gray-700 mb-4">
              Holi Labs processes Personal Data and PHI solely to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Provide the healthcare management platform and related services</li>
              <li>Support treatment, payment, and healthcare operations (TPO)</li>
              <li>Comply with legal and regulatory obligations</li>
              <li>Perform functions as instructed by the Data Controller</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.2 Types of Data Processed</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Patient demographics (name, date of birth, contact information)</li>
              <li>Medical records, clinical notes, and treatment plans</li>
              <li>Diagnoses, medications, and lab results</li>
              <li>Appointment schedules and billing information</li>
              <li>Healthcare provider information</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.3 Categories of Data Subjects</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Patients receiving healthcare services</li>
              <li>Healthcare providers and clinicians</li>
              <li>Administrative staff and authorized users</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.4 Duration of Processing</h3>
            <p className="text-gray-700 mb-4">
              Processing will continue for the duration of the Service Agreement, plus any retention period required
              by applicable law (typically 7 years for medical records under HIPAA).
            </p>
          </section>

          {/* Processor Obligations */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Data Processor Obligations</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1 Lawful Processing (GDPR Article 28)</h3>
            <p className="text-gray-700 mb-4">
              Holi Labs shall:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Process Personal Data only on documented instructions from the Data Controller</li>
              <li>Ensure personnel authorized to process data are bound by confidentiality obligations</li>
              <li>Implement appropriate technical and organizational measures to ensure data security</li>
              <li>Engage Sub-processors only with prior written authorization</li>
              <li>Assist the Data Controller in responding to Data Subject requests (DSR)</li>
              <li>Delete or return Personal Data upon termination of services (unless retention is required by law)</li>
              <li>Maintain records of processing activities as required by GDPR Article 30</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2 HIPAA Business Associate Obligations</h3>
            <p className="text-gray-700 mb-4">
              Holi Labs agrees to comply with HIPAA Privacy Rule (45 CFR Part 160 and Part 164, Subpart E) and shall:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Use and disclose PHI only as permitted by this DPA or as required by law</li>
              <li>Use appropriate safeguards to prevent unauthorized use or disclosure of PHI</li>
              <li>Report Security Incidents and Breaches to the Covered Entity within 72 hours of discovery</li>
              <li>Ensure Sub-contractors (Subprocessors) comply with HIPAA via signed Business Associate Agreements</li>
              <li>Make PHI available to Data Subjects as required by 45 CFR § 164.524</li>
              <li>Make PHI available for amendment as required by 45 CFR § 164.526</li>
              <li>Provide an accounting of disclosures as required by 45 CFR § 164.528</li>
              <li>Make internal practices, books, and records available to HHS for compliance review</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.3 LGPD Controller-Processor Obligations (Brazil)</h3>
            <p className="text-gray-700 mb-4">
              In accordance with LGPD Article 41, Holi Labs shall:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Process personal data only under the Controller's instructions</li>
              <li>Maintain security measures proportionate to the nature of the data</li>
              <li>Communicate security incidents to the Controller immediately</li>
              <li>Delete personal data after the processing purpose is fulfilled (unless legal retention applies)</li>
            </ul>
          </section>

          {/* Security Measures */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Technical & Organizational Security Measures</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 Encryption</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Data in Transit:</strong> TLS 1.3 encryption for all data transmission</li>
              <li><strong>Data at Rest:</strong> AES-256 encryption for all stored PHI and Personal Data</li>
              <li><strong>Database Encryption:</strong> Encrypted PostgreSQL database with encrypted backups</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.2 Access Controls</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Role-Based Access Control (RBAC) - users access only data necessary for their role</li>
              <li>Multi-Factor Authentication (MFA) required for all user accounts</li>
              <li>Automatic session timeout after 30 minutes of inactivity</li>
              <li>Principle of Least Privilege enforced across all systems</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.3 Audit Logging</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Comprehensive audit logs for all PHI/Personal Data access</li>
              <li>Immutable audit trail retained for 7 years (HIPAA requirement)</li>
              <li>Logs include: User ID, timestamp, action, IP address, resource accessed</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.4 Infrastructure Security</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>HIPAA-compliant cloud hosting (AWS/Google Cloud with signed BAAs)</li>
              <li>Regular penetration testing and vulnerability assessments</li>
              <li>Intrusion detection and prevention systems (IDS/IPS)</li>
              <li>Firewalls, network segmentation, and DDoS protection</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.5 Employee Security</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Annual HIPAA and security awareness training</li>
              <li>Background checks for employees with access to PHI</li>
              <li>Confidentiality agreements signed by all personnel</li>
              <li>Immediate access revocation upon employee termination</li>
            </ul>
          </section>

          {/* Sub-processors */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Sub-processors</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">5.1 Authorization</h3>
            <p className="text-gray-700 mb-4">
              The Data Controller authorizes Holi Labs to engage the Sub-processors listed below. Holi Labs will:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Ensure all Sub-processors sign Business Associate Agreements (HIPAA) or Data Processing Agreements (GDPR/LGPD)</li>
              <li>Provide 30 days' notice before engaging new Sub-processors</li>
              <li>Allow the Data Controller to object to new Sub-processors within 14 days</li>
              <li>Remain fully liable for Sub-processor actions</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">5.2 Current Sub-processors</h3>
            <table className="min-w-full border border-gray-300 mb-4">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left">Sub-processor</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Service</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Location</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Compliance</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Amazon Web Services (AWS)</td>
                  <td className="border border-gray-300 px-4 py-2">Cloud hosting & database</td>
                  <td className="border border-gray-300 px-4 py-2">US (us-east-1)</td>
                  <td className="border border-gray-300 px-4 py-2">HIPAA BAA, GDPR</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Google Cloud Platform</td>
                  <td className="border border-gray-300 px-4 py-2">AI/ML services (de-identified data only)</td>
                  <td className="border border-gray-300 px-4 py-2">US</td>
                  <td className="border border-gray-300 px-4 py-2">HIPAA BAA, GDPR</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">SendGrid (Twilio)</td>
                  <td className="border border-gray-300 px-4 py-2">Email delivery</td>
                  <td className="border border-gray-300 px-4 py-2">US</td>
                  <td className="border border-gray-300 px-4 py-2">HIPAA BAA</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Sentry</td>
                  <td className="border border-gray-300 px-4 py-2">Error monitoring (no PHI)</td>
                  <td className="border border-gray-300 px-4 py-2">US</td>
                  <td className="border border-gray-300 px-4 py-2">GDPR</td>
                </tr>
              </tbody>
            </table>
            <p className="text-gray-700 mb-4">
              <strong>Note:</strong> We do not transfer PHI to AI/ML services. Only de-identified data is used for
              model training and clinical decision support, in compliance with HIPAA de-identification standards
              (45 CFR § 164.514).
            </p>
          </section>

          {/* Data Subject Rights */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Subject Rights & Requests</h2>

            <p className="text-gray-700 mb-4">
              Holi Labs will assist the Data Controller in fulfilling Data Subject Rights requests, including:
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">6.1 GDPR Rights</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Right to Access:</strong> Provide copies of Personal Data within 30 days</li>
              <li><strong>Right to Rectification:</strong> Correct inaccurate Personal Data</li>
              <li><strong>Right to Erasure:</strong> Delete Personal Data (Right to Be Forgotten - Article 17)</li>
              <li><strong>Right to Data Portability:</strong> Export data in CSV, JSON, or FHIR format</li>
              <li><strong>Right to Restriction:</strong> Temporarily restrict processing</li>
              <li><strong>Right to Object:</strong> Object to processing for specific purposes</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">6.2 HIPAA Rights</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Right to Access:</strong> Provide copies of PHI within 30 days (45 CFR § 164.524)</li>
              <li><strong>Right to Amend:</strong> Allow amendments to PHI (45 CFR § 164.526)</li>
              <li><strong>Right to Accounting:</strong> Provide disclosure history (45 CFR § 164.528)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">6.3 LGPD Rights (Brazil)</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Right to Confirmation:</strong> Confirm existence of data processing</li>
              <li><strong>Right to Access:</strong> Provide access to stored Personal Data</li>
              <li><strong>Right to Correction:</strong> Correct incomplete or inaccurate data</li>
              <li><strong>Right to Deletion:</strong> Delete Personal Data (Article 18)</li>
            </ul>

            <p className="text-gray-700 mb-4">
              <strong>Response Time:</strong> Holi Labs will respond to Data Subject Requests within 30 days
              (or as required by applicable law).
            </p>
          </section>

          {/* Data Breach Notification */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Data Breach Notification</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">7.1 Discovery & Notification</h3>
            <p className="text-gray-700 mb-4">
              Upon discovery of a Security Incident or Data Breach affecting Personal Data or PHI, Holi Labs will:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>GDPR/LGPD:</strong> Notify the Data Controller within 72 hours</li>
              <li><strong>HIPAA:</strong> Notify the Covered Entity without unreasonable delay (typically within 72 hours)</li>
              <li>Provide details of the breach, including affected data, number of individuals, and mitigation steps</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">7.2 Breach Response</h3>
            <p className="text-gray-700 mb-4">
              Holi Labs will:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Immediately contain the breach and prevent further unauthorized access</li>
              <li>Conduct forensic investigation to determine root cause</li>
              <li>Implement remediation measures to prevent recurrence</li>
              <li>Cooperate with regulatory authorities (HHS, ICO, ANPD) as required</li>
              <li>Provide documentation and evidence for breach investigations</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">7.3 Controller Notification Obligations</h3>
            <p className="text-gray-700 mb-4">
              The Data Controller retains responsibility for:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Notifying affected Data Subjects (if required by law)</li>
              <li>Notifying regulatory authorities (HHS, supervisory authorities)</li>
              <li>Determining whether breach meets notification thresholds</li>
            </ul>
          </section>

          {/* International Data Transfers */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. International Data Transfers</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">8.1 Data Storage Locations</h3>
            <p className="text-gray-700 mb-4">
              Primary data storage: United States (AWS us-east-1)<br />
              Backup storage: United States (AWS us-west-2)
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">8.2 GDPR Transfer Mechanisms</h3>
            <p className="text-gray-700 mb-4">
              For EU Data Subjects, we rely on:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>EU Standard Contractual Clauses (SCCs) approved by the European Commission</li>
              <li>Supplementary measures to ensure adequate data protection</li>
              <li>Privacy Shield successor framework (if applicable)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">8.3 LGPD International Transfers (Brazil)</h3>
            <p className="text-gray-700 mb-4">
              For Brazilian Data Subjects, we rely on:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>LGPD Article 33 transfer mechanisms</li>
              <li>Standard contractual clauses approved by ANPD</li>
              <li>Adequate safeguards to protect Personal Data</li>
            </ul>
          </section>

          {/* Data Retention & Deletion */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Data Retention & Deletion</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">9.1 Retention Period</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Medical Records:</strong> Minimum 7 years (HIPAA requirement, may be longer per state law)</li>
              <li><strong>Audit Logs:</strong> 7 years (HIPAA requirement)</li>
              <li><strong>Backup Data:</strong> 30 days rolling retention</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">9.2 Data Deletion Upon Termination</h3>
            <p className="text-gray-700 mb-4">
              Upon termination of services, Holi Labs will:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Return or delete all Personal Data and PHI as instructed by the Data Controller</li>
              <li>Provide 30-day window for data export before deletion</li>
              <li>Certify in writing that all data has been deleted (except data retained by legal obligation)</li>
              <li>Permanently delete data from backups within 90 days</li>
            </ul>
          </section>

          {/* Audit Rights */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Audit Rights</h2>

            <p className="text-gray-700 mb-4">
              The Data Controller may audit Holi Labs' compliance with this DPA:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Upon reasonable written notice (minimum 30 days)</li>
              <li>During normal business hours</li>
              <li>Not more than once per year (unless required by regulatory authority)</li>
            </ul>
            <p className="text-gray-700 mb-4">
              Holi Labs will provide:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Security documentation and reports (when available)</li>
              <li>Compliance-related documentation (when available)</li>
              <li>Security policy documentation</li>
              <li>Cooperation with third-party auditors (at Controller's expense)</li>
            </ul>
          </section>

          {/* Term & Termination */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Term & Termination</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">11.1 Term</h3>
            <p className="text-gray-700 mb-4">
              This DPA remains in effect for the duration of the Service Agreement or until all Personal Data/PHI
              is deleted or returned.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">11.2 Termination for Breach</h3>
            <p className="text-gray-700 mb-4">
              Either party may terminate this DPA if:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>The other party materially breaches the DPA and fails to cure within 30 days</li>
              <li>Required by regulatory authority (HHS, ICO, ANPD)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">11.3 Effect of Termination</h3>
            <p className="text-gray-700 mb-4">
              Upon termination, provisions regarding data deletion, audit rights, and liability survive.
            </p>
          </section>

          {/* Liability & Indemnification */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Liability & Indemnification</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">12.1 Processor Liability</h3>
            <p className="text-gray-700 mb-4">
              Holi Labs is liable for:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Damage caused by processing that violates GDPR, LGPD, or HIPAA</li>
              <li>Actions of Sub-processors engaged without proper authorization</li>
              <li>Failure to implement appropriate security measures</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">12.2 Limitation</h3>
            <p className="text-gray-700 mb-4">
              Liability is subject to limitations in the Terms of Service, except where prohibited by law
              (e.g., GDPR fines cannot be contractually limited).
            </p>
          </section>

          {/* Governing Law */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Governing Law & Jurisdiction</h2>
            <p className="text-gray-700 mb-4">
              This DPA is governed by:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>GDPR:</strong> EU Regulation 2016/679 and applicable member state laws</li>
              <li><strong>HIPAA:</strong> 45 CFR Parts 160 and 164 (United States)</li>
              <li><strong>LGPD:</strong> Lei 13.709/2018 (Brazil)</li>
              <li><strong>General:</strong> Laws of the State of California, USA (unless superseded by data protection laws)</li>
            </ul>
          </section>

          {/* Contact Information */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Contact Information</h2>
            <p className="text-gray-700 mb-4">
              For questions about this DPA, please contact:
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-4">
              <p className="text-gray-800 mb-2">
                <strong>Data Protection Officer (DPO)</strong><br />
                Holi Labs, Inc.<br />
                Email: <a href="mailto:dpo@holilabs.com" className="text-blue-600 hover:underline">dpo@holilabs.com</a><br />
                Legal Department: <a href="mailto:legal@holilabs.com" className="text-blue-600 hover:underline">legal@holilabs.com</a><br />
                Phone: +1 (555) 123-4567
              </p>
            </div>
          </section>

          {/* Acknowledgment */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Acknowledgment</h2>
            <p className="text-gray-700 mb-4">
              By using Holi Labs, the Data Controller acknowledges that this DPA is incorporated into the Terms of
              Service and constitutes a legally binding agreement.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            © {new Date().getFullYear()} Holi Labs, Inc. All rights reserved.<br />
            <a href="/legal/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</a> •
            <a href="/legal/terms-of-service" className="text-blue-600 hover:underline ml-1">Terms of Service</a> •
            <a href="/legal/cookie-policy" className="text-blue-600 hover:underline ml-1">Cookie Policy</a> •
            <a href="/legal/data-processing-agreement" className="text-blue-600 hover:underline ml-1">Data Processing Agreement</a>
          </p>
        </div>
      </div>
    </div>
  );
}
