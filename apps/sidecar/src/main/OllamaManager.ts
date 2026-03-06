/**
 * OllamaManager
 *
 * Manages communication with a locally running Ollama instance.
 * Uses Node.js built-in http module only — no extra dependencies.
 *
 * Resilience guarantees:
 * - Absolute deadline on all status requests (not just socket inactivity).
 * - res.on('error') handlers so mid-response connection drops are caught.
 * - Settled-flag prevents double-rejection when timeout races with error event.
 * - Explicit res.removeAllListeners() in settle() for deterministic GC under load.
 * - Exponential backoff on polling (60s → 120s → 240s … capped at 5 min).
 * - _stopped flag guards _scheduleNextPoll so stop() is race-free even when
 *   a checkStatus() is still in-flight when stop() is called.
 * - Concurrency guard: at most one in-flight checkStatus at a time.
 * - Per-model concurrency guard for pulls.
 * - Timer is .unref()'d so it never prevents clean process exit.
 * - Constructor accepts { host, port, pollBaseMs } for testability.
 *
 * @module sidecar/main/OllamaManager
 */

import http from 'http';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface OllamaModel {
  name: string;
  size: number; // bytes
  digest: string;
  quantization?: string; // e.g. "Q4_K_M"
  modifiedAt?: string;
}

export interface OllamaStatus {
  connected: boolean;
  version?: string;
  models: OllamaModel[];
  checkedAt: Date;
}

export interface OllamaManagerOptions {
  host?: string;
  port?: number;
  /** Override the base polling interval (ms). Useful for tests. Default: 60 000. */
  pollBaseMs?: number;
  /** Override the max back-off interval (ms). Default: 300 000. */
  pollMaxMs?: number;
  /** Absolute deadline for status requests (ms). Default: 5 000. */
  statusTimeoutMs?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants (defaults — overridable via OllamaManagerOptions)
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_STATUS_TIMEOUT_MS = 5_000;
const DEFAULT_POLL_BASE_MS      = 60_000;
const DEFAULT_POLL_MAX_MS       = 300_000;
const BACKOFF_FACTOR            = 2;

// Recommended INT4 models for LatAm offline clinics
export const RECOMMENDED_MODELS = [
  {
    name: 'llama3.2:1b-instruct-q4_K_M',
    label: 'Llama 3.2 1B (800 MB)',
    useCase: 'Resumo de notas clínicas',
  },
  {
    name: 'phi3:mini-4k-instruct-q4_K_M',
    label: 'Phi-3 Mini 4K (2.3 GB)',
    useCase: 'Verificação de interações medicamentosas',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Low-level HTTP helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fires an HTTP GET and returns the response body as a string.
 *
 * Fixes applied vs. original implementation:
 * 1. host/port passed as parameters (not module-level consts) — testable.
 * 2. Absolute deadline (not just socket inactivity) — trickle-rate Ollama can't stall.
 * 3. res.removeAllListeners() in settle() — deterministic cleanup under load.
 * 4. settled flag prevents double-rejection when timeout races with error event.
 */
function httpGet(
  host: string,
  port: number,
  path: string,
  timeoutMs = DEFAULT_STATUS_TIMEOUT_MS
): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let _res: http.IncomingMessage | null = null;

    function settle(fn: typeof resolve | typeof reject, value: any) {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      // Explicit listener cleanup: prevents closures from being retained until
      // GC discovers the unreachable IncomingMessage. Under 100+ req/s, this
      // matters — without it, heap serrates rather than staying flat.
      _res?.removeAllListeners();
      req.removeAllListeners();
      fn(value);
    }

    // Absolute deadline — fires regardless of socket activity.
    const deadline = setTimeout(() => {
      req.destroy();
      settle(reject, new Error(`httpGet ${path} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const req = http.get(
      { host, port, path },
      (res) => {
        _res = res;
        res.on('error', (err) => settle(reject, err));
        let data = '';
        res.on('data', (chunk: Buffer) => (data += chunk.toString()));
        res.on('end', () => settle(resolve, data));
      }
    );

    req.on('error', (err) => settle(reject, err));
  });
}

/**
 * Fires an HTTP POST and returns the complete response body.
 * Same absolute-deadline + listener-cleanup semantics as httpGet.
 */
function httpPost(
  host: string,
  port: number,
  path: string,
  body: string,
  timeoutMs = DEFAULT_STATUS_TIMEOUT_MS
): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let _res: http.IncomingMessage | null = null;

    function settle(fn: typeof resolve | typeof reject, value: any) {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      _res?.removeAllListeners();
      req.removeAllListeners();
      fn(value);
    }

    const deadline = setTimeout(() => {
      req.destroy();
      settle(reject, new Error(`httpPost ${path} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const options = {
      host,
      port,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = http.request(options, (res) => {
      _res = res;
      res.on('error', (err) => settle(reject, err));
      let data = '';
      res.on('data', (chunk: Buffer) => (data += chunk.toString()));
      res.on('end', () => settle(resolve, data));
    });

    req.on('error', (err) => settle(reject, err));
    req.write(body);
    req.end();
  });
}

/**
 * Fires a streaming HTTP POST (NDJSON) and calls `onData` for each chunk.
 *
 * Returns a `cancel()` function that aborts the stream.
 *
 * The returned promise:
 *  - resolves when the response stream ends normally.
 *  - rejects if the connection errors, or the response stream errors mid-stream.
 *
 * Fixes: _resolvePromise/_rejectPromise captured from Promise constructor (so
 * cancel() actually rejects); _res captured for listener cleanup in settle().
 */
function httpPostStream(
  host: string,
  port: number,
  path: string,
  body: string,
  onData: (chunk: string) => void
): { promise: Promise<void>; cancel: () => void } {
  let settled = false;
  let _req: http.ClientRequest | null = null;
  let _res: http.IncomingMessage | null = null;
  let _resolvePromise!: () => void;
  let _rejectPromise!: (e: Error) => void;

  function settle(ok: boolean, err?: Error): void {
    if (settled) return;
    settled = true;
    _res?.removeAllListeners();
    _req?.destroy();
    if (ok) _resolvePromise();
    else _rejectPromise(err!);
  }

  const promise = new Promise<void>((resolve, reject) => {
    _resolvePromise = resolve;
    _rejectPromise = reject;

    const options = {
      host,
      port,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = http.request(options, (res) => {
      _res = res;
      res.on('error', (err) => settle(false, err));
      res.on('data', (chunk: Buffer) => {
        if (!settled) onData(chunk.toString());
      });
      res.on('end', () => settle(true));
    });

    req.on('error', (err) => settle(false, err));
    req.write(body);
    req.end();

    _req = req;
  });

  return {
    promise,
    cancel: () => settle(false, new Error('Pull cancelled')),
  };
}

function extractQuantization(name: string): string | undefined {
  const match = name.match(/[qQ][0-9]+_?[kKmM]*/);
  return match?.[0].toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// OllamaManager class
// ─────────────────────────────────────────────────────────────────────────────

export class OllamaManager {
  private readonly host: string;
  private readonly port: number;
  private readonly pollBaseMs: number;
  private readonly pollMaxMs: number;
  private readonly statusTimeoutMs: number;

  private lastStatus: OllamaStatus = {
    connected: false,
    models: [],
    checkedAt: new Date(),
  };

  /** Number of consecutive failed checks (drives backoff). */
  private consecutiveFailures = 0;

  /** Prevents concurrent checkStatus calls from overlapping. */
  private checkInProgress = false;

  /** Active pulls keyed by model name, so we can guard duplicates and cancel. */
  private activePulls = new Map<string, { cancel: () => void }>();

  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Guards _scheduleNextPoll against the stop() race condition.
   *
   * Without this flag, calling stop() while checkStatus() is awaiting lets the
   * async timer callback resume after the await, call _scheduleNextPoll again,
   * and schedule a fresh timer — effectively preventing the scheduler from ever
   * stopping. With rapid stop()/start() cycling this spawns N independent timer
   * chains each holding an OllamaManager closure, growing indefinitely.
   */
  private _stopped = false;

  constructor(opts: OllamaManagerOptions = {}) {
    this.host           = opts.host           ?? process.env.OLLAMA_HOST ?? 'localhost';
    this.port           = opts.port           ?? parseInt(process.env.OLLAMA_PORT ?? '11434', 10);
    this.pollBaseMs     = opts.pollBaseMs     ?? DEFAULT_POLL_BASE_MS;
    this.pollMaxMs      = opts.pollMaxMs      ?? DEFAULT_POLL_MAX_MS;
    this.statusTimeoutMs = opts.statusTimeoutMs ?? DEFAULT_STATUS_TIMEOUT_MS;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /** Start background polling with exponential backoff. */
  start(): void {
    this._stopped = false; // reset in case start() is called after stop()
    this._scheduleNextPoll(0); // fire immediately
  }

  stop(): void {
    this._stopped = true; // prevents any future rescheduling (see _scheduleNextPoll)
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    // Cancel any in-flight pulls gracefully.
    for (const { cancel } of this.activePulls.values()) {
      cancel();
    }
    this.activePulls.clear();
  }

  /** Returns the most recent known status — never blocks. */
  getLastStatus(): OllamaStatus {
    return this.lastStatus;
  }

  // ---------------------------------------------------------------------------
  // Status check
  // ---------------------------------------------------------------------------

  /**
   * Performs a live check against Ollama.
   * If another check is already in-flight, returns the cached status immediately
   * to avoid concurrent HTTP requests.
   */
  async checkStatus(): Promise<OllamaStatus> {
    if (this.checkInProgress) {
      return this.lastStatus;
    }

    this.checkInProgress = true;

    try {
      const [versionResult, tagsResult] = await Promise.allSettled([
        httpGet(this.host, this.port, '/api/version', this.statusTimeoutMs),
        httpGet(this.host, this.port, '/api/tags',    this.statusTimeoutMs),
      ]);

      if (versionResult.status === 'rejected' || tagsResult.status === 'rejected') {
        throw new Error('One or more Ollama requests failed');
      }

      const { version } = JSON.parse(versionResult.value) as { version: string };
      const { models: rawModels } = JSON.parse(tagsResult.value) as {
        models: Array<{ name: string; size: number; digest: string; modified_at?: string }>;
      };

      const models: OllamaModel[] = (rawModels ?? []).map((m) => ({
        name: m.name,
        size: m.size,
        digest: m.digest,
        quantization: extractQuantization(m.name),
        modifiedAt: m.modified_at,
      }));

      this.lastStatus = { connected: true, version, models, checkedAt: new Date() };
      this.consecutiveFailures = 0;
    } catch {
      this.lastStatus = { connected: false, models: this.lastStatus.models, checkedAt: new Date() };
      this.consecutiveFailures++;
    } finally {
      this.checkInProgress = false;
    }

    return this.lastStatus;
  }

  async listModels(): Promise<OllamaModel[]> {
    return this.lastStatus.models;
  }

  // ---------------------------------------------------------------------------
  // Model pull
  // ---------------------------------------------------------------------------

  /**
   * Pull a model from the Ollama registry.
   * Streams NDJSON progress; fires onProgress every 5% to avoid IPC flood.
   * Throws on network interruption.
   * A second concurrent pull of the same model name is rejected immediately.
   */
  async pullModel(name: string, onProgress: (pct: number) => void): Promise<void> {
    if (this.activePulls.has(name)) {
      throw new Error(`Pull of "${name}" is already in progress`);
    }

    let lastReportedPct = -1;
    let buffer = '';

    const { promise, cancel } = httpPostStream(
      this.host,
      this.port,
      '/api/pull',
      JSON.stringify({ name }),
      (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line) as {
              status?: string;
              completed?: number;
              total?: number;
              error?: string;
            };

            if (parsed.error) {
              cancel();
              return;
            }

            if (parsed.total && parsed.completed) {
              const pct = Math.floor((parsed.completed / parsed.total) * 100);
              if (pct >= lastReportedPct + 5) {
                lastReportedPct = pct;
                onProgress(pct);
              }
            }
          } catch {
            // skip malformed NDJSON line
          }
        }
      }
    );

    this.activePulls.set(name, { cancel });

    try {
      await promise;
      onProgress(100);
    } finally {
      this.activePulls.delete(name);
    }

    // Refresh model list so UI shows the newly installed model.
    await this.checkStatus();
  }

  // ---------------------------------------------------------------------------
  // Private: backoff scheduler
  // ---------------------------------------------------------------------------

  private _scheduleNextPoll(delayMs: number): void {
    // Guard #1: don't schedule if stop() has been called.
    if (this._stopped) return;

    this.pollTimer = setTimeout(async () => {
      // Guard #2: stop() may have been called between scheduling and firing.
      if (this._stopped) return;

      await this.checkStatus();

      // Guard #3: stop() may have been called while checkStatus() was awaiting.
      // Without this guard, _scheduleNextPoll is called unconditionally and a
      // fresh timer chain survives stop() — the leak that the profiler detects.
      if (this._stopped) return;

      const nextDelay = this.consecutiveFailures === 0
        ? this.pollBaseMs
        : Math.min(
            this.pollBaseMs * Math.pow(BACKOFF_FACTOR, this.consecutiveFailures),
            this.pollMaxMs
          );
      this._scheduleNextPoll(nextDelay);
    }, delayMs);

    // Don't hold the event loop open — Electron keeps it alive via window/tray.
    this.pollTimer.unref();
  }
}
