/**
 * Cookie Policy Page
 *
 * @compliance GDPR, LGPD, ePrivacy Directive
 * @updated 2025-12-02
 */

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy | Holi Labs',
  description: 'Holi Labs Cookie Policy - How we use cookies and tracking technologies',
};

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8 md:p-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Cookie Policy</h1>

        <p className="text-sm text-gray-600 mb-8">
          <strong>Last Updated:</strong> December 2, 2025<br />
          <strong>Effective Date:</strong> December 2, 2025
        </p>

        <div className="prose prose-lg max-w-none">
          {/* Introduction */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. What Are Cookies?</h2>
            <p className="text-gray-700 mb-4">
              Cookies are small text files stored on your device (computer, smartphone, tablet) when you visit websites.
              They help websites remember your preferences, improve user experience, and provide analytics about site usage.
            </p>
            <p className="text-gray-700 mb-4">
              This Cookie Policy explains how Holi Labs, Inc. ("we," "us," or "our") uses cookies and similar tracking
              technologies on our healthcare management platform (the "Platform").
            </p>
          </section>

          {/* Types of Cookies */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Types of Cookies We Use</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1 Strictly Necessary Cookies (Essential)</h3>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
              <p className="text-blue-800">
                <strong>Cannot be disabled</strong> - These cookies are essential for the Platform to function and cannot
                be turned off. Without them, core features like user authentication and security would not work.
              </p>
            </div>
            <table className="min-w-full border border-gray-300 mb-4">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left">Cookie Name</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Purpose</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-4 py-2"><code>auth_token</code></td>
                  <td className="border border-gray-300 px-4 py-2">User authentication and session management</td>
                  <td className="border border-gray-300 px-4 py-2">Session / 7 days</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2"><code>csrf_token</code></td>
                  <td className="border border-gray-300 px-4 py-2">Cross-Site Request Forgery (CSRF) protection</td>
                  <td className="border border-gray-300 px-4 py-2">Session</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2"><code>session_id</code></td>
                  <td className="border border-gray-300 px-4 py-2">Maintains user session state</td>
                  <td className="border border-gray-300 px-4 py-2">Session</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2"><code>secure_cookie</code></td>
                  <td className="border border-gray-300 px-4 py-2">Ensures secure transmission (HTTPS only)</td>
                  <td className="border border-gray-300 px-4 py-2">Session</td>
                </tr>
              </tbody>
            </table>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.2 Functional Cookies (Preference)</h3>
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
              <p className="text-green-800">
                <strong>Can be disabled</strong> - These cookies remember your preferences and settings to enhance your experience.
              </p>
            </div>
            <table className="min-w-full border border-gray-300 mb-4">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left">Cookie Name</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Purpose</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-4 py-2"><code>theme_preference</code></td>
                  <td className="border border-gray-300 px-4 py-2">Remembers dark/light mode preference</td>
                  <td className="border border-gray-300 px-4 py-2">1 year</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2"><code>language_pref</code></td>
                  <td className="border border-gray-300 px-4 py-2">Stores language preference (EN, PT, ES)</td>
                  <td className="border border-gray-300 px-4 py-2">1 year</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2"><code>timezone</code></td>
                  <td className="border border-gray-300 px-4 py-2">Remembers timezone for appointments</td>
                  <td className="border border-gray-300 px-4 py-2">1 year</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2"><code>cookieConsent</code></td>
                  <td className="border border-gray-300 px-4 py-2">Stores your cookie consent preferences</td>
                  <td className="border border-gray-300 px-4 py-2">1 year</td>
                </tr>
              </tbody>
            </table>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.3 Analytics Cookies (Performance)</h3>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <p className="text-yellow-800">
                <strong>Can be disabled</strong> - These cookies help us understand how users interact with the Platform
                to improve performance and user experience.
              </p>
            </div>
            <table className="min-w-full border border-gray-300 mb-4">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left">Cookie Name</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Purpose</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-4 py-2"><code>_ga</code></td>
                  <td className="border border-gray-300 px-4 py-2">Google Analytics - distinguishes users</td>
                  <td className="border border-gray-300 px-4 py-2">2 years</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2"><code>_gid</code></td>
                  <td className="border border-gray-300 px-4 py-2">Google Analytics - distinguishes users</td>
                  <td className="border border-gray-300 px-4 py-2">24 hours</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2"><code>analytics_session</code></td>
                  <td className="border border-gray-300 px-4 py-2">Tracks session duration and page views</td>
                  <td className="border border-gray-300 px-4 py-2">30 minutes</td>
                </tr>
              </tbody>
            </table>
            <p className="text-gray-700 mb-4">
              <strong>Note:</strong> We use anonymized analytics data and do NOT track individual patients or PHI.
              All analytics comply with HIPAA de-identification standards.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.4 Marketing Cookies (Targeting)</h3>
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <p className="text-red-800">
                <strong>Currently NOT used</strong> - We do not use marketing or advertising cookies. If this changes
                in the future, we will update this policy and request explicit consent.
              </p>
            </div>
          </section>

          {/* HIPAA Compliance */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. HIPAA Compliance & PHI Protection</h2>
            <div className="bg-blue-100 border border-blue-300 rounded-lg p-6 mb-4">
              <p className="text-blue-900 font-semibold mb-2">Important Privacy Notice</p>
              <p className="text-blue-800">
                We do NOT store Protected Health Information (PHI) or personally identifiable information (PII) in cookies.
                Cookies only contain session identifiers and non-sensitive preference data.
              </p>
            </div>
            <p className="text-gray-700 mb-4">
              All PHI is:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Stored securely on our HIPAA-compliant servers</li>
              <li>Encrypted at rest (AES-256) and in transit (TLS 1.3)</li>
              <li>Never transmitted via cookies or browser storage</li>
              <li>Subject to strict access controls and audit logging</li>
            </ul>
          </section>

          {/* Third-Party Cookies */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Third-Party Cookies</h2>
            <p className="text-gray-700 mb-4">
              We use carefully vetted third-party services that may set cookies. All third-party vendors sign Business
              Associate Agreements (BAAs) and comply with HIPAA requirements.
            </p>
            <table className="min-w-full border border-gray-300 mb-4">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left">Service</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Purpose</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Privacy Policy</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Google Analytics</td>
                  <td className="border border-gray-300 px-4 py-2">Anonymous usage analytics</td>
                  <td className="border border-gray-300 px-4 py-2">
                    <a href="https://policies.google.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                      View Policy
                    </a>
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Sentry (Error Tracking)</td>
                  <td className="border border-gray-300 px-4 py-2">Error monitoring and debugging</td>
                  <td className="border border-gray-300 px-4 py-2">
                    <a href="https://sentry.io/privacy/" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                      View Policy
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* How to Control Cookies */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. How to Control & Manage Cookies</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">5.1 Cookie Consent Banner</h3>
            <p className="text-gray-700 mb-4">
              When you first visit the Platform, a cookie consent banner will appear asking for your preferences.
              You can choose to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Accept All:</strong> Enable all cookies (essential, functional, analytics)</li>
              <li><strong>Reject Non-Essential:</strong> Only essential cookies enabled</li>
              <li><strong>Customize:</strong> Choose which cookie categories to enable</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">5.2 Browser Settings</h3>
            <p className="text-gray-700 mb-4">
              You can control cookies through your browser settings:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>
                <strong>Chrome:</strong> Settings → Privacy and Security → Cookies and other site data
                (<a href="https://support.google.com/chrome/answer/95647" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Instructions</a>)
              </li>
              <li>
                <strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data
                (<a href="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Instructions</a>)
              </li>
              <li>
                <strong>Safari:</strong> Preferences → Privacy → Manage Website Data
                (<a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Instructions</a>)
              </li>
              <li>
                <strong>Edge:</strong> Settings → Cookies and site permissions
                (<a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Instructions</a>)
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">5.3 Change Cookie Preferences</h3>
            <p className="text-gray-700 mb-4">
              You can change your cookie preferences at any time by:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Clicking the "Cookie Settings" link in the footer</li>
              <li>Visiting your Account Settings → Privacy → Cookie Preferences</li>
              <li>Clearing your browser cookies (this will reset all preferences)</li>
            </ul>

            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
              <p className="text-yellow-800">
                <strong>Warning:</strong> Blocking essential cookies will prevent you from using the Platform.
                Some features may not work properly if functional or analytics cookies are disabled.
              </p>
            </div>
          </section>

          {/* Do Not Track */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Do Not Track (DNT) Signals</h2>
            <p className="text-gray-700 mb-4">
              Some browsers support "Do Not Track" (DNT) signals. Currently, there is no universal standard for
              how websites should respond to DNT signals.
            </p>
            <p className="text-gray-700 mb-4">
              We respect user privacy and:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Do not track users across third-party websites</li>
              <li>Do not sell user data to third parties</li>
              <li>Honor cookie consent preferences regardless of DNT settings</li>
            </ul>
          </section>

          {/* Cookie Lifetime */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Cookie Lifetime & Expiration</h2>
            <p className="text-gray-700 mb-4">
              Cookies have different lifespans:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Session Cookies:</strong> Deleted when you close your browser</li>
              <li><strong>Persistent Cookies:</strong> Remain until expiration date or manual deletion</li>
            </ul>
            <p className="text-gray-700 mb-4">
              Maximum cookie duration: 2 years (as required by GDPR Article 5)
            </p>
          </section>

          {/* International Users */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. International Users (GDPR/LGPD)</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">8.1 European Union (GDPR)</h3>
            <p className="text-gray-700 mb-4">
              Under the EU ePrivacy Directive and GDPR, we:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Obtain explicit consent before setting non-essential cookies</li>
              <li>Provide clear information about cookie purposes</li>
              <li>Allow users to withdraw consent at any time</li>
              <li>Do not use cookies to track users without consent</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">8.2 Brazil (LGPD)</h3>
            <p className="text-gray-700 mb-4">
              Under LGPD (Lei Geral de Proteção de Dados), we:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Comply with Article 10 (data processing consent requirements)</li>
              <li>Provide transparency about data collection via cookies</li>
              <li>Honor user rights to access, correct, and delete cookie data</li>
            </ul>
          </section>

          {/* Updates to Policy */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Updates to This Cookie Policy</h2>
            <p className="text-gray-700 mb-4">
              We may update this Cookie Policy periodically to reflect:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Changes in our cookie usage practices</li>
              <li>New features or services</li>
              <li>Legal or regulatory requirements</li>
            </ul>
            <p className="text-gray-700 mb-4">
              We will notify you of significant changes by:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Displaying a prominent notice on the Platform</li>
              <li>Updating the "Last Updated" date at the top of this policy</li>
              <li>Re-requesting consent if required by law</li>
            </ul>
          </section>

          {/* Contact Information */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Contact Us</h2>
            <p className="text-gray-700 mb-4">
              If you have questions about our use of cookies, please contact:
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-4">
              <p className="text-gray-800 mb-2">
                <strong>Data Protection Officer (DPO)</strong><br />
                Holi Labs, Inc.<br />
                Email: <a href="mailto:dpo@holilabs.com" className="text-blue-600 hover:underline">dpo@holilabs.com</a><br />
                Privacy Inquiries: <a href="mailto:privacy@holilabs.com" className="text-blue-600 hover:underline">privacy@holilabs.com</a><br />
                Phone: +1 (555) 123-4567
              </p>
            </div>
          </section>

          {/* Additional Resources */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Additional Resources</h2>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><a href="/legal/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</a></li>
              <li><a href="/legal/terms-of-service" className="text-blue-600 hover:underline">Terms of Service</a></li>
              <li><a href="https://www.aboutcookies.org" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">All About Cookies</a></li>
              <li><a href="https://www.youronlinechoices.eu" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Your Online Choices (EU)</a></li>
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
