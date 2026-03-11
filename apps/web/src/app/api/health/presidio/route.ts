import { NextResponse } from 'next/server';
import { createPublicRoute } from '@/lib/api/middleware';

export const dynamic = 'force-dynamic';

const RATE_LIMIT = { windowMs: 60 * 1000, maxRequests: 60 };

async function checkUrl(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    const text = await res.text().catch(() => '');
    return { ok: res.ok, status: res.status, body: text.slice(0, 200) };
  } catch (e: any) {
    return { ok: false, status: 0, body: e?.message || 'request failed' };
  } finally {
    clearTimeout(timeout);
  }
}

async function getPresidioHealth() {
  const analyzerBase = process.env.PRESIDIO_ANALYZER_URL || 'http://localhost:5001';
  const anonymizerBase = process.env.PRESIDIO_ANONYMIZER_URL || 'http://localhost:5002';
  const timeoutMs = Number(process.env.PRESIDIO_TIMEOUT_MS || 8000);

  const [analyzer, anonymizer] = await Promise.all([
    checkUrl(`${analyzerBase}/health`, timeoutMs),
    checkUrl(`${anonymizerBase}/health`, timeoutMs),
  ]);

  const ok = analyzer.ok && anonymizer.ok;

  return NextResponse.json(
    {
      status: ok ? 'healthy' : 'error',
      analyzer: { baseUrl: analyzerBase, ...analyzer },
      anonymizer: { baseUrl: anonymizerBase, ...anonymizer },
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 }
  );
}

export const GET = createPublicRoute(getPresidioHealth, { rateLimit: RATE_LIMIT });


