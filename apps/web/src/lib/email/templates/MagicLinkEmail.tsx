import React from 'react';

interface MagicLinkEmailProps {
  firstName: string;
  magicLinkUrl: string;
  expiresInMinutes: number;
}

export function MagicLinkEmail({ firstName, magicLinkUrl, expiresInMinutes }: MagicLinkEmailProps) {
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
        padding: '32px',
        textAlign: 'center' as const,
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
          fontSize: 28,
        }}>
          🔐
        </div>
        <h1 style={{ color: '#ffffff', margin: 0, fontSize: 24, fontWeight: 700 }}>
          Sign in to Cortex
        </h1>
      </div>

      {/* Body */}
      <div style={{ padding: '32px' }}>
        <p style={{ fontSize: 16, color: '#1e293b', lineHeight: 1.6, margin: '0 0 16px' }}>
          Hi {firstName},
        </p>
        <p style={{ fontSize: 16, color: '#334155', lineHeight: 1.6, margin: '0 0 28px' }}>
          Click the button below to sign in securely. No password required.
        </p>

        {/* CTA */}
        <div style={{ textAlign: 'center' as const, margin: '0 0 28px' }}>
          <a
            href={magicLinkUrl}
            style={{
              display: 'inline-block',
              background: '#3b82f6',
              color: '#ffffff',
              textDecoration: 'none',
              padding: '14px 40px',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 16,
            }}
          >
            Sign in to Cortex →
          </a>
        </div>

        {/* Expiry notice */}
        <div style={{
          background: '#fefce8',
          border: '1px solid #fde68a',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 24,
        }}>
          <p style={{ fontSize: 13, color: '#92400e', margin: 0 }}>
            This link expires in {expiresInMinutes} minutes and can only be used once.
          </p>
        </div>

        {/* Fallback URL */}
        <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, margin: '0 0 8px' }}>
          If the button doesn&apos;t work, copy and paste this URL:
        </p>
        <p style={{
          fontSize: 12,
          color: '#64748b',
          wordBreak: 'break-all' as const,
          background: '#f8fafc',
          padding: '10px 12px',
          borderRadius: 6,
          border: '1px solid #e2e8f0',
          margin: 0,
          fontFamily: 'monospace',
        }}>
          {magicLinkUrl}
        </p>
      </div>

      {/* Footer */}
      <div style={{
        borderTop: '1px solid #e2e8f0',
        padding: '20px 32px',
        textAlign: 'center' as const,
      }}>
        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
          If you did not request this link, you can safely ignore this email.
          <br />
          © {new Date().getFullYear()} Holi Labs
        </p>
      </div>
    </div>
  );
}
