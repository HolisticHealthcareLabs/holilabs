import React from 'react';

interface ApprovalInviteEmailProps {
  firstName: string | null;
  onboardingUrl: string;
}

export function ApprovalInviteEmail({ firstName, onboardingUrl }: ApprovalInviteEmailProps) {
  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
      maxWidth: 560,
      margin: '0 auto',
      backgroundColor: '#ffffff',
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#000000',
        padding: '48px 40px 40px',
        textAlign: 'center' as const,
      }}>
        <div style={{
          width: 40,
          height: 40,
          backgroundColor: '#0071e3',
          borderRadius: 10,
          margin: '0 auto 20px',
          lineHeight: '40px',
          fontSize: 20,
          fontWeight: 700,
          color: '#ffffff',
        }}>
          C
        </div>
        <h1 style={{
          color: '#ffffff',
          margin: 0,
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: '-0.5px',
        }}>
          Your pilot is ready
        </h1>
      </div>

      {/* Body */}
      <div style={{ padding: '36px 40px' }}>
        <p style={{
          fontSize: 15,
          color: '#1d1d1f',
          lineHeight: 1.6,
          margin: '0 0 20px',
        }}>
          {firstName ? `Hi ${firstName},` : 'Hi,'}
        </p>
        <p style={{
          fontSize: 15,
          color: '#424245',
          lineHeight: 1.6,
          margin: '0 0 28px',
        }}>
          Your hospital&apos;s Cortex pilot is ready. Click below to set up your account and workspace.
        </p>

        {/* CTA Button */}
        <div style={{ textAlign: 'center' as const, margin: '0 0 28px' }}>
          <a
            href={onboardingUrl}
            style={{
              display: 'inline-block',
              backgroundColor: '#0071e3',
              color: '#ffffff',
              textDecoration: 'none',
              padding: '14px 36px',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 15,
              letterSpacing: '-0.2px',
            }}
          >
            Set up your workspace
          </a>
        </div>

        <p style={{
          fontSize: 13,
          color: '#86868b',
          lineHeight: 1.5,
          margin: '0 0 20px',
          textAlign: 'center' as const,
        }}>
          This link is single-use. It expires once your account is created.
        </p>

        {/* Divider */}
        <div style={{
          borderTop: '1px solid #e8e8ed',
          margin: '28px 0',
        }} />

        {/* What to expect */}
        <p style={{
          fontSize: 13,
          color: '#424245',
          lineHeight: 1.6,
          margin: '0 0 8px',
          fontWeight: 600,
        }}>
          What happens next:
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
          <tbody>
            {[
              'Create your password and workspace',
              'Invite your clinical team',
              'Run your first safety check',
            ].map((item, i) => (
              <tr key={i}>
                <td style={{ padding: '4px 0', verticalAlign: 'top', width: 20 }}>
                  <span style={{ color: '#0071e3', fontSize: 13 }}>{i + 1}.</span>
                </td>
                <td style={{ padding: '4px 0', fontSize: 13, color: '#424245', lineHeight: 1.5 }}>
                  {item}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{
        borderTop: '1px solid #e8e8ed',
        padding: '20px 40px',
        textAlign: 'center' as const,
      }}>
        <p style={{
          fontSize: 11,
          color: '#86868b',
          margin: 0,
          lineHeight: 1.5,
        }}>
          Cortex by Holi Labs — Clinical safety infrastructure
          <br />
          If you did not request this, ignore this email.
        </p>
      </div>
    </div>
  );
}
