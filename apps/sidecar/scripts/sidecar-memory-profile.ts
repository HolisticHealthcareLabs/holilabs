#!/usr/bin/env node
/**
 * Sidecar Memory Profiler
 *
 * Runs a controlled heavy-usage simulation against OllamaManager to detect
 * heap growth patterns that indicate memory leaks.
 *
 * Usage:
 *   cd apps/sidecar
 *   npx ts-node --project scripts/tsconfig.json scripts/sidecar-memory-profile.ts
 *
 * Options (env vars):
 *   DURATION_MS=600000   Total simulation time in ms (default: 600 000 = 10 min)
 *   SAMPLE_MS=2000       Heap sample interval in ms (default: 2 000)
 *   FORCE_GC=1           Force GC before each scenario (requires --expose-gc)
 *
 * Example for a quick 2-minute run:
 *   DURATION_MS=120000 npx ts-node --project scripts/tsconfig.json \
 *     scripts/sidecar-memory-profile.ts
 *
 * Scenarios:
 *   A. rapid-status-checks   — checkStatus() called 200×/s; checkInProgress guards.
 *   B. pull-storm            — pullModel() 50×/s same model; duplicate guard fires.
 *   C. stop-start-race       — start()+stop() at 10×/s w/ 0 ms poll; exposes
 *                              the _stopped race condition (the main leak target).
 *   D. combined-chaos        — all three simultaneously.
 *
 * For scenario C, WeakRef tracks how many OllamaManager instances survive GC
 * after stop() is called. Before the _stopped fix: many survive. After: zero.
 *
 * Leak detection:
 *   Linear regression on (time, heapUsed) pairs.
 *   slope > LEAK_THRESHOLD_BYTES_PER_SEC with R² > 0.80 ⇒ flagged as leak.
 */

import http from 'http';
import { AddressInfo } from 'net';
// Dynamic require after env vars are set — avoids capturing module-level consts
// before the mock server port is known. CommonJS tsconfig makes this work.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { OllamaManager } = require('../src/main/OllamaManager') as {
  OllamaManager: new (opts?: {
    host?: string;
    port?: number;
    pollBaseMs?: number;
    statusTimeoutMs?: number;
  }) => {
    start(): void;
    stop(): void;
    checkStatus(): Promise<{ connected: boolean }>;
    pullModel(name: string, cb: (pct: number) => void): Promise<void>;
    getLastStatus(): { connected: boolean };
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const DURATION_MS            = parseInt(process.env.DURATION_MS ?? '600000', 10);
const SAMPLE_MS              = parseInt(process.env.SAMPLE_MS   ?? '2000',   10);
const FORCE_GC               = process.env.FORCE_GC === '1';
const LEAK_THRESHOLD_BPS     = 512;   // bytes/second — flag if slope exceeds this
const LEAK_R2_THRESHOLD      = 0.75;  // R² — only flag if fit is this linear

const NUM_SCENARIOS          = 4;
const SCENARIO_DURATION_MS   = Math.floor(DURATION_MS / NUM_SCENARIOS);

// ─────────────────────────────────────────────────────────────────────────────
// ANSI colour helpers
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  grey:   '\x1b[90m',
};

function fmt(n: number, unit: string): string {
  if (unit === 'MB') return `${(n / 1024 / 1024).toFixed(2)} MB`;
  if (unit === 'KB') return `${(n / 1024).toFixed(1)} KB`;
  return `${n}`;
}

function badge(ok: boolean): string {
  return ok
    ? `${C.green}✔ STABLE${C.reset}`
    : `${C.red}✘ POTENTIAL LEAK${C.reset}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Ollama HTTP server
// ─────────────────────────────────────────────────────────────────────────────

interface MockServerMode {
  hang: boolean;     // /api/version hangs until request aborted
  slowMs: number;    // delay before responding (ms)
  error: boolean;    // respond with 503
}

function startMockServer(): Promise<{ port: number; setMode(m: Partial<MockServerMode>): void; close(): Promise<void> }> {
  let mode: MockServerMode = { hang: false, slowMs: 5, error: false };

  const server = http.createServer((req, res) => {
    if (mode.error) {
      res.writeHead(503);
      res.end('{}');
      return;
    }

    const respond = () => {
      if (req.destroyed) return;

      if (req.url === '/api/version') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ version: '0.5.4' }));
        return;
      }

      if (req.url === '/api/tags') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          models: [
            { name: 'llama3.2:1b-instruct-q4_K_M', size: 800_000_000, digest: 'sha256:abc' },
            { name: 'phi3:mini-4k-instruct-q4_K_M', size: 2_300_000_000, digest: 'sha256:def' },
          ],
        }));
        return;
      }

      if (req.url === '/api/pull') {
        // Stream fake progress then finish
        res.writeHead(200, { 'Content-Type': 'application/x-ndjson' });
        let completed = 0;
        const total = 100_000;
        const interval = setInterval(() => {
          if (req.destroyed) { clearInterval(interval); return; }
          completed += 10_000;
          res.write(JSON.stringify({ status: 'downloading', completed, total }) + '\n');
          if (completed >= total) {
            clearInterval(interval);
            res.end();
          }
        }, 10);
        return;
      }

      res.writeHead(404);
      res.end('{}');
    };

    if (mode.hang && req.url === '/api/version') {
      // Just hang — don't respond until the request is aborted
      req.on('close', () => {});
      return;
    }

    if (mode.slowMs > 0) {
      setTimeout(respond, mode.slowMs);
    } else {
      respond();
    }
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port;
      resolve({
        port,
        setMode(m) { Object.assign(mode, m); },
        close() {
          return new Promise((res) => server.close(() => res()));
        },
      });
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Heap sampling
// ─────────────────────────────────────────────────────────────────────────────

interface HeapSample {
  t: number;          // ms since scenario start
  heapUsed: number;   // bytes
  heapTotal: number;
  rss: number;
  external: number;
}

function sampleHeap(startTime: number): HeapSample {
  const m = process.memoryUsage();
  return {
    t: Date.now() - startTime,
    heapUsed:  m.heapUsed,
    heapTotal: m.heapTotal,
    rss:       m.rss,
    external:  m.external,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Linear regression
// ─────────────────────────────────────────────────────────────────────────────

interface RegressionResult {
  /** bytes per millisecond */
  slopeBpMs: number;
  /** bytes per second */
  slopeBpS: number;
  /** coefficient of determination */
  r2: number;
  /** heap at start (bytes) */
  first: number;
  /** heap at end (bytes) */
  last: number;
  /** net change (bytes) */
  delta: number;
}

function linearRegression(samples: HeapSample[]): RegressionResult {
  if (samples.length < 3) {
    return { slopeBpMs: 0, slopeBpS: 0, r2: 0, first: 0, last: 0, delta: 0 };
  }

  const n    = samples.length;
  const sumX = samples.reduce((s, p) => s + p.t, 0);
  const sumY = samples.reduce((s, p) => s + p.heapUsed, 0);
  const sumXY = samples.reduce((s, p) => s + p.t * p.heapUsed, 0);
  const sumX2 = samples.reduce((s, p) => s + p.t * p.t, 0);

  const denom = n * sumX2 - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const meanY = sumY / n;
  const ssTot = samples.reduce((s, p) => s + (p.heapUsed - meanY) ** 2, 0);
  const ssRes = samples.reduce((s, p) => s + (p.heapUsed - (slope * p.t + intercept)) ** 2, 0);
  const r2 = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);

  return {
    slopeBpMs: slope,
    slopeBpS:  slope * 1000,
    r2,
    first: samples[0].heapUsed,
    last:  samples[samples.length - 1].heapUsed,
    delta: samples[samples.length - 1].heapUsed - samples[0].heapUsed,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario runner
// ─────────────────────────────────────────────────────────────────────────────

interface ScenarioResult {
  name: string;
  durationMs: number;
  samples: HeapSample[];
  regression: RegressionResult;
  survivingInstances: number;
  isLeak: boolean;
  notes: string[];
}

function maybeGC() {
  if (FORCE_GC && typeof (global as any).gc === 'function') {
    (global as any).gc();
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function runScenario(
  name: string,
  durationMs: number,
  sampleMs: number,
  mockPort: number,
  work: (mgr: () => InstanceType<typeof OllamaManager>, signal: AbortSignal) => Promise<void>
): Promise<ScenarioResult> {
  maybeGC();
  await delay(200); // let GC settle

  const samples: HeapSample[] = [];
  const startTime = Date.now();
  const ac = new AbortController();

  // Sampler runs in parallel with the work
  const samplerDone = (async () => {
    while (!ac.signal.aborted) {
      samples.push(sampleHeap(startTime));
      await delay(sampleMs);
    }
  })();

  // Work runs for durationMs, then signals stop
  const workDone = work(
    () => new OllamaManager({ host: '127.0.0.1', port: mockPort, pollBaseMs: 0, statusTimeoutMs: 200 }),
    ac.signal
  );

  await Promise.race([
    workDone,
    delay(durationMs).then(() => {}),
  ]);

  ac.abort();
  await samplerDone.catch(() => {});

  samples.push(sampleHeap(startTime)); // final sample

  const regression = linearRegression(samples);
  const isLeak = Math.abs(regression.slopeBpS) > LEAK_THRESHOLD_BPS && regression.r2 > LEAK_R2_THRESHOLD;

  return {
    name,
    durationMs: Date.now() - startTime,
    samples,
    regression,
    survivingInstances: 0,
    isLeak,
    notes: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Load workloads
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scenario A: Rapid concurrent status checks.
 * The checkInProgress guard should ensure only 1 HTTP request pair is in-flight
 * at any time regardless of call rate. Heap should stay flat.
 */
async function scenarioA(
  make: () => InstanceType<typeof OllamaManager>,
  signal: AbortSignal
): Promise<void> {
  const mgr = make();
  mgr.start();

  let calls = 0;
  const interval = setInterval(async () => {
    if (signal.aborted) { clearInterval(interval); return; }
    // Fire 10 concurrent checkStatus() calls; 9 return immediately due to guard
    for (let i = 0; i < 10; i++) {
      mgr.checkStatus().catch(() => {});
    }
    calls += 10;
  }, 50); // 200 calls/s

  await new Promise<void>((resolve) => signal.addEventListener('abort', () => {
    clearInterval(interval);
    mgr.stop();
    console.log(`  ${C.grey}[A] total checkStatus() calls: ${calls}${C.reset}`);
    resolve();
  }, { once: true }));
}

/**
 * Scenario B: Pull storm on the same model.
 * The activePulls guard rejects duplicate pulls immediately.
 * Only 1 pull is ever in-flight; the rest throw without HTTP requests.
 */
async function scenarioB(
  make: () => InstanceType<typeof OllamaManager>,
  signal: AbortSignal
): Promise<void> {
  const mgr = make();
  mgr.start();

  let rejected = 0;
  const interval = setInterval(() => {
    if (signal.aborted) { clearInterval(interval); return; }
    // Fire 5 concurrent pull attempts on the same model
    for (let i = 0; i < 5; i++) {
      mgr.pullModel('llama3.2:1b-instruct-q4_K_M', () => {}).catch(() => { rejected++; });
    }
  }, 100); // 50 attempts/s

  await new Promise<void>((resolve) => signal.addEventListener('abort', () => {
    clearInterval(interval);
    mgr.stop();
    console.log(`  ${C.grey}[B] duplicate pulls rejected: ${rejected}${C.reset}`);
    resolve();
  }, { once: true }));
}

/**
 * Scenario C: Rapid start()/stop() cycling with 0ms poll interval.
 *
 * This directly exercises the _stopped race condition.
 *
 * The race window:
 *   1. start() fires _scheduleNextPoll(0) → timer fires immediately.
 *   2. Timer callback begins: `await this.checkStatus()` (even with 200ms timeout).
 *   3. stop() is called before checkStatus() resolves → sets pollTimer=null.
 *   4. BUGGY: when checkStatus() resolves, _scheduleNextPoll(nextDelay) is called
 *      unconditionally, creating a new orphaned timer that holds `this` alive.
 *   5. FIXED: _stopped=true is checked after the await → _scheduleNextPoll returns
 *      immediately, and the instance can be GC'd.
 *
 * Uses WeakRef to count how many OllamaManager instances survive GC.
 */
async function scenarioC(
  make: () => InstanceType<typeof OllamaManager>,
  signal: AbortSignal,
  result: ScenarioResult
): Promise<void> {
  const refs: WeakRef<InstanceType<typeof OllamaManager>>[] = [];
  let cycles = 0;

  const CYCLE_INTERVAL_MS = 25; // 40 cycles/s — rapid enough to expose the race

  const interval = setInterval(() => {
    if (signal.aborted) { clearInterval(interval); return; }

    const mgr = make();
    refs.push(new WeakRef(mgr));

    mgr.start(); // schedules poll at t=0ms

    // Stop almost immediately — races with the in-flight 0ms timer callback
    setTimeout(() => mgr.stop(), 10);

    cycles++;
  }, CYCLE_INTERVAL_MS);

  await new Promise<void>((resolve) => signal.addEventListener('abort', () => {
    clearInterval(interval);
    console.log(`  ${C.grey}[C] stop/start cycles: ${cycles}${C.reset}`);
    resolve();
  }, { once: true }));

  // Force GC to collect instances that have no remaining strong references
  maybeGC();
  await delay(300); // let GC run
  maybeGC();
  await delay(300);

  // Count surviving instances
  const surviving = refs.filter((ref) => ref.deref() !== undefined).length;
  result.survivingInstances = surviving;

  const pct = refs.length === 0 ? 0 : Math.round((surviving / refs.length) * 100);
  if (surviving > 0 && !FORCE_GC) {
    result.notes.push(
      `WeakRef: ${surviving}/${refs.length} instances alive after GC ` +
      `(run with --expose-gc and FORCE_GC=1 for accurate count)`
    );
  } else if (surviving > 0) {
    result.notes.push(
      `⚠ WeakRef: ${surviving}/${refs.length} (${pct}%) instances RETAINED after GC ` +
      `→ _stopped race leaks timer chains holding OllamaManager closures`
    );
    result.isLeak = true;
  } else {
    result.notes.push(`WeakRef: all ${refs.length} instances collected ✔`);
  }
}

/**
 * Scenario D: Combined chaos — all three patterns simultaneously.
 * Validates that the guards compose without interference.
 */
async function scenarioD(
  make: () => InstanceType<typeof OllamaManager>,
  signal: AbortSignal
): Promise<void> {
  // Three independent managers running concurrently
  const mgrA = make(); mgrA.start();
  const mgrB = make(); mgrB.start();

  let statusCalls = 0;
  let pullAttempts = 0;
  let cycles = 0;

  const timerA = setInterval(() => {
    if (signal.aborted) return;
    for (let i = 0; i < 5; i++) { mgrA.checkStatus().catch(() => {}); }
    statusCalls += 5;
  }, 50);

  const timerB = setInterval(() => {
    if (signal.aborted) return;
    for (let i = 0; i < 3; i++) {
      mgrB.pullModel('phi3:mini-4k-instruct-q4_K_M', () => {}).catch(() => {});
    }
    pullAttempts += 3;
  }, 100);

  const timerC = setInterval(() => {
    if (signal.aborted) return;
    const mgr = make();
    mgr.start();
    setTimeout(() => mgr.stop(), 15);
    cycles++;
  }, 30);

  await new Promise<void>((resolve) => signal.addEventListener('abort', () => {
    clearInterval(timerA);
    clearInterval(timerB);
    clearInterval(timerC);
    mgrA.stop();
    mgrB.stop();
    console.log(
      `  ${C.grey}[D] status=${statusCalls} pulls=${pullAttempts} stop/start=${cycles}${C.reset}`
    );
    resolve();
  }, { once: true }));
}

// ─────────────────────────────────────────────────────────────────────────────
// ASCII sparkline
// ─────────────────────────────────────────────────────────────────────────────

function sparkline(samples: HeapSample[]): string {
  if (samples.length === 0) return '';
  const blocks = '▁▂▃▄▅▆▇█';
  const vals = samples.map((s) => s.heapUsed);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  return vals
    .filter((_, i) => i % Math.max(1, Math.floor(vals.length / 50)) === 0)
    .map((v) => blocks[Math.floor(((v - min) / range) * (blocks.length - 1))])
    .join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// Report printer
// ─────────────────────────────────────────────────────────────────────────────

function printReport(results: ScenarioResult[], mockPort: number) {
  const bar = '═'.repeat(65);
  console.log(`\n${C.bold}${C.cyan}${bar}${C.reset}`);
  console.log(`${C.bold}${C.cyan}  SIDECAR MEMORY PROFILER — Holilabs v2 Cortex${C.reset}`);
  console.log(`${C.bold}${C.cyan}${bar}${C.reset}`);
  console.log(`  Mock Ollama ▸ localhost:${mockPort}`);
  console.log(`  Duration    ▸ ${(DURATION_MS / 1000).toFixed(0)}s total`);
  console.log(`  Sampling    ▸ every ${SAMPLE_MS / 1000}s`);
  console.log(`  GC forced   ▸ ${FORCE_GC ? 'yes (--expose-gc)' : 'no'}`);
  console.log();

  let foundLeak = false;

  for (const r of results) {
    const reg = r.regression;
    const ok  = !r.isLeak;
    foundLeak = foundLeak || r.isLeak;

    console.log(`  ${'─'.repeat(63)}`);
    console.log(`  ${C.bold}${r.name.toUpperCase()}${C.reset}`);
    console.log();

    // Sparkline
    console.log(`  heap  ${sparkline(r.samples)}`);
    console.log();

    // Stats
    const first  = fmt(reg.first, 'MB');
    const last   = fmt(reg.last,  'MB');
    const deltaS = reg.delta >= 0 ? `+${fmt(reg.delta, 'KB')}` : fmt(reg.delta, 'KB');
    const color  = reg.delta > 1024 * 512 ? C.red : reg.delta > 0 ? C.yellow : C.green;

    console.log(`  heap start   ${first}`);
    console.log(`  heap end     ${last}  (${color}${deltaS}${C.reset})`);
    console.log(`  slope        ${(reg.slopeBpS).toFixed(1)} B/s  ` +
                `(R²=${reg.r2.toFixed(3)})`);

    if (r.survivingInstances > 0) {
      console.log(`  ${C.red}retained     ${r.survivingInstances} OllamaManager instances (GC refused)${C.reset}`);
    } else if (FORCE_GC) {
      console.log(`  ${C.green}retained     0 OllamaManager instances (all collected)${C.reset}`);
    }

    for (const note of r.notes) {
      console.log(`  note  ${note}`);
    }

    console.log();
    console.log(`  ${badge(ok)}`);
    console.log();
  }

  console.log(`  ${'─'.repeat(63)}`);
  const overall = foundLeak
    ? `${C.red}${C.bold}LEAKS DETECTED — see notes above${C.reset}`
    : `${C.green}${C.bold}ALL SCENARIOS STABLE${C.reset}`;
  console.log(`\n  OVERALL: ${overall}\n`);
  console.log(`${C.bold}${C.cyan}${bar}${C.reset}\n`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  if (FORCE_GC && typeof (global as any).gc !== 'function') {
    console.warn(
      `${C.yellow}FORCE_GC=1 is set but global.gc is not available.` +
      ` Restart with: node --expose-gc -r ts-node/register ${process.argv[1]}${C.reset}`
    );
  }

  console.log(`\n${C.cyan}Starting mock Ollama server…${C.reset}`);
  const mock = await startMockServer();
  console.log(`${C.cyan}Listening on port ${mock.port}${C.reset}`);
  console.log(`${C.cyan}Simulation: ${(DURATION_MS / 1000).toFixed(0)}s ` +
              `(${NUM_SCENARIOS} scenarios × ${(SCENARIO_DURATION_MS / 1000).toFixed(0)}s each)${C.reset}\n`);

  const results: ScenarioResult[] = [];

  // ── Scenario A ────────────────────────────────────────────────────────────
  console.log(`${C.bold}[1/4] Scenario A: rapid-status-checks${C.reset}`);
  console.log(`      200 concurrent checkStatus() calls/s; checkInProgress guard`);
  const resA = await runScenario(
    'A: rapid-status-checks',
    SCENARIO_DURATION_MS,
    SAMPLE_MS,
    mock.port,
    (make, signal) => scenarioA(make, signal)
  );
  results.push(resA);

  // ── Scenario B ────────────────────────────────────────────────────────────
  console.log(`\n${C.bold}[2/4] Scenario B: pull-storm (same model)${C.reset}`);
  console.log(`      50 concurrent pullModel() calls/s; activePulls duplicate guard`);
  const resB = await runScenario(
    'B: pull-storm',
    SCENARIO_DURATION_MS,
    SAMPLE_MS,
    mock.port,
    (make, signal) => scenarioB(make, signal)
  );
  results.push(resB);

  // ── Scenario C ────────────────────────────────────────────────────────────
  console.log(`\n${C.bold}[3/4] Scenario C: stop-start-race (_stopped race condition)${C.reset}`);
  console.log(`      40 start()+stop() cycles/s; exposes timer chain retention`);

  // Temporary placeholder result so scenarioC can populate it
  const resC: ScenarioResult = {
    name: 'C: stop-start-race',
    durationMs: 0,
    samples: [],
    regression: { slopeBpMs: 0, slopeBpS: 0, r2: 0, first: 0, last: 0, delta: 0 },
    survivingInstances: 0,
    isLeak: false,
    notes: [],
  };

  const rC = await runScenario(
    'C: stop-start-race',
    SCENARIO_DURATION_MS,
    SAMPLE_MS,
    mock.port,
    (make, signal) => scenarioC(make, signal, resC)
  );
  // Merge WeakRef results into the actual regression result
  rC.survivingInstances = resC.survivingInstances;
  rC.notes = resC.notes;
  rC.isLeak = rC.isLeak || resC.isLeak;
  results.push(rC);

  // ── Scenario D ────────────────────────────────────────────────────────────
  console.log(`\n${C.bold}[4/4] Scenario D: combined-chaos${C.reset}`);
  console.log(`      All patterns simultaneously`);
  const resD = await runScenario(
    'D: combined-chaos',
    SCENARIO_DURATION_MS,
    SAMPLE_MS,
    mock.port,
    (make, signal) => scenarioD(make, signal)
  );
  results.push(resD);

  await mock.close();

  printReport(results, mock.port);

  const anyLeak = results.some((r) => r.isLeak);
  process.exit(anyLeak ? 1 : 0);
}

main().catch((err) => {
  console.error('Profiler error:', err);
  process.exit(2);
});
