'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

interface Props {
  sourceId: string;
  sourceName: string;
}

export function SyncButton({ sourceId, sourceName }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  const cronSecret = process.env.NEXT_PUBLIC_CRON_SECRET ?? process.env.CRON_SECRET ?? 'dev_cron_secret_holi';

  async function handleSync() {
    if (!confirm(`Iniciar sincronização de ${sourceName}?`)) return;
    setSyncing(true);
    setResult(null);

    try {
      const res = await fetch(`/api/cron/sync-registries?source=${sourceId}`, {
        headers: { 'X-Cron-Secret': cronSecret },
      });
      const data = await res.json() as { success: boolean; results?: Array<{ status: string; recordsImported: number }> };

      if (data.success && data.results?.[0]) {
        const r = data.results[0];
        setResult(`${r.status} — ${r.recordsImported} importados`);
      } else {
        setResult('Erro na sincronização');
      }

      router.refresh();
    } catch (err) {
      setResult(`Erro: ${String(err)}`);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
      >
        <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'Sincronizando...' : 'Sincronizar'}
      </button>
      {result && (
        <span className="text-[10px] text-slate-400">{result}</span>
      )}
    </div>
  );
}
