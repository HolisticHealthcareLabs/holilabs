'use client';

import { Dialog } from '@headlessui/react';
import { MicrophoneIcon, ShieldCheckIcon, LockClosedIcon, ClockIcon } from '@heroicons/react/24/outline';

interface RecordingConsentDialogProps {
  isOpen: boolean;
  patientName: string;
  onConsent: () => void;
  onDecline: () => void;
}

export function RecordingConsentDialog({
  isOpen,
  patientName,
  onConsent,
  onDecline,
}: RecordingConsentDialogProps) {
  return (
    <Dialog open={isOpen} onClose={onDecline} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <MicrophoneIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <Dialog.Title className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Consentimento para Gravação de Consulta
            </Dialog.Title>
          </div>

          <Dialog.Description className="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <p>
              <strong>Paciente:</strong> {patientName}
            </p>

            <p>
              Esta consulta será gravada em áudio para fins de documentação clínica
              e geração automatizada de prontuário médico usando Inteligência Artificial.
            </p>

            <div className="rounded-md bg-blue-50 p-4 dark:bg-blue-900/20">
              <p className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-2 mb-2">
                <MicrophoneIcon className="h-5 w-5" />
                Por que gravamos?
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-blue-800 dark:text-blue-300">
                <li>Melhora a precisão do registro médico</li>
                <li>Permite que o médico foque em você, não no computador</li>
                <li>Reduz erros de documentação</li>
                <li>Gera nota SOAP automaticamente durante a consulta</li>
              </ul>
            </div>

            <div className="rounded-md bg-green-50 p-4 dark:bg-green-900/20">
              <p className="font-semibold text-green-900 dark:text-green-300 flex items-center gap-2 mb-2">
                <ShieldCheckIcon className="h-5 w-5" />
                Sua privacidade está protegida:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-green-800 dark:text-green-300">
                <li className="flex items-start gap-2">
                  <ClockIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>A gravação é excluída após a transcrição (máximo 24 horas)</span>
                </li>
                <li className="flex items-start gap-2">
                  <LockClosedIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Dados sensíveis são des-identificados (LGPD/HIPAA)</span>
                </li>
                <li>Apenas profissionais autorizados têm acesso ao prontuário</li>
                <li>Você pode revogar o consentimento a qualquer momento</li>
                <li>Criptografia AES-256 em trânsito e em repouso</li>
              </ul>
            </div>

            <div className="rounded-md bg-amber-50 p-3 dark:bg-amber-900/20">
              <p className="text-xs text-amber-800 dark:text-amber-300">
                <strong>Conformidade Legal:</strong> LGPD Art. 7, I (Consentimento) +
                Art. 11, II, a (Tutela da saúde) | Lei 25.326 Argentina Art. 5 (Consentimento Informado)
              </p>
            </div>

            <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-800">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                <strong>Tecnologia:</strong> Deepgram Nova-2 (transcrição em tempo real) +
                Claude 3.5 Sonnet (geração de nota SOAP) |
                <strong>Confiança da IA:</strong> Sempre mostrada com pontuação de 0-100%
              </p>
            </div>
          </Dialog.Description>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={onDecline}
              className="flex-1 rounded-md border-2 border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              ❌ Não Autorizo
              <div className="text-xs text-gray-500 mt-1">(Documentação Manual)</div>
            </button>
            <button
              onClick={onConsent}
              className="flex-1 rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 shadow-md"
            >
              ✅ Autorizo a Gravação
              <div className="text-xs text-blue-100 mt-1">(Recomendado)</div>
            </button>
          </div>

          <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-500">
            Seu consentimento será registrado no prontuário eletrônico com timestamp e IP.
          </p>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
