'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Activity, ArrowLeft, CheckCircle2, Loader2, Shield, Star } from 'lucide-react';

interface PhysicianProfile {
  id: string;
  name: string;
  country: string;
  registryId: string;
  registryState: string | null;
  city: string | null;
  state: string | null;
  specialties: Array<{ namePt: string }>;
  isInNetwork: boolean;
}

export default function ClaimProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [physician, setPhysician] = useState<PhysicianProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [calcomUsername, setCalcomUsername] = useState('');
  const [calcomEventSlug, setCalcomEventSlug] = useState('');
  const [plans, setPlans] = useState('');

  const apiKey = process.env.NEXT_PUBLIC_NETWORK_API_KEY ?? 'dev_network_api_key_holi';

  useEffect(() => {
    fetch(`/api/directory/${id}`)
      .then((r) => r.json())
      .then((data: { physician?: PhysicianProfile }) => {
        if (data.physician) setPhysician(data.physician);
      })
      .catch(() => setError('Médico não encontrado'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!physician) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/directory/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          physicianId: physician.id,
          calcomUsername: calcomUsername || undefined,
          calcomEventSlug: calcomEventSlug || undefined,
          acceptedPlans: plans.split(',').map((p) => p.trim()).filter(Boolean),
        }),
      });

      const data = await res.json() as { success: boolean; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error ?? `Erro ${res.status}`);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!physician && !loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center text-center px-6">
        <p className="text-lg font-semibold text-slate-900">Médico não encontrado</p>
        <Link href="/directory" className="mt-4 text-sm text-brand-600 hover:underline">
          Voltar ao diretório
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white shadow-sm px-8 py-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 mx-auto mb-4">
            <CheckCircle2 className="h-7 w-7 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Perfil reivindicado com sucesso!</h2>
          <p className="mt-2 text-sm text-slate-500">
            <strong>{physician?.name}</strong> agora faz parte da rede Holi. Pacientes poderão
            agendar consultas diretamente via WhatsApp.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Link href="/dashboard/providers" className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Ver especialistas
            </Link>
            <Link href="/directory" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
              Voltar ao diretório
            </Link>
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
            <span className="text-sm font-semibold text-slate-900">Holi Network</span>
          </div>
          <Link href="/directory" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao Diretório
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-6 py-12">
        {/* Physician card */}
        {physician && (
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white shadow-sm px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-xl font-semibold text-brand-700">
                {physician.name.charAt(0)}
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">{physician.name}</h2>
                <p className="text-sm text-slate-500">
                  {physician.specialties[0]?.namePt}
                  {physician.city ? ` · ${physician.city}` : ''}
                  {physician.state ? `, ${physician.state}` : ''}
                </p>
                <p className="mt-0.5 font-mono text-xs text-slate-400">
                  {physician.country === 'BR' && physician.registryState
                    ? `CRM-${physician.registryState} ${physician.registryId}`
                    : physician.registryId}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Trust signals */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { icon: Shield, text: 'Verificado pelo\nRegistro Oficial' },
            { icon: Star, text: 'Indicações via\nWhatsApp' },
            { icon: CheckCircle2, text: 'Agendamento\nGratuito' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="rounded-xl border border-slate-200 bg-white p-3 text-center">
              <Icon className="h-5 w-5 text-brand-600 mx-auto mb-1" />
              <p className="text-xs text-slate-600 whitespace-pre-line leading-tight">{text}</p>
            </div>
          ))}
        </div>

        {/* Claim form */}
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white shadow-sm px-6 py-7 space-y-5">
          <div>
            <h3 className="font-semibold text-slate-900">Adicionar à rede Holi</h3>
            <p className="mt-1 text-sm text-slate-500">
              Configure os detalhes de agendamento para este especialista.
              Campos opcionais podem ser preenchidos depois.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Cal.com Username
              <span className="ml-1 text-xs text-slate-400 font-normal">opcional</span>
            </label>
            <input
              value={calcomUsername}
              onChange={(e) => setCalcomUsername(e.target.value)}
              placeholder="ex: dra-ana-carvalho"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <p className="mt-1 text-xs text-slate-400">Username no Cal.com para buscar horários disponíveis</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Cal.com Event Slug
              <span className="ml-1 text-xs text-slate-400 font-normal">opcional</span>
            </label>
            <input
              value={calcomEventSlug}
              onChange={(e) => setCalcomEventSlug(e.target.value)}
              placeholder="ex: cardiologia-30min"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Planos Aceitos
              <span className="ml-1 text-xs text-slate-400 font-normal">opcional — separados por vírgula</span>
            </label>
            <input
              value={plans}
              onChange={(e) => setPlans(e.target.value)}
              placeholder="ex: Amil, SulAmérica, Unimed"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Adicionar à Rede Holi
          </button>
        </form>
      </main>
    </div>
  );
}
