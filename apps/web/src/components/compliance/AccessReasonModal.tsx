'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { AccessReason } from '@prisma/client';

interface AccessReasonModalProps {
  isOpen: boolean;
  patientName: string;
  onSelectReason: (reason: AccessReason, purpose?: string) => void;
  onCancel: () => void;
  autoSelectAfter?: number; // Auto-select default after N seconds (e.g., 30s)
}

const REASON_OPTIONS: Array<{
  value: AccessReason;
  label: string;
  description: string;
  lgpdArticle: string;
}> = [
  {
    value: 'DIRECT_PATIENT_CARE',
    label: 'Atendimento Direto ao Paciente',
    description: 'Consulta, diagnóstico, tratamento ou acompanhamento clínico',
    lgpdArticle: 'Art. 11, II, a - Tutela da saúde',
  },
  {
    value: 'CARE_COORDINATION',
    label: 'Coordenação de Cuidados',
    description: 'Encaminhamento, interconsulta ou continuidade assistencial',
    lgpdArticle: 'Art. 11, II, a - Tutela da saúde',
  },
  {
    value: 'EMERGENCY_ACCESS',
    label: 'Acesso Emergencial',
    description: 'Situação de urgência/emergência médica',
    lgpdArticle: 'Art. 11, II, a - Proteção da vida',
  },
  {
    value: 'ADMINISTRATIVE',
    label: 'Administrativo',
    description: 'Gestão administrativa, agendamento, registros',
    lgpdArticle: 'Art. 7, V - Execução de contrato',
  },
  {
    value: 'QUALITY_IMPROVEMENT',
    label: 'Melhoria da Qualidade',
    description: 'Auditoria interna, análise de qualidade assistencial',
    lgpdArticle: 'Art. 10 - Legítimo interesse',
  },
  {
    value: 'BILLING',
    label: 'Faturamento',
    description: 'Cobrança, convênios, processamento de pagamento',
    lgpdArticle: 'Art. 7, V - Execução de contrato',
  },
];

export function AccessReasonModal({
  isOpen,
  patientName,
  onSelectReason,
  onCancel,
  autoSelectAfter = 30,
}: AccessReasonModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedReason, setSelectedReason] = useState<AccessReason>('DIRECT_PATIENT_CARE');
  const [purpose, setPurpose] = useState('');
  const [countdown, setCountdown] = useState(autoSelectAfter);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-select countdown
  useEffect(() => {
    if (!isOpen) {
      setCountdown(autoSelectAfter);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onSelectReason('DIRECT_PATIENT_CARE'); // Auto-select default
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, autoSelectAfter, onSelectReason]);

  const handleSubmit = () => {
    onSelectReason(selectedReason, purpose || undefined);
  };

  // Avoid hydration mismatch from HeadlessUI Dialog (portal behavior differs between SSR and client).
  if (!mounted) return null;

  return (
    <Dialog open={isOpen} onClose={onCancel} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl p-6" style={{ borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--surface-primary)', boxShadow: 'var(--token-shadow-lg)' }}>
          <Dialog.Title className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Motivo de Acesso aos Dados do Paciente
          </Dialog.Title>

          <Dialog.Description className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <strong>Paciente:</strong> {patientName}
            <br />
            {/* Decorative - low contrast intentional for legal reference */}
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Conformidade: LGPD Art. 11, II (Tutela da saúde) + Lei 25.326 Argentina
            </span>
          </Dialog.Description>

          {/* Auto-select countdown */}
          <div className="mt-4 p-3 text-sm" style={{ borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface-accent)', color: 'var(--text-accent)' }}>
            ⏱️ Seleção automática em <strong>{countdown} segundos</strong> (Atendimento Direto)
          </div>

          {/* Reason options */}
          <div className="mt-6 space-y-3 max-h-96 overflow-y-auto">
            {REASON_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 border-2 p-4 transition-colors ${
                  selectedReason === option.value
                    ? 'border-blue-600'
                    : 'hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                style={{
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: selectedReason === option.value ? 'var(--surface-accent)' : undefined,
                  borderColor: selectedReason === option.value ? undefined : 'var(--border-default)',
                }}
              >
                <input
                  type="radio"
                  name="access-reason"
                  value={option.value}
                  checked={selectedReason === option.value}
                  onChange={() => setSelectedReason(option.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{option.label}</div>
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{option.description}</div>
                  {/* Decorative - low contrast intentional for legal reference */}
                  <div className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>{option.lgpdArticle}</div>
                </div>
              </label>
            ))}
          </div>

          {/* Optional purpose field */}
          <div className="mt-4">
            <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Finalidade Específica (Opcional)
            </label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Ex: Renovação de receita controlada, consulta de retorno pós-cirúrgico"
              className="mt-1 w-full focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
              style={{ borderRadius: 'var(--radius-md)', borderColor: 'var(--border-strong)', boxShadow: 'var(--token-shadow-sm)' }}
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
              style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', color: 'var(--text-secondary)' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              style={{ borderRadius: 'var(--radius-md)' }}
            >
              Confirmar Acesso
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
