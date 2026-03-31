'use client';

/**
 * Prescription Verification — Public page to verify prescription authenticity
 *
 * Reference for src/app/verify/prescription/[hash]/page.tsx
 *
 * States: VALID (green), NOT_FOUND (gray), TAMPERED (red), EXPIRED (amber)
 * CYRUS: ZERO PHI on this page — no patient name, no medications, no diagnosis
 * Standalone layout — no dashboard chrome, accessible from any device.
 *
 * @see sprint5-assets/code-scaffolds/icp-brasil-signing.scaffold.ts
 */

import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  AlertTriangle,
  Shield,
  ExternalLink,
  Search,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type VerificationState = 'loading' | 'valid' | 'not_found' | 'tampered' | 'expired';

interface VerificationData {
  prescriberName: string;
  prescriberCRM: string;
  certificateIssuer: string;
  signingDate: string;
  certificateExpiry: string;
  method: 'A1' | 'A3' | 'PIN';
  // CYRUS: NO patient name, NO medications, NO diagnosis, NO PHI
}

// ─── State Config ────────────────────────────────────────────────────────────

const STATE_CONFIG: Record<Exclude<VerificationState, 'loading'>, {
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  title: Record<string, string>;
  description: Record<string, string>;
}> = {
  valid: {
    icon: CheckCircle2,
    iconColor: 'var(--severity-minimal)',
    bgColor: 'bg-severity-minimal/5',
    borderColor: 'border-severity-minimal/30',
    title: { en: 'Valid Prescription', 'pt-BR': 'Prescrição Válida', es: 'Prescripción Válida' },
    description: { en: 'This prescription was digitally signed and its integrity has been verified.', 'pt-BR': 'Esta prescrição foi assinada digitalmente e sua integridade foi verificada.', es: 'Esta prescripción fue firmada digitalmente y su integridad ha sido verificada.' },
  },
  not_found: {
    icon: HelpCircle,
    iconColor: 'var(--text-subtle)',
    bgColor: 'bg-[var(--surface-secondary)]',
    borderColor: 'border-[var(--border-default)]',
    title: { en: 'Prescription Not Found', 'pt-BR': 'Prescrição Não Encontrada', es: 'Prescripción No Encontrada' },
    description: { en: 'This prescription was not found in our records. It may have been issued by another provider.', 'pt-BR': 'Esta prescrição não foi encontrada em nossos registros. Pode ter sido emitida por outro provedor.', es: 'Esta prescripción no fue encontrada en nuestros registros. Puede haber sido emitida por otro proveedor.' },
  },
  tampered: {
    icon: ShieldAlert,
    iconColor: 'var(--severity-critical)',
    bgColor: 'bg-severity-critical/5',
    borderColor: 'border-severity-critical/30',
    title: { en: 'Integrity Verification Failed', 'pt-BR': 'Falha na Verificação de Integridade', es: 'Fallo en la Verificación de Integridad' },
    description: { en: "WARNING: This prescription's integrity could not be verified. It may have been altered after signing.", 'pt-BR': 'ATENÇÃO: A integridade desta prescrição não pôde ser verificada. Ela pode ter sido alterada após a assinatura.', es: 'ADVERTENCIA: La integridad de esta prescripción no pudo ser verificada. Puede haber sido alterada después de la firma.' },
  },
  expired: {
    icon: AlertTriangle,
    iconColor: 'var(--severity-moderate)',
    bgColor: 'bg-severity-moderate/5',
    borderColor: 'border-severity-moderate/30',
    title: { en: 'Certificate Expired', 'pt-BR': 'Certificado Expirado', es: 'Certificado Expirado' },
    description: { en: 'The signing certificate has expired. The prescription was valid at the time of signing.', 'pt-BR': 'O certificado de assinatura expirou. A prescrição era válida no momento da assinatura.', es: 'El certificado de firma ha expirado. La prescripción era válida al momento de la firma.' },
  },
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PrescriptionVerifyPage({ params }: { params: { hash?: string } }) {
  const locale = 'pt-BR'; // TODO: holilabsv2 — detect from browser or URL param
  const [state, setState] = useState<VerificationState>('loading');
  const [data, setData] = useState<VerificationData | null>(null);
  const [manualHash, setManualHash] = useState('');
  const hash = params?.hash || '';

  useEffect(() => {
    if (!hash) { setState('not_found'); return; }
    verifyHash(hash);
  }, [hash]);

  async function verifyHash(h: string) {
    setState('loading');
    try {
      const res = await fetch(`/api/verify/prescription/${h}`);
      if (res.status === 404) { setState('not_found'); return; }
      if (!res.ok) { setState('tampered'); return; }
      const result = await res.json();
      if (result.tampered) { setState('tampered'); return; }
      if (result.expired) { setState('expired'); setData(result); return; }
      setState('valid');
      setData(result);
    } catch {
      setState('not_found');
    }
  }

  const config = state !== 'loading' ? STATE_CONFIG[state] : null;
  const Icon = config?.icon || Shield;

  return (
    <div className="min-h-screen bg-surface-primary flex flex-col items-center justify-center px-md py-xl">
      {/* HoliLabs branding */}
      <div className="mb-xl text-center">
        <h1 className="text-heading-lg font-bold text-[var(--text-foreground)]">HoliLabs</h1>
        <p className="text-body text-[var(--text-muted)]">
          {locale === 'pt-BR' ? 'Verificação de Prescrição Digital' : 'Digital Prescription Verification'}
        </p>
      </div>

      {/* Loading */}
      {state === 'loading' && (
        <div className="flex flex-col items-center gap-md" aria-busy="true" aria-label="Verifying prescription">
          <div className="h-16 w-16 rounded-full border-4 border-[var(--border-default)] border-t-severity-minimal animate-spin" />
          <p className="text-body text-[var(--text-muted)]">
            {locale === 'pt-BR' ? 'Verificando...' : 'Verifying...'}
          </p>
        </div>
      )}

      {/* Result card */}
      {config && (
        <div className={`w-full max-w-md rounded-2xl border ${config.borderColor} ${config.bgColor} px-lg py-lg text-center`}
          role="status" aria-live="polite"
        >
          <Icon className="h-16 w-16 mx-auto mb-md" style={{ color: config.iconColor }} aria-hidden="true" />
          <h2 className="text-heading-md font-bold text-[var(--text-foreground)] mb-sm">
            {config.title[locale] || config.title.en}
          </h2>
          <p className="text-body text-[var(--text-muted)] mb-lg">
            {config.description[locale] || config.description.en}
          </p>

          {/* Verification details — CYRUS: NO PHI here */}
          {data && (state === 'valid' || state === 'expired') && (
            <div className="text-left space-y-sm bg-surface-elevated rounded-xl px-md py-md border border-[var(--border-default)]">
              <div>
                <p className="text-caption text-[var(--text-subtle)]">{locale === 'pt-BR' ? 'Prescritor' : 'Prescriber'}</p>
                <p className="text-body font-semibold text-[var(--text-foreground)]">{data.prescriberName}</p>
                <p className="text-caption text-[var(--text-muted)]">{data.prescriberCRM}</p>
              </div>
              <div>
                <p className="text-caption text-[var(--text-subtle)]">{locale === 'pt-BR' ? 'Data da Assinatura' : 'Signing Date'}</p>
                <p className="text-body text-[var(--text-foreground)]">
                  {new Date(data.signingDate).toLocaleString(locale === 'pt-BR' ? 'pt-BR' : 'en-US')}
                </p>
              </div>
              <div>
                <p className="text-caption text-[var(--text-subtle)]">{locale === 'pt-BR' ? 'Autoridade Certificadora' : 'Certificate Issuer'}</p>
                <p className="text-body text-[var(--text-foreground)]">{data.certificateIssuer}</p>
              </div>
              <div>
                <p className="text-caption text-[var(--text-subtle)]">{locale === 'pt-BR' ? 'Método' : 'Method'}</p>
                <p className="text-body text-[var(--text-foreground)]">
                  {data.method === 'A1' ? 'ICP-Brasil A1 (Software)' : data.method === 'A3' ? 'ICP-Brasil A3 (Token)' : 'PIN Institucional'}
                </p>
              </div>
              {state === 'expired' && (
                <div className="mt-sm rounded-lg bg-severity-moderate/10 px-sm py-xs">
                  <p className="text-caption text-severity-moderate">
                    {locale === 'pt-BR' ? `Certificado expirou em ${new Date(data.certificateExpiry).toLocaleDateString('pt-BR')}` : `Certificate expired on ${new Date(data.certificateExpiry).toLocaleDateString('en-US')}`}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Manual hash entry */}
      {!hash && state !== 'loading' && (
        <div className="w-full max-w-md mt-lg">
          <label className="text-body font-semibold text-[var(--text-foreground)] mb-xs block">
            {locale === 'pt-BR' ? 'Ou insira o código manualmente:' : 'Or enter the code manually:'}
          </label>
          <div className="flex gap-sm">
            <input
              value={manualHash}
              onChange={(e) => setManualHash(e.target.value)}
              placeholder={locale === 'pt-BR' ? 'Código da prescrição' : 'Prescription code'}
              className="flex-1 rounded-lg border border-[var(--border-default)] bg-transparent px-md py-sm text-body min-h-[var(--touch-md)]"
              aria-label="Prescription verification code"
            />
            <button
              onClick={() => manualHash && verifyHash(manualHash)}
              disabled={!manualHash}
              className="rounded-lg bg-[var(--text-foreground)] text-[var(--surface-primary)] px-md py-sm min-h-[var(--touch-md)] disabled:opacity-50"
              aria-label="Verify"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="mt-xl text-caption text-[var(--text-subtle)] text-center">
        HoliLabs &middot; {locale === 'pt-BR' ? 'Plataforma de saúde com IA' : 'AI-powered health platform'}
      </p>
    </div>
  );
}
