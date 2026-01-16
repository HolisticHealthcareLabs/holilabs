/**
 * Clinician-facing QR entrypoint (public)
 *
 * URL: /access/request?patientTokenId=PT-...
 *
 * Clinician scans QR → logs into clinician portal → submits access request.
 */

'use client';

import { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';

export default function AccessRequestPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const patientTokenId = sp.get('patientTokenId') || '';
  const [purpose, setPurpose] = useState('Clinical care');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const canSubmit = useMemo(() => patientTokenId.length > 0, [patientTokenId]);

  const handleRequest = async () => {
    if (!canSubmit) return;
    if (!session?.user?.id) {
      await signIn(undefined, { callbackUrl: window.location.href });
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch('/api/access/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientTokenId, purpose }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to request access');
      }
      setResult('Request sent. Waiting for patient approval.');
    } catch (e: any) {
      setResult(e?.message || 'Failed to request access');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Patient Access Request</h1>
        <p className="text-gray-600 mb-6">
          Scan → Request → Patient approves. No patient data is shown until approved.
        </p>

        {!patientTokenId && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mb-4">
            Missing <span className="font-mono">patientTokenId</span> in URL.
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Patient Token</label>
            <input
              value={patientTokenId}
              readOnly
              className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-900 font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
            <input
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <button
            onClick={handleRequest}
            disabled={!canSubmit || submitting}
            className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold disabled:opacity-50"
          >
            {session?.user?.id ? 'Request access' : 'Sign in to request access'}
          </button>

          {result && (
            <div className="text-sm bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-800">
              {result}
            </div>
          )}

          <button
            onClick={() => router.push('/auth/login')}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-800"
          >
            Go to clinician sign-in
          </button>
        </div>
      </div>
    </div>
  );
}


