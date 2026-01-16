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
        <Dialog.Panel className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
          <Dialog.Title className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Motivo de Acesso aos Dados do Paciente
          </Dialog.Title>

          <Dialog.Description className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            <strong>Paciente:</strong> {patientName}
            <br />
            {/* Decorative - low contrast intentional for legal reference */}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Conformidade: LGPD Art. 11, II (Tutela da saúde) + Lei 25.326 Argentina
            </span>
          </Dialog.Description>

          {/* Auto-select countdown */}
          <div className="mt-4 rounded-md bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            ⏱️ Seleção automática em <strong>{countdown} segundos</strong> (Atendimento Direto)
          </div>

          {/* Reason options */}
          <div className="mt-6 space-y-3 max-h-96 overflow-y-auto">
            {REASON_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-colors ${
                  selectedReason === option.value
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                }`}
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
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{option.label}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{option.description}</div>
                  {/* Decorative - low contrast intentional for legal reference */}
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{option.lgpdArticle}</div>
                </div>
              </label>
            ))}
          </div>

          {/* Optional purpose field */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Finalidade Específica (Opcional)
            </label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Ex: Renovação de receita controlada, consulta de retorno pós-cirúrgico"
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Confirmar Acesso
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
