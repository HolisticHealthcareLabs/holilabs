import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ReferralRow = {
  id: string;
  targetSpecialty: string;
  status: string;
  consentedAt: Date | null;
  bookedSlotStart: Date | null;
  createdAt: Date;
  estimatedRevenueRetainedBrl: unknown;
  selectedProvider: { name: string; specialty: string } | null;
};

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  PENDING: {
    label: 'Aguardando',
    className: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
  },
  CONSENTED: {
    label: 'Consentiu',
    className: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  },
  SELECTING_PROVIDER: {
    label: 'Selecionando',
    className: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  },
  SELECTING_SLOT: {
    label: 'Escolhendo Horário',
    className: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  },
  BOOKED: {
    label: 'Agendado ✓',
    className: 'bg-green-50 text-green-700 ring-green-600/20',
  },
  EXPIRED: {
    label: 'Expirado',
    className: 'bg-slate-100 text-slate-500 ring-slate-400/20',
  },
  DECLINED: {
    label: 'Recusou',
    className: 'bg-red-50 text-red-600 ring-red-600/20',
  },
};

const SPECIALTY_LABELS: Record<string, string> = {
  CARDIOLOGY: 'Cardiologia',
  DERMATOLOGY: 'Dermatologia',
  ORTHOPEDICS: 'Ortopedia',
  NEUROLOGY: 'Neurologia',
  GASTROENTEROLOGY: 'Gastroenterologia',
  OPHTHALMOLOGY: 'Oftalmologia',
  ENDOCRINOLOGY: 'Endocrinologia',
  GYNECOLOGY: 'Ginecologia',
  UROLOGY: 'Urologia',
  GENERAL_SURGERY: 'Cirurgia Geral',
};

interface ReferralTableProps {
  referrals: ReferralRow[];
}

export function ReferralTable({ referrals }: ReferralTableProps) {
  if (referrals.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200">
        <p className="text-sm text-slate-400">Nenhuma indicação encontrada. Crie a primeira!</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Especialidade
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Especialista
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Consentimento
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Consulta
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Receita
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {referrals.map((r) => {
              const status = STATUS_CONFIG[r.status] ?? STATUS_CONFIG['PENDING'];
              const revenue = r.estimatedRevenueRetainedBrl
                ? Number(r.estimatedRevenueRetainedBrl)
                : null;

              return (
                <tr
                  key={r.id}
                  className={cn(
                    'transition-colors hover:bg-slate-50',
                    r.status === 'BOOKED' && 'bg-green-50/30'
                  )}
                >
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {SPECIALTY_LABELS[r.targetSpecialty] ?? r.targetSpecialty}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.selectedProvider?.name ?? (
                      <span className="text-slate-400 italic">Não selecionado</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                        status.className
                      )}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {r.consentedAt ? (
                      <time
                        dateTime={new Date(r.consentedAt).toISOString()}
                        suppressHydrationWarning
                      >
                        {format(new Date(r.consentedAt), "d MMM, HH:mm", { locale: ptBR })}
                      </time>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {r.bookedSlotStart ? (
                      <time
                        dateTime={new Date(r.bookedSlotStart).toISOString()}
                        suppressHydrationWarning
                        className="font-medium text-green-700"
                      >
                        {format(new Date(r.bookedSlotStart), "d MMM, HH:mm", { locale: ptBR })}
                      </time>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {revenue !== null && r.status === 'BOOKED' ? (
                      <span className="font-semibold text-green-700">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          maximumFractionDigits: 0,
                        }).format(revenue)}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
