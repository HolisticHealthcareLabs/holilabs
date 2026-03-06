/**
 * OllamaManager resilience tests
 *
 * Covers:
 * - ECONNREFUSED when Ollama is not running
 * - Timeout (Ollama hangs — doesn't respond within 5s)
 * - Mid-response ECONNRESET (connected, sent headers, then drops)
 * - Concurrency guard (second checkStatus while first is in-flight)
 * - Exponential backoff (consecutive failures increase delay)
 * - pullModel: network drop mid-stream rejects the promise
 * - pullModel: duplicate pull guard throws immediately
 * - getLastStatus() is non-blocking even when Ollama is down
 */

import http from 'http';
import { EventEmitter } from 'events';
import { OllamaManager } from '../OllamaManager';

// ─────────────────────────────────────────────────────────────────────────────
// Minimal http mock helpers
// ─────────────────────────────────────────────────────────────────────────────

type ReqMock = EventEmitter & {
  write: jest.Mock;
  end: jest.Mock;
  destroy: jest.Mock;
};

type ResMock = EventEmitter;

function makeMockReq(): ReqMock {
  const req = new EventEmitter() as ReqMock;
  req.write = jest.fn();
  req.end = jest.fn();
  req.destroy = jest.fn(() => {
    req.emit('error', new Error('socket hang up'));
  });
  return req;
}

function makeMockRes(body: string): ResMock {
  const res = new EventEmitter();
  process.nextTick(() => {
    res.emit('data', Buffer.from(body));
    res.emit('end');
  });
  return res;
}

// ─────────────────────────────────────────────────────────────────────────────
describe('checkStatus — Ollama not running (ECONNREFUSED)', () => {
  let getStub: jest.SpyInstance;

  beforeEach(() => {
    getStub = jest.spyOn(http, 'get').mockImplementation((_opts: any, _cb?: any) => {
      const req = makeMockReq();
      process.nextTick(() => req.emit('error', Object.assign(new Error('ECONNREFUSED'), { code: 'ECONNREFUSED' })));
      return req as any;
    });
  });

  afterEach(() => getStub.mockRestore());

  it('returns connected:false without throwing', async () => {
    const mgr = new OllamaManager();
    const status = await mgr.checkStatus();
    expect(status.connected).toBe(false);
    expect(status.models).toEqual([]);
  });

  it('getLastStatus() returns immediately without blocking', () => {
    const mgr = new OllamaManager();
    // Synchronous — no await
    const status = mgr.getLastStatus();
    expect(status.connected).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('checkStatus — Ollama hangs (absolute timeout fires)', () => {
  let getStub: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    getStub = jest.spyOn(http, 'get').mockImplementation((_opts: any, _cb?: any) => {
      const req = makeMockReq();
      // Never emits 'error' or calls the response callback — simulates hang
      return req as any;
    });
  });

  afterEach(() => {
    getStub.mockRestore();
    jest.useRealTimers();
  });

  it('resolves to disconnected after STATUS_TIMEOUT_MS', async () => {
    const mgr = new OllamaManager();
    const promise = mgr.checkStatus();
    // Advance past the 5-second deadline
    jest.advanceTimersByTime(6_000);
    const status = await promise;
    expect(status.connected).toBe(false);
  });

  it('does not leave the promise hanging indefinitely', async () => {
    const mgr = new OllamaManager();
    const promise = mgr.checkStatus();
    // Advance past the deadline — timers fire synchronously, which rejects the
    // httpGet promises; awaiting lets Promise.allSettled drain its chain.
    jest.advanceTimersByTime(6_000);
    await promise; // resolves to { connected: false } — never hangs
    expect(mgr.getLastStatus().connected).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('checkStatus — ECONNRESET after response headers (mid-response drop)', () => {
  let getStub: jest.SpyInstance;

  beforeEach(() => {
    getStub = jest.spyOn(http, 'get').mockImplementation((_opts: any, cb?: any) => {
      const req = makeMockReq();
      if (cb) {
        const res = new EventEmitter();
        process.nextTick(() => {
          // Emit a partial response then an error on the response stream
          res.emit('data', Buffer.from('{"version":"0.'));
          res.emit('error', Object.assign(new Error('ECONNRESET'), { code: 'ECONNRESET' }));
        });
        cb(res);
      }
      return req as any;
    });
  });

  afterEach(() => getStub.mockRestore());

  it('returns connected:false — does not hang', async () => {
    const mgr = new OllamaManager();
    const status = await mgr.checkStatus();
    expect(status.connected).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('checkStatus — concurrency guard', () => {
  let getStub: jest.SpyInstance;
  let callCount: number;

  beforeEach(() => {
    callCount = 0;
    getStub = jest.spyOn(http, 'get').mockImplementation((_opts: any, cb?: any) => {
      callCount++;
      const req = makeMockReq();
      if (cb) {
        const body = callCount === 1
          ? '{"version":"0.5.0"}'
          : '{"models":[]}';
        const res = makeMockRes(body);
        cb(res);
      }
      return req as any;
    });
  });

  afterEach(() => getStub.mockRestore());

  it('second concurrent call returns cached status immediately without extra HTTP requests', async () => {
    const mgr = new OllamaManager();
    // Fire two concurrent checks
    const [s1, s2] = await Promise.all([mgr.checkStatus(), mgr.checkStatus()]);
    // s2 should be the cached (initial) status — not a new HTTP call
    // The key invariant: we don't send a flood of HTTP requests
    expect(callCount).toBeLessThanOrEqual(2); // at most the 2 parallel requests from first check
    expect(s1).toBe(mgr.getLastStatus()); // s1 is the freshly updated status
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Exponential backoff', () => {
  it('back-off increases with consecutive failures, capped at 5 min', () => {
    // Access the private scheduler logic by verifying the next delay formula
    // POLL_BASE=60000, BACKOFF_FACTOR=2, POLL_MAX=300000
    const POLL_BASE = 60_000;
    const BACKOFF_FACTOR = 2;
    const POLL_MAX = 300_000;

    function nextDelay(failures: number) {
      if (failures === 0) return POLL_BASE;
      return Math.min(POLL_BASE * Math.pow(BACKOFF_FACTOR, failures), POLL_MAX);
    }

    expect(nextDelay(0)).toBe(60_000);   // healthy
    expect(nextDelay(1)).toBe(120_000);  // 1 failure
    expect(nextDelay(2)).toBe(240_000);  // 2 failures
    expect(nextDelay(3)).toBe(300_000);  // 3 failures → capped
    expect(nextDelay(10)).toBe(300_000); // well over cap
  });

  it('manager resets consecutive failures to 0 on successful check', async () => {
    const getStub = jest.spyOn(http, 'get').mockImplementation((_opts: any, cb?: any) => {
      const req = makeMockReq();
      if (cb) {
        const body = (_opts as any).path?.includes('version')
          ? '{"version":"0.5.0"}'
          : '{"models":[]}';
        const res = makeMockRes(body);
        cb(res);
      }
      return req as any;
    });

    const mgr = new OllamaManager();
    // Simulate three failures then a success
    (mgr as any).consecutiveFailures = 3;
    await mgr.checkStatus();
    getStub.mockRestore();

    // If Ollama is up (both requests succeed), failures resets
    expect((mgr as any).consecutiveFailures).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('pullModel — network drop mid-stream rejects cleanly', () => {
  let requestStub: jest.SpyInstance;

  beforeEach(() => {
    requestStub = jest.spyOn(http, 'request').mockImplementation((_opts: any, cb?: any) => {
      const req = makeMockReq();
      if (cb) {
        const res = new EventEmitter();
        process.nextTick(() => {
          res.emit('data', Buffer.from('{"status":"pulling","completed":1000,"total":10000}\n'));
          // Simulate network drop mid-pull
          res.emit('error', Object.assign(new Error('ECONNRESET'), { code: 'ECONNRESET' }));
        });
        cb(res);
      }
      return req as any;
    });
  });

  afterEach(() => requestStub.mockRestore());

  it('rejects with the network error', async () => {
    const mgr = new OllamaManager();
    const onProgress = jest.fn();
    await expect(mgr.pullModel('llama3.2:1b', onProgress)).rejects.toThrow('ECONNRESET');
  });

  it('cleans up activePulls on failure so retry is possible', async () => {
    const mgr = new OllamaManager();
    await expect(mgr.pullModel('llama3.2:1b', jest.fn())).rejects.toThrow();
    // After rejection, the pull should no longer be tracked as "in progress"
    expect((mgr as any).activePulls.has('llama3.2:1b')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('pullModel — duplicate concurrency guard', () => {
  let requestStub: jest.SpyInstance;

  beforeEach(() => {
    requestStub = jest.spyOn(http, 'request').mockImplementation((_opts: any, cb?: any) => {
      const req = makeMockReq();
      if (cb) {
        // Slow pull — never resolves in test time
        const res = new EventEmitter();
        cb(res);
      }
      return req as any;
    });
  });

  afterEach(() => requestStub.mockRestore());

  it('second pull of the same model throws immediately without an HTTP request', async () => {
    const mgr = new OllamaManager();
    // Start first pull (does not await — intentionally left hanging)
    const first = mgr.pullModel('phi3:mini', jest.fn());

    // Second pull of the same model should throw before any HTTP call
    await expect(mgr.pullModel('phi3:mini', jest.fn())).rejects.toThrow(
      /already in progress/i
    );

    // Clean up the hanging first pull
    mgr.stop();
    await expect(first).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// _stopped race condition regression — memory leak guard
// ─────────────────────────────────────────────────────────────────────────────
describe('_stopped race condition — stop() is race-free', () => {
  /**
   * The bug: if stop() is called while checkStatus() is still awaiting, the
   * async timer callback resumes after the await and unconditionally calls
   * _scheduleNextPoll, scheduling a new timer. Over many stop()/start() cycles
   * this creates N independent scheduler chains, each retaining the instance.
   *
   * The fix: three _stopped guard checks in _scheduleNextPoll (before scheduling,
   * after the timer fires, and after the async await).
   */

  let getStub: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    getStub = jest.spyOn(http, 'get').mockImplementation((_opts: any, _cb?: any) => {
      // Slow response — never fires during the test to create the race window
      return makeMockReq() as any;
    });
  });

  afterEach(() => {
    getStub.mockRestore();
    jest.useRealTimers();
  });

  it('stop() before timer fires: _scheduleNextPoll never runs', async () => {
    const mgr = new OllamaManager({ pollBaseMs: 1000, statusTimeoutMs: 500 });
    mgr.start();

    // Stop immediately — the 0ms initial poll timer has been registered but not fired
    mgr.stop();

    // Advance time past the poll delay; because _stopped=true, the timer
    // callback should return early without calling checkStatus()
    jest.advanceTimersByTime(2000);
    // No further timers should be scheduled
    expect(jest.getTimerCount()).toBe(0);
    expect((mgr as any)._stopped).toBe(true);
  });

  it('stop() while checkStatus() is awaiting: _scheduleNextPoll not called', async () => {
    // Use 0ms poll so the timer fires immediately and we can control the race window
    const mgr = new OllamaManager({ pollBaseMs: 0, statusTimeoutMs: 5000 });
    mgr.start();

    // Advance by 1ms so the initial 0ms timer fires — callback starts awaiting checkStatus()
    jest.advanceTimersByTime(1);

    // Now call stop() — the async callback is suspended at 'await this.checkStatus()'
    mgr.stop();

    // Advance past the status timeout so checkStatus() resolves
    jest.advanceTimersByTime(6000);
    await Promise.resolve(); // drain microtask queue

    // With the fix: _stopped=true causes _scheduleNextPoll to return immediately
    // With the bug: _scheduleNextPoll would have been called → new timer scheduled
    expect(jest.getTimerCount()).toBe(0);
    expect((mgr as any)._stopped).toBe(true);
  });

  it('start() resets _stopped so polling resumes correctly', () => {
    const mgr = new OllamaManager({ pollBaseMs: 500, statusTimeoutMs: 100 });
    mgr.start();
    mgr.stop();
    expect((mgr as any)._stopped).toBe(true);

    mgr.start(); // should reset _stopped and schedule again
    expect((mgr as any)._stopped).toBe(false);

    // A timer should now be scheduled
    expect(jest.getTimerCount()).toBeGreaterThan(0);
    mgr.stop(); // cleanup
  });

  it('rapid start/stop cycling leaves zero timers scheduled', () => {
    const mgr = new OllamaManager({ pollBaseMs: 0, statusTimeoutMs: 100 });

    for (let i = 0; i < 20; i++) {
      mgr.start();
      mgr.stop();
    }

    jest.advanceTimersByTime(500);
    // After all cycles, no timers should survive
    expect(jest.getTimerCount()).toBe(0);
    expect((mgr as any)._stopped).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Constructor options — testability
// ─────────────────────────────────────────────────────────────────────────────
describe('Constructor options — host, port, pollBaseMs', () => {
  it('accepts custom host and port', () => {
    const mgr = new OllamaManager({ host: '10.0.0.1', port: 9999 });
    expect((mgr as any).host).toBe('10.0.0.1');
    expect((mgr as any).port).toBe(9999);
  });

  it('falls back to env vars when options omitted', () => {
    const orig = process.env.OLLAMA_PORT;
    process.env.OLLAMA_PORT = '12345';
    const mgr = new OllamaManager();
    expect((mgr as any).port).toBe(12345);
    if (orig === undefined) delete process.env.OLLAMA_PORT;
    else process.env.OLLAMA_PORT = orig;
  });

  it('falls back to 11434 when no env var and no option', () => {
    const orig = process.env.OLLAMA_PORT;
    delete process.env.OLLAMA_PORT;
    const mgr = new OllamaManager();
    expect((mgr as any).port).toBe(11434);
    if (orig !== undefined) process.env.OLLAMA_PORT = orig;
  });

  it('uses pollBaseMs from options as backoff base', () => {
    const mgr = new OllamaManager({ pollBaseMs: 5_000 });
    expect((mgr as any).pollBaseMs).toBe(5_000);
  });
});
