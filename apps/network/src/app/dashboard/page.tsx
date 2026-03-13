/**
 * Clinic Analytics Dashboard — Leakage Prevention Engine
 *
 * Server Component: fetches referral data directly from the DB.
 * Displays the core GORDON/VICTOR ROI metrics:
 *   - Total referrals sent
 *   - Consent rate (LGPD opt-in)
 *   - Booking conversion rate
 *   - Estimated revenue retained (BRL)
 *
 * No client-side JS required for the core view — progressive enhancement.
 */

import Link from 'next/link';
import { prisma } from '@/lib/db/client';
import { formatBRL, formatPercent } from '@/lib/utils';
import { ReferralTable } from '@/components/ReferralTable';
import { StatCard } from '@/components/StatCard';
import { TrendingUp, Users, CheckCircle2, CalendarCheck, BanknoteIcon, Activity, Plus, Stethoscope, Globe, Database } from 'lucide-react';

// Revalidate every 60 seconds
export const revalidate = 60;

/**
 * Resolves the orgId for the current request.
 *
 * Production path: reads the Bearer token from the Authorization cookie or header,
 * calls /api/me which returns the session orgId.
 *
 * Prototype fallback: DEMO_ORG_ID env var.
 * Replace this function with a proper server-side session read once the
 * main Holi platform provides the auth gateway for apps/network.
 */
async function resolveOrgId(): Promise<{ orgId: string; dbError: boolean }> {
  // In a real deployment the Bearer token comes from the session cookie via the
  // Next.js auth layer. For the prototype, DEMO_ORG_ID is the fallback.
  return { orgId: process.env.DEMO_ORG_ID ?? 'demo-org', dbError: false };
}

async function getDashboardData(orgId: string) {
  let referrals: Awaited<ReturnType<typeof prisma.networkReferral.findMany<{ include: { selectedProvider: { select: { name: true; specialty: true } } } }>>> = [];
  let providerCount = 0;
  let dbError = false;

  try {
    [referrals, providerCount] = await Promise.all([
      prisma.networkReferral.findMany({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          selectedProvider: { select: { name: true, specialty: true } },
        },
      }),
      prisma.networkProvider.count({ where: { orgId, isActive: true } }),
    ]);
  } catch {
    dbError = true;
  }

  const total = referrals.length;
  const consented = referrals.filter((r) => r.consentedAt !== null).length;
  const booked = referrals.filter((r) => r.status === 'BOOKED').length;
  const declined = referrals.filter((r) => r.status === 'DECLINED').length;
  const expired = referrals.filter((r) => r.status === 'EXPIRED').length;
  const pending = total - consented - declined;

  const revenueRetained = referrals
    .filter((r) => r.status === 'BOOKED' && r.estimatedRevenueRetainedBrl !== null)
    .reduce((sum, r) => sum + Number(r.estimatedRevenueRetainedBrl ?? 0), 0);

  const consentRate = total > 0 ? (consented / total) * 100 : 0;
  const bookingRate = consented > 0 ? (booked / consented) * 100 : 0;
  const overallConversion = total > 0 ? (booked / total) * 100 : 0;

  return {
    referrals,
    providerCount,
    dbError,
    metrics: {
      total,
      consented,
      booked,
      expired,
      declined,
      pending,
      revenueRetained,
      consentRate,
      bookingRate,
      overallConversion,
    },
  };
}

export default async function DashboardPage() {
  const { orgId } = await resolveOrgId();
  const { referrals, providerCount, metrics, dbError } = await getDashboardData(orgId);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
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
          <div className="flex items-center gap-3">
            <Link
              href="/directory"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Globe className="h-3.5 w-3.5" />
              Diretório Mercosul
            </Link>
            <Link
              href="/dashboard/data-sources"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Database className="h-3.5 w-3.5" />
              Fontes de Dados
            </Link>
            <Link
              href="/dashboard/providers"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Stethoscope className="h-3.5 w-3.5" />
              Especialistas
            </Link>
            <Link
              href="/dashboard/new-referral"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Nova Indicação
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Ao vivo
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* DB error banner */}
        {dbError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
            <svg className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">Banco de dados indisponível</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Não foi possível carregar os dados. Verifique a conexão com o banco e recarregue a página.
              </p>
            </div>
          </div>
        )}

        {/* Page title */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard da Clínica</h2>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe indicações, conversões e receita retida em tempo real.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            title="Indicações Enviadas"
            value={String(metrics.total)}
            icon={Users}
            description="últimas 50"
            color="blue"
          />
          <StatCard
            title="Taxa de Consentimento"
            value={formatPercent(metrics.consentRate)}
            icon={CheckCircle2}
            description={`${metrics.consented} pacientes`}
            color="emerald"
          />
          <StatCard
            title="Taxa de Agendamento"
            value={formatPercent(metrics.bookingRate)}
            icon={CalendarCheck}
            description={`${metrics.booked} consultas`}
            color="indigo"
          />
          <StatCard
            title="Conversão Geral"
            value={formatPercent(metrics.overallConversion)}
            icon={TrendingUp}
            description="indicação → consulta"
            color="violet"
          />
          <StatCard
            title="Receita Retida"
            value={formatBRL(metrics.revenueRetained)}
            icon={BanknoteIcon}
            description="estimativa BRL"
            color="green"
            highlight
          />
        </div>

        {/* Secondary metrics row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MiniStat label="Especialistas Ativos" value={String(providerCount)} />
          <MiniStat label="Indicações Expiradas" value={String(metrics.expired)} />
          <MiniStat label="Aguardando Resposta" value={String(metrics.pending)} />
          <MiniStat
            label="ROI Médio por Indicação"
            value={metrics.booked > 0 ? formatBRL(metrics.revenueRetained / metrics.booked) : 'R$ 0'}
          />
        </div>

        {/* Referral Table */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Indicações Recentes</h3>
            <span className="text-xs text-slate-400">Atualizado a cada 60s</span>
          </div>
          <ReferralTable
            referrals={referrals.map((r) => ({
              ...r,
              targetSpecialty: String(r.targetSpecialty),
              status: String(r.status),
              selectedProvider: r.selectedProvider
                ? { name: r.selectedProvider.name, specialty: String(r.selectedProvider.specialty) }
                : null,
            }))}
          />
        </section>

        {/* LGPD footer notice */}
        <footer className="border-t border-slate-100 pt-4 text-xs text-slate-400">
          Todos os dados de pacientes são processados com consentimento explícito conforme a{' '}
          <strong>LGPD (Lei 13.709/2018)</strong>. Números de telefone são cifrados em repouso
          (AES-256-GCM). Holi atua como Operadora de Dados; a clínica é a Controladora.
        </footer>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline helpers (avoid extra files for server-only simple components)
// ---------------------------------------------------------------------------

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

