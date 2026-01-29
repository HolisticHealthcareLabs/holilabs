/**
 * Health check runner (local/CI)
 *
 * Usage:
 *   pnpm check:health
 *   BASE_URL=http://localhost:3000 pnpm check:health
 */

export {}; // Make this a module to isolate scope

const BASE_URL = process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

type CheckResult = {
  name: string;
  url: string;
  ok: boolean;
  status: number;
  body: string;
  latencyMs: number;
};

async function check(name: string, path: string, timeoutMs = 8000): Promise<CheckResult> {
  const url = `${BASE_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    const body = (await res.text().catch(() => '')).slice(0, 300);
    return { name, url, ok: res.ok, status: res.status, body, latencyMs: Date.now() - start };
  } catch (e: any) {
    return { name, url, ok: false, status: 0, body: e?.message || 'request failed', latencyMs: Date.now() - start };
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const checks: Array<[string, string]> = [
    ['system', '/api/health/system'],
    ['presidio', '/api/health/presidio'],
    ['deepgram', '/api/health/deepgram'],
  ];

  const results = await Promise.all(checks.map(([name, path]) => check(name, path)));
  const maxLatencyMs = Number(process.env.HEALTH_MAX_LATENCY_MS || 0); // 0 = no threshold

  for (const r of results) {
    const status = r.ok ? 'OK' : 'FAIL';
    // eslint-disable-next-line no-console
    console.log(`${status} ${r.name} ${r.status} ${r.latencyMs}ms ${r.url}`);
    if (!r.ok) {
      // eslint-disable-next-line no-console
      console.log(`  body: ${r.body}`);
    }
    if (maxLatencyMs > 0 && r.ok && r.latencyMs > maxLatencyMs) {
      // eslint-disable-next-line no-console
      console.log(`  latency: ${r.latencyMs}ms (threshold ${maxLatencyMs}ms)`);
    }
  }

  const failed = results.filter(r => !r.ok);
  const slow = maxLatencyMs > 0 ? results.filter(r => r.ok && r.latencyMs > maxLatencyMs) : [];
  if (failed.length || slow.length) {
    // eslint-disable-next-line no-console
    console.error(
      `\nHealth checks ${failed.length ? 'failed' : 'passed'}${slow.length ? ' but were slow' : ''}: ` +
      [
        failed.length ? `failed=${failed.map(f => f.name).join(',')}` : null,
        slow.length ? `slow=${slow.map(s => `${s.name}(${s.latencyMs}ms)`).join(',')}` : null,
      ].filter(Boolean).join(' ')
    );
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log('\n✅ All health checks passed');
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('check-health failed:', e);
  process.exit(1);
});


