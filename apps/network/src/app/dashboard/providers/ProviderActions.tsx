'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, X, Loader2 } from 'lucide-react';

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

interface Provider {
  id: string;
  name: string;
  specialty: string;
  crmNumber: string;
  calcomUsername: string | null;
  calcomEventSlug: string | null;
  phone: string | null;
  addressCity: string | null;
  addressState: string | null;
  isActive: boolean;
}

interface Props {
  mode: 'create' | 'edit';
  provider?: Provider;
  orgId: string;
  children?: ReactNode;
}

export function ProviderActions({ mode, provider, orgId, children }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const apiKey = process.env.NEXT_PUBLIC_NETWORK_API_KEY ?? 'dev_network_api_key_holi';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get('name') as string,
      specialty: fd.get('specialty') as string,
      crmNumber: fd.get('crmNumber') as string,
      calcomUsername: fd.get('calcomUsername') as string || undefined,
      calcomEventSlug: fd.get('calcomEventSlug') as string || undefined,
      phone: fd.get('phone') as string || undefined,
      addressCity: fd.get('addressCity') as string || undefined,
      addressState: fd.get('addressState') as string || undefined,
    };

    try {
      const url = mode === 'create' ? '/api/providers' : `/api/providers/${provider?.id}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Erro ${res.status}`);
      }

      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivate() {
    if (!provider) return;
    if (!confirm(`Desativar ${provider.name}?`)) return;
    setLoading(true);
    try {
      await fetch(`/api/providers/${provider.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ isActive: !provider.isActive }),
      });
      router.refresh();
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {children ? (
        <span onClick={() => setOpen(true)} className="cursor-pointer">{children}</span>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen(true)}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleDeactivate}
            disabled={loading}
            className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
              provider?.isActive
                ? 'text-red-600 hover:bg-red-50'
                : 'text-green-600 hover:bg-green-50'
            }`}
          >
            {provider?.isActive ? 'Desativar' : 'Ativar'}
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="font-semibold text-slate-900">
                {mode === 'create' ? 'Novo Especialista' : 'Editar Especialista'}
              </h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nome *" name="name" defaultValue={provider?.name} required />
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Especialidade *</label>
                  <select
                    name="specialty"
                    defaultValue={provider?.specialty}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="">Selecione...</option>
                    {SPECIALTIES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="CRM *" name="crmNumber" placeholder="CRM-SP 123456" defaultValue={provider?.crmNumber} required />
                <Field label="Telefone" name="phone" placeholder="+5511999990000" defaultValue={provider?.phone ?? ''} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Cal.com Username" name="calcomUsername" placeholder="dra-ana-carvalho" defaultValue={provider?.calcomUsername ?? ''} />
                <Field label="Cal.com Event Slug" name="calcomEventSlug" placeholder="cardiologia-30min" defaultValue={provider?.calcomEventSlug ?? ''} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Field label="Cidade" name="addressCity" defaultValue={provider?.addressCity ?? ''} />
                </div>
                <Field label="UF" name="addressState" placeholder="SP" maxLength={2} defaultValue={provider?.addressState ?? ''} />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {mode === 'create' ? 'Criar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label, name, defaultValue = '', placeholder, required, maxLength,
}: {
  label: string; name: string; defaultValue?: string;
  placeholder?: string; required?: boolean; maxLength?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-1">{label}</label>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
    </div>
  );
}
