/**
 * Patient Access Requests Inbox
 *
 * Lists pending clinician access requests and lets patient approve/reject.
 */

'use client';

import { useEffect, useState } from 'react';

type AccessRequest = {
  requestId: string;
  clinicianName?: string;
  purpose?: string;
  expiresAt?: string;
  createdAt?: string;
};

export default function AccessRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<AccessRequest[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/portal/access-requests', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to load requests');
      const items = (data.data?.accessRequests || []).filter((r: any) => r.requestId);
      setRequests(items);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const approve = async (requestId: string) => {
    await fetch(`/api/portal/access-requests/${requestId}/approve`, { method: 'POST' });
    await load();
  };

  const reject = async (requestId: string) => {
    await fetch(`/api/portal/access-requests/${requestId}/reject`, { method: 'POST' });
    await load();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Solicitudes de acceso</h1>
        <p className="text-gray-600 mb-6">
          Aquí puedes aprobar o rechazar solicitudes de acceso a tu perfil.
        </p>

        {loading ? (
          <div className="text-gray-700">Cargando…</div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">{error}</div>
        ) : requests.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-gray-700">
            No tienes solicitudes pendientes.
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((r) => (
              <div key={r.requestId} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {r.clinicianName || 'Profesional de salud'}
                    </div>
                    {r.purpose && <div className="text-gray-700 mt-1">Motivo: {r.purpose}</div>}
                    {r.expiresAt && (
                      <div className="text-sm text-gray-500 mt-2">
                        Expira: {new Date(r.expiresAt).toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => reject(r.requestId)}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-800"
                    >
                      Rechazar
                    </button>
                    <button
                      onClick={() => approve(r.requestId)}
                      className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold"
                    >
                      Aprobar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


