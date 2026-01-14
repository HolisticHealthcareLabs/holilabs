/**
 * Health check runner (local/CI)
 *
 * Usage:
 *   pnpm check:health
 *   BASE_URL=http://localhost:3000 pnpm check:health
 */

const BASE_URL = process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

type CheckResult = {
  name: string;
  url: string;
  ok: boolean;
  status: number;
  body: string;
};

async function check(name: string, path: string, timeoutMs = 8000): Promise<CheckResult> {
  const url = `${BASE_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    const body = (await res.text().catch(() => '')).slice(0, 300);
    return { name, url, ok: res.ok, status: res.status, body };
  } catch (e: any) {
    return { name, url, ok: false, status: 0, body: e?.message || 'request failed' };
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

  for (const r of results) {
    const status = r.ok ? 'OK' : 'FAIL';
    // eslint-disable-next-line no-console
    console.log(`${status} ${r.name} ${r.status} ${r.url}`);
    if (!r.ok) {
      // eslint-disable-next-line no-console
      console.log(`  body: ${r.body}`);
    }
  }

  const failed = results.filter(r => !r.ok);
  if (failed.length) {
    // eslint-disable-next-line no-console
    console.error(`\nHealth checks failed: ${failed.map(f => f.name).join(', ')}`);
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


