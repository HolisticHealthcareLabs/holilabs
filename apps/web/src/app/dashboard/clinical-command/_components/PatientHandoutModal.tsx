'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { m, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, MessageSquare, Mail, Stethoscope } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Mock handout content (Portuguese — LATAM default)
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_HANDOUT = `Resumo da sua Consulta de Hoje

Prezado(a) paciente,

Realizamos sua consulta hoje e chegamos às seguintes conclusões e orientações:

SEUS DIAGNÓSTICOS ATUAIS:
• Insuficiência Cardíaca (coração com dificuldade de bombear sangue)
• Diabetes Tipo 2 (açúcar no sangue elevado — ICD-10: E11.9)
• Pressão Alta — ICD-10: I10
• Doença Renal Crônica Estágio 3 — ICD-10: N18.3

SEUS MEDICAMENTOS:
1. Metformina 1000mg — ATENÇÃO: NÃO tome antes de qualquer exame com contraste. Avise qualquer médico que for te atender imediatamente.
2. Lisinopril 10mg — continue tomando diariamente para a pressão arterial.
3. Atorvastatina 40mg — continue tomando para controle do colesterol.
4. Furosemida 40mg — continue tomando para reduzir o inchaço.
5. AAS 100mg — continue tomando para proteção cardiovascular.

EXAMES SOLICITADOS HOJE (URGENTES):
- Eletrocardiograma (ECG de 12 derivações)
- Troponina I e BNP (marcadores cardíacos no sangue)
- Raio-X do Tórax
- Exames de sangue completos (função renal e eletrólitos)

QUANDO BUSCAR EMERGÊNCIA IMEDIATAMENTE:
⚠️ Vá ao pronto-socorro se você sentir:
• Falta de ar que piora de repente
• Dor intensa no peito
• Inchaço nos pés que aumenta rapidamente
• Tonturas ou desmaio

PRÓXIMO RETORNO: em 48 horas ou conforme orientado pelo seu médico.

Cuide-se bem!
Sua equipe de saúde`;

type DeliveryMethod = 'app' | 'whatsapp' | 'email';

const DELIVERY_OPTIONS: Array<{ value: DeliveryMethod; label: string; Icon: React.FC<{ className?: string }> }> = [
  { value: 'app',       label: 'patientApp',  Icon: Stethoscope },
  { value: 'whatsapp',  label: 'whatsApp',     Icon: MessageSquare },
  { value: 'email',     label: 'emailLabel',   Icon: Mail },
];

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface PatientHandoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function PatientHandoutModal({ isOpen, onClose }: PatientHandoutModalProps) {
  const t = useTranslations('dashboard.clinicalCommand');
  const [delivery, setDelivery]       = useState<DeliveryMethod>('app');
  const [content,  setContent]        = useState(MOCK_HANDOUT);
  const [sent,     setSent]           = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Reset sent state when modal reopens
  useEffect(() => {
    if (isOpen) setSent(false);
  }, [isOpen]);

  async function handleSend() {
    setSent(true);
    // In production: POST to patient communication API
    await new Promise((r) => setTimeout(r, 600));
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <m.div
            key="handout-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <m.div
            key="handout-modal"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Patient handout communication"
              className="
                pointer-events-auto w-full max-w-xl
                bg-slate-900 border border-slate-700
                flex flex-col overflow-hidden
                max-h-[90vh]
              "
              style={{ borderRadius: 'var(--radius-xl)', boxShadow: 'var(--token-shadow-xl)' }}
            >
              {/* Header */}
              <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-800">
                <div>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-cyan-400" />
                    {t('outboundCommunication')}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('reviewAndSendSummary')}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close handout modal"
                  className="
                    p-1.5 hover:text-white
                    hover:bg-slate-800 transition-colors
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
                  "
                  style={{ borderRadius: 'var(--radius-lg)', color: 'var(--text-tertiary)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {/* Editable content area */}
                <div>
                  <label
                    htmlFor="handout-content"
                    className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {t('messagePreview')}
                  </label>
                  <textarea
                    id="handout-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={12}
                    className="
                      w-full text-xs leading-relaxed
                      bg-slate-800 border border-slate-700
                      text-slate-300 placeholder-slate-600
                      px-4 py-3 resize-none
                      focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent
                    "
                    style={{ borderRadius: 'var(--radius-xl)' }}
                    aria-label="Patient handout content"
                  />
                </div>

                {/* Delivery method */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                    {t('deliveryMethod')}
                  </p>
                  <div className="flex gap-2">
                    {DELIVERY_OPTIONS.map(({ value, label, Icon }) => (
                      <button
                        key={value}
                        onClick={() => setDelivery(value)}
                        aria-pressed={delivery === value}
                        className={`
                          flex items-center gap-1.5 px-3 py-2 text-xs font-medium
                          transition-colors flex-1 justify-center
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
                          ${delivery === value
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                            : 'bg-slate-800 border border-slate-700 hover:bg-slate-700'
                          }
                        `}
                        style={{
                          borderRadius: 'var(--radius-xl)',
                          ...(delivery !== value ? { color: 'var(--text-muted)' } : {}),
                        }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {t(label)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 px-6 py-4 border-t border-slate-800 flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="
                    flex-1 py-2.5 text-sm font-medium
                    bg-slate-800 hover:bg-slate-700 text-slate-300
                    transition-colors
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500
                  "
                  style={{ borderRadius: 'var(--radius-xl)' }}
                >
                  {t('cancel')}
                </button>
                <m.button
                  onClick={handleSend}
                  disabled={sent}
                  whileHover={!sent ? { scale: 1.02 } : {}}
                  whileTap={!sent ? { scale: 0.97 } : {}}
                  aria-label="Approve and send to patient"
                  className={`
                    flex-[2] py-2.5 text-sm font-semibold
                    flex items-center justify-center gap-2
                    transition-all
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
                    ${sent
                      ? 'bg-emerald-600 text-white'
                      : 'bg-cyan-500 hover:bg-cyan-400 text-white'
                    }
                  `}
                  style={{ borderRadius: 'var(--radius-xl)' }}
                >
                  {sent ? (
                    <><CheckCircle2 className="w-4 h-4" /> {t('sent')}</>
                  ) : (
                    <>{t('approveAndSend')}</>
                  )}
                </m.button>
              </div>
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}
