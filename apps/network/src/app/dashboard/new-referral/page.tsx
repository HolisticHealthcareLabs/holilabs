/**
 * /dashboard/new-referral — Create a new referral
 *
 * Client Component form that POSTs to /api/referrals.
 * On success, shows confirmation and redirects to /dashboard.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Activity, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

const SPECIALTIES = [
  { value: 'CARDIOLOGY', label: 'Cardiologia' },
  { value: 'DERMATOLOGY', label: 'Dermatologia' },
  { value: 'ORTHOPEDICS', label: 'Ortopedia' },
  { value: 'NEUROLOGY', label: 'Neurologia' },
  { value: 'GASTROENTEROLOGY', label: 'Gastroenterologia' },
  { value: 'OPHTHALMOLOGY', label: 'Oftalmologia' },
  { value: 'ENDOCRINOLOGY', label: 'Endocrinologia' },
  { value: 'GYNECOLOGY', label: 'Ginecologia' },
  { value: 'UROLOGY', label: 'Urologia' },
  { value: 'GENERAL_SURGERY', label: 'Cirurgia Geral' },
];

export default function NewReferralPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_NETWORK_API_KEY ?? 'dev_network_api_key_holi';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const rawPhone = (fd.get('patientPhone') as string).trim();
    // Normalise: strip spaces/dashes, ensure starts with +
    const patientPhone = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;

    const body = {
      patientPhone,
      targetSpecialty: fd.get('targetSpecialty') as string,
      referringClinicianId: fd.get('referringClinicianId') as string,
      estimatedRevenueRetainedBrl: Number(fd.get('estimatedRevenueRetainedBrl')) || undefined,
    };

    try {
      const res = await fetch('/api/referrals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json() as { success: boolean; id?: string; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error ?? `Erro ${res.status}`);

      setCreatedId(data.id ?? null);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white shadow-sm px-8 py-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 mx-auto mb-4">
            <CheckCircle2 className="h-7 w-7 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Indicação enviada!</h2>
          <p className="mt-2 text-sm text-slate-500">
            O paciente receberá uma mensagem no WhatsApp com o consentimento LGPD em instantes.
          </p>
          {createdId && (
            <p className="mt-2 font-mono text-xs text-slate-400">ID: {createdId}</p>
          )}
          <div className="mt-6 flex gap-3 justify-center">
            <button
              onClick={() => { setSuccess(false); setCreatedId(null); }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Nova Indicação
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Ver Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-900">Holi Network</h1>
              <p className="text-xs text-slate-500">Leakage Prevention Engine</p>
            </div>
          </div>
          <Link href="/dashboard" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-6 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Nova Indicação</h2>
          <p className="mt-1 text-sm text-slate-500">
            O paciente receberá uma mensagem no WhatsApp para consentir e agendar com um especialista.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white shadow-sm px-6 py-7 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Telefone do Paciente *
            </label>
            <input
              name="patientPhone"
              required
              placeholder="+5511999998888"
              pattern="^\+?[\d\s\-]{10,16}$"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <p className="mt-1 text-xs text-slate-400">Formato E.164 com código do país, ex: +5511999998888</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Especialidade *
            </label>
            <select
              name="targetSpecialty"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">Selecione a especialidade...</option>
              {SPECIALTIES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              ID do Médico Solicitante *
            </label>
            <input
              name="referringClinicianId"
              required
              placeholder="ID do médico que está fazendo a indicação"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Receita Estimada Retida (R$)
              <span className="ml-1 text-xs text-slate-400 font-normal">opcional</span>
            </label>
            <input
              name="estimatedRevenueRetainedBrl"
              type="number"
              min="1"
              step="0.01"
              placeholder="ex: 850.00"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <p className="mt-1 text-xs text-slate-400">Usado no cálculo de ROI do dashboard</p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Enviando...' : 'Enviar Indicação via WhatsApp'}
            </button>
          </div>

          <p className="text-center text-xs text-slate-400">
            Ao enviar, o paciente receberá uma solicitação de consentimento LGPD antes de qualquer dado ser compartilhado.
          </p>
        </form>
      </main>
    </div>
  );
}
