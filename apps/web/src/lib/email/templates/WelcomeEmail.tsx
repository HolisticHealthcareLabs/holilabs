import React from 'react';

interface WelcomeEmailProps {
  firstName: string;
  username: string;
  loginUrl: string;
  isDemoMode?: boolean;
}

export function WelcomeEmail({ firstName, username, loginUrl, isDemoMode }: WelcomeEmailProps) {
  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      maxWidth: 600,
      margin: '0 auto',
      backgroundColor: '#ffffff',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #014751 0%, #0c4a6e 100%)',
        borderRadius: '16px 16px 0 0',
        padding: '40px 32px',
        textAlign: 'center' as const,
      }}>
        <h1 style={{ color: '#ffffff', margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px' }}>
          Welcome to Cortex
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', margin: '8px 0 0', fontSize: 14 }}>
          by Holi Labs
        </p>
      </div>

      {/* Body */}
      <div style={{ padding: '32px', backgroundColor: '#ffffff' }}>
        <p style={{ fontSize: 16, color: '#1e293b', lineHeight: 1.6, margin: '0 0 16px' }}>
          Hi {firstName},
        </p>
        <p style={{ fontSize: 16, color: '#334155', lineHeight: 1.6, margin: '0 0 24px' }}>
          Your clinician account is ready. You can sign in immediately with the credentials you created during registration.
        </p>

        {/* Username card */}
        <div style={{
          background: '#f1f5f9',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 24,
          border: '1px solid #e2e8f0',
        }}>
          <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 4px', textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontWeight: 600 }}>
            Your username
          </p>
          <p style={{ fontSize: 18, color: '#0f172a', margin: 0, fontWeight: 600, fontFamily: 'monospace' }}>
            @{username}
          </p>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center' as const, margin: '32px 0' }}>
          <a
            href={loginUrl}
            style={{
              display: 'inline-block',
              background: '#014751',
              color: '#ffffff',
              textDecoration: 'none',
              padding: '14px 32px',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 16,
            }}
          >
            Sign in to Cortex
          </a>
        </div>

        {isDemoMode && (
          <div style={{
            background: '#eff6ff',
            borderLeft: '4px solid #3b82f6',
            borderRadius: '0 8px 8px 0',
            padding: '12px 16px',
            marginBottom: 24,
          }}>
            <p style={{ fontSize: 14, color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
              <strong>Demo Mode enabled.</strong> After sign-in, you can load sample patients from the top bar to explore the platform.
            </p>
          </div>
        )}

        {/* What's available */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 24, marginTop: 24 }}>
          <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 12px', fontWeight: 600 }}>
            What you can do now:
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
            <tbody>
              {[
                'Run safety checks on prescriptions with traffic-light alerts',
                'Access the Prevention Hub with longitudinal care protocols',
                'View the live Governance Console for audit and compliance',
                'Create and share collaborative clinical templates',
              ].map((item, i) => (
                <tr key={i}>
                  <td style={{ padding: '6px 0', verticalAlign: 'top', width: 24 }}>
                    <span style={{ color: '#10b981', fontSize: 16 }}>✓</span>
                  </td>
                  <td style={{ padding: '6px 0', fontSize: 14, color: '#475569', lineHeight: 1.5 }}>
                    {item}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        borderTop: '1px solid #e2e8f0',
        padding: '20px 32px',
        textAlign: 'center' as const,
      }}>
        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
          © {new Date().getFullYear()} Holi Labs. All rights reserved.
          <br />
          If you did not create this account, please contact support.
        </p>
      </div>
    </div>
  );
}
