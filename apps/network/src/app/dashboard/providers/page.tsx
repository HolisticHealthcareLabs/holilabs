/**
 * /dashboard/providers — Provider Management
 *
 * Server Component that renders the list of NetworkProviders for the org.
 * Add / Edit / Deactivate actions are handled via Client Component forms
 * that call the /api/providers routes.
 */

import { prisma } from '@/lib/db/client';
import Link from 'next/link';
import { ProviderActions } from './ProviderActions';
import { Activity, ArrowLeft, Plus } from 'lucide-react';

const DEMO_ORG_ID = process.env.DEMO_ORG_ID ?? 'demo-org';

const SPECIALTY_LABELS: Record<string, string> = {
  CARDIOLOGY: 'Cardiologia', DERMATOLOGY: 'Dermatologia', ORTHOPEDICS: 'Ortopedia',
  NEUROLOGY: 'Neurologia', GASTROENTEROLOGY: 'Gastroenterologia', OPHTHALMOLOGY: 'Oftalmologia',
  ENDOCRINOLOGY: 'Endocrinologia', GYNECOLOGY: 'Ginecologia', UROLOGY: 'Urologia',
  GENERAL_SURGERY: 'Cirurgia Geral',
};

export const revalidate = 0;

export default async function ProvidersPage() {
  let providers: Awaited<ReturnType<typeof prisma.networkProvider.findMany>> = [];
  try {
    providers = await prisma.networkProvider.findMany({
      where: { orgId: DEMO_ORG_ID },
      orderBy: [{ specialty: 'asc' }, { name: 'asc' }],
    });
  } catch {
    // DB unreachable — empty list
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

      <main className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Especialistas da Rede</h2>
            <p className="mt-1 text-sm text-slate-500">
              Gerencie os especialistas que recebem indicações via WhatsApp.
            </p>
          </div>
          <ProviderActions mode="create" orgId={DEMO_ORG_ID}>
            <button className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors">
              <Plus className="h-4 w-4" />
              Novo Especialista
            </button>
          </ProviderActions>
        </div>

        {providers.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 text-center">
            <p className="text-sm font-medium text-slate-600">Nenhum especialista cadastrado</p>
            <p className="mt-1 text-xs text-slate-400">
              Adicione especialistas para que as indicações possam ser encaminhadas via WhatsApp.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Nome', 'Especialidade', 'CRM', 'Cal.com Username', 'Evento', 'Cidade', 'Status', ''].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {providers.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {SPECIALTY_LABELS[String(p.specialty)] ?? String(p.specialty)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.crmNumber}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {p.calcomUsername ? (
                        <span className="font-mono text-xs bg-slate-100 rounded px-1.5 py-0.5">{p.calcomUsername}</span>
                      ) : <span className="text-slate-300 italic text-xs">não definido</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {p.calcomEventSlug ? (
                        <span className="font-mono text-xs bg-slate-100 rounded px-1.5 py-0.5">{p.calcomEventSlug}</span>
                      ) : <span className="text-slate-300 italic text-xs">não definido</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{p.addressCity ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                        p.isActive
                          ? 'bg-green-50 text-green-700 ring-green-600/20'
                          : 'bg-slate-100 text-slate-500 ring-slate-400/20'
                      }`}>
                        {p.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ProviderActions mode="edit" provider={p} orgId={DEMO_ORG_ID} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
