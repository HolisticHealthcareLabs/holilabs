/**
 * /dashboard/data-sources — Government Registry Sync Status
 *
 * Server Component showing the health of all 8 data sources:
 *   - Record counts per source
 *   - Last sync timestamp and status
 *   - Credential availability check
 *   - Manual "Sync Now" trigger button
 */

import { prisma } from '@/lib/db/client';
import Link from 'next/link';
import { Activity, ArrowLeft, Database, Clock, AlertCircle, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { DATA_SOURCE_LIST, type DataSourceConfig } from '@/lib/directory/data-sources';
import { SyncButton } from './SyncButton';

export const revalidate = 0; // always fresh

const COUNTRY_FLAGS: Record<string, string> = {
  BR: '🇧🇷', AR: '🇦🇷', UY: '🇺🇾', PY: '🇵🇾', GLOBAL: '🌍',
};

async function getSourceStats() {
  const stats: Record<string, { count: number; lastSync: Date | null; lastStatus: string | null }> = {};

  try {
    // Record counts per target table
    const [physicians, specialties, plans, establishments, syncLogs] = await Promise.all([
      prisma.physicianCatalog.groupBy({
        by: ['registrySource'],
        _count: true,
      }),
      prisma.medicalSpecialty.count(),
      prisma.insurancePlan.count(),
      prisma.healthcareEstablishment.count(),
      prisma.dataSourceSyncLog.findMany({
        orderBy: { startedAt: 'desc' },
        take: 50,
        select: { sourceId: true, startedAt: true, status: true, completedAt: true, recordsImported: true, recordsUpdated: true },
      }),
    ]);

    // Map physician counts by registry source
    const sourceCountMap: Record<string, number> = {};
    for (const row of physicians) {
      sourceCountMap[row.registrySource] = row._count;
    }

    stats['CFM_BR'] = {
      count: sourceCountMap['CFM_BR'] ?? 0,
      lastSync: syncLogs.find((l) => l.sourceId === 'CFM_BR')?.startedAt ?? null,
      lastStatus: syncLogs.find((l) => l.sourceId === 'CFM_BR')?.status ?? null,
    };
    stats['SISA_AR'] = {
      count: sourceCountMap['SISA_AR'] ?? 0,
      lastSync: syncLogs.find((l) => l.sourceId === 'SISA_AR')?.startedAt ?? null,
      lastStatus: syncLogs.find((l) => l.sourceId === 'SISA_AR')?.status ?? null,
    };
    stats['MSP_UY'] = {
      count: sourceCountMap['MSP_UY'] ?? 0,
      lastSync: syncLogs.find((l) => l.sourceId === 'MSP_UY')?.startedAt ?? null,
      lastStatus: syncLogs.find((l) => l.sourceId === 'MSP_UY')?.status ?? null,
    };
    stats['CMP_PY'] = {
      count: sourceCountMap['CMP_PY'] ?? 0,
      lastSync: syncLogs.find((l) => l.sourceId === 'SIREPRO_PY')?.startedAt ?? null,
      lastStatus: syncLogs.find((l) => l.sourceId === 'SIREPRO_PY')?.status ?? null,
    };
    stats['ANS_BR'] = {
      count: plans,
      lastSync: syncLogs.find((l) => l.sourceId === 'ANS_BR')?.startedAt ?? null,
      lastStatus: syncLogs.find((l) => l.sourceId === 'ANS_BR')?.status ?? null,
    };
    stats['CNES_BR'] = {
      count: establishments,
      lastSync: syncLogs.find((l) => l.sourceId === 'CNES_BR')?.startedAt ?? null,
      lastStatus: syncLogs.find((l) => l.sourceId === 'CNES_BR')?.status ?? null,
    };
    stats['VIACEP_BR'] = { count: 0, lastSync: null, lastStatus: 'active' };
    stats['NOMINATIM_OSM'] = { count: 0, lastSync: null, lastStatus: 'active' };

    return { stats, totalPhysicians: Object.values(sourceCountMap).reduce((a, b) => a + b, 0), specialties, plans, establishments };
  } catch {
    return { stats: {}, totalPhysicians: 0, specialties: 0, plans: 0, establishments: 0 };
  }
}

function getStatusColor(source: DataSourceConfig, stat: { lastStatus: string | null }) {
  if (source.status === 'active') return 'green';
  if (source.status === 'needs_credentials') return 'amber';
  if (stat.lastStatus === 'completed') return 'green';
  if (stat.lastStatus === 'failed') return 'red';
  if (stat.lastStatus === 'running') return 'blue';
  return 'slate';
}

function StatusIcon({ color }: { color: string }) {
  if (color === 'green') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (color === 'amber') return <AlertCircle className="h-4 w-4 text-amber-500" />;
  if (color === 'red') return <XCircle className="h-4 w-4 text-red-500" />;
  if (color === 'blue') return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
  return <Clock className="h-4 w-4 text-slate-400" />;
}

export default async function DataSourcesPage() {
  const { stats, totalPhysicians, specialties, plans, establishments } = await getSourceStats();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-900">Holi Network</h1>
              <p className="text-xs text-slate-500">Government Data Sources</p>
            </div>
          </div>
          <Link href="/dashboard" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Fontes de Dados Governamentais</h2>
          <p className="mt-1 text-sm text-slate-500">
            8 registros oficiais de 4 países do Mercosul alimentam o diretório médico.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SummaryCard icon={Database} label="Total de Médicos" value={totalPhysicians.toLocaleString('pt-BR')} />
          <SummaryCard icon={Database} label="Especialidades" value={String(specialties)} />
          <SummaryCard icon={Database} label="Planos de Saúde" value={String(plans)} />
          <SummaryCard icon={Database} label="Estabelecimentos" value={String(establishments)} />
        </div>

        {/* Source cards */}
        <div className="space-y-4">
          {DATA_SOURCE_LIST.map((source) => {
            const stat = stats[source.id === 'SIREPRO_PY' ? 'CMP_PY' : source.id] ?? { count: 0, lastSync: null, lastStatus: null };
            const color = getStatusColor(source, stat);

            return (
              <div key={source.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-lg">
                      {COUNTRY_FLAGS[source.country] ?? '🌐'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{source.name}</h3>
                        <StatusIcon color={color} />
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          color === 'green' ? 'bg-green-50 text-green-700' :
                          color === 'amber' ? 'bg-amber-50 text-amber-700' :
                          color === 'red' ? 'bg-red-50 text-red-700' :
                          color === 'blue' ? 'bg-blue-50 text-blue-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {source.status === 'active' ? 'Ativo' :
                           source.status === 'needs_credentials' ? 'Requer Credenciais' :
                           stat.lastStatus === 'completed' ? 'Sincronizado' :
                           stat.lastStatus === 'failed' ? 'Falhou' :
                           'Não implementado'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500 max-w-xl">{source.description}</p>

                      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-400">
                        <span>Registros: <strong className="text-slate-700">{stat.count.toLocaleString('pt-BR')}</strong></span>
                        <span>Cobertura estimada: <strong className="text-slate-700">{source.estimatedRecords}</strong></span>
                        <span>Acesso: <strong className="text-slate-700">{source.accessMethod.replace('_', ' ')}</strong></span>
                        <span>Sincronização: <strong className="text-slate-700">{
                          source.syncSchedule === 'daily' ? 'Diária' :
                          source.syncSchedule === 'weekly' ? 'Semanal' :
                          source.syncSchedule === 'monthly' ? 'Mensal' :
                          'Manual'
                        }</strong></span>
                        {stat.lastSync && (
                          <span suppressHydrationWarning>Último sync: <strong className="text-slate-700">{new Date(stat.lastSync).toLocaleString('pt-BR')}</strong></span>
                        )}
                      </div>

                      {source.envVars.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {source.envVars.map((v) => (
                            <span key={v} className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                              process.env[v] ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                            }`}>
                              {v} {process.env[v] ? '✓' : '✗'}
                            </span>
                          ))}
                        </div>
                      )}

                      {source.legalBasis && (
                        <p className="mt-2 text-[11px] text-slate-400 italic">Base legal: {source.legalBasis}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {source.docsUrl && (
                      <a
                        href={source.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-400 hover:text-brand-600 transition-colors"
                      >
                        Docs ↗
                      </a>
                    )}
                    <SyncButton sourceId={source.id} sourceName={source.name} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <footer className="border-t border-slate-100 pt-4 text-xs text-slate-400">
          Todos os dados são importados de registros governamentais públicos conforme a legislação
          de dados abertos de cada país (LGPD Art. 7 / Ley 18.381 / Ley 5282). Dados pessoais de
          pacientes nunca são processados nesta pipeline.
        </footer>
      </main>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof Database; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" />
        <p className="text-xs text-slate-500">{label}</p>
      </div>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
