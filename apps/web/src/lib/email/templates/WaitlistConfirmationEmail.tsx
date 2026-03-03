import React from 'react';

interface WaitlistConfirmationEmailProps {
  firstName: string | null;
}

export function WaitlistConfirmationEmail({ firstName }: WaitlistConfirmationEmailProps) {
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
          Request received
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
          margin: '0 0 20px',
        }}>
          We received your request for Cortex. We are reviewing your details and will be in touch within 48 hours.
        </p>
        <p style={{
          fontSize: 15,
          color: '#424245',
          lineHeight: 1.6,
          margin: '0 0 20px',
        }}>
          Our team will verify your organization and send an invite to set up your workspace.
        </p>

        {/* Divider */}
        <div style={{
          borderTop: '1px solid #e8e8ed',
          margin: '28px 0',
        }} />

        <p style={{
          fontSize: 13,
          color: '#86868b',
          lineHeight: 1.5,
          margin: 0,
        }}>
          No action is needed from you right now.
        </p>
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
          This email was sent because you requested access.
        </p>
      </div>
    </div>
  );
}
