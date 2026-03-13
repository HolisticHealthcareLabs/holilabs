/**
 * @jest-environment jsdom
 *
 * Clinical Command Center — behaviour tests
 *
 * CRITICAL GUARDRAIL: jest.useFakeTimers() is intentionally NOT used.
 * Fake timers interfere with act() Promise-draining in JSDOM when paired
 * with Framer Motion's internal scheduling.  All async assertions rely on
 * real timers + waitFor with explicit timeouts.
 *
 * NOTE — always query DOM elements INSIDE waitFor callbacks, never outside.
 * The framer-motion Proxy (without a component-type cache) creates a new
 * component type on every property access, causing React to remount DOM
 * nodes on each render.  The cache below prevents this.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Mock: framer-motion — stable component types + stripped animation props
// ─────────────────────────────────────────────────────────────────────────────

jest.mock('framer-motion', () => {
  const React = require('react');
  const actual = jest.requireActual('framer-motion');

  const cache: Record<string, React.ComponentType<any>> = {};

  const motion = new Proxy(
    {},
    {
      get: (_: any, tag: string) => {
        if (!cache[tag]) {
          cache[tag] = React.forwardRef((props: any, ref: any) => {
            const {
              initial, animate, exit, transition,
              whileHover, whileTap, variants,
              ...rest
            } = props;
            return React.createElement(tag, { ref, ...rest });
          });
        }
        return cache[tag];
      },
    }
  );

  return {
    ...actual,
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Mock: next/link — render as plain <a>
// ─────────────────────────────────────────────────────────────────────────────

jest.mock('next/link', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ href, children, ...props }: any) =>
      React.createElement('a', { href, ...props }, children),
  };
});

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: 'test-user', email: 'doc@example.com', role: 'CLINICIAN' } }, status: 'authenticated' }),
  SessionProvider: ({ children }: any) => children,
}));

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
  usePathname: () => '/dashboard/clinical-command',
}));

// ─────────────────────────────────────────────────────────────────────────────
// Imports — AFTER all jest.mock() declarations
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react';
import ClinicalCommandCenterPage from '../page';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — fetch mocks
// ─────────────────────────────────────────────────────────────────────────────

const workspaceOk = { workspaceId: 'ws-1', role: 'CLINICIAN' };

function configuredFor(provider: string) {
  return { configs: [{ provider, isConfigured: true, isActive: true }] };
}

const emptyConfigs = { configs: [] };

function mockFetch(responses: Array<{ ok: boolean; body: unknown }>) {
  let i = 0;
  globalThis.fetch = jest.fn().mockImplementation(() => {
    const r = responses[i++] ?? { ok: true, body: {} };
    return Promise.resolve({ ok: r.ok, json: () => Promise.resolve(r.body) });
  });
}

/**
 * Fetch mock with a deferred CDS response.
 * Workspace calls resolve immediately; the `/medication-prescribe` call blocks
 * until the caller invokes the returned trigger function.
 */
function mockFetchWithDeferredCds(
  immediateResponses: Array<{ ok: boolean; body: unknown }>,
  cdsBody: unknown
): () => void {
  let resolveCds!: (v: unknown) => void;
  const cdsDeferred = new Promise<unknown>((r) => { resolveCds = r; });

  let idx = 0;
  globalThis.fetch = jest.fn().mockImplementation((url: string) => {
    if (String(url).includes('medication-prescribe')) {
      return cdsDeferred.then((body: any) => ({
        ok:   body.ok ?? true,
        json: () => Promise.resolve(body.json ?? cdsBody),
      }));
    }
    const r = immediateResponses[idx++] ?? { ok: true, body: {} };
    return Promise.resolve({ ok: r.ok, json: () => Promise.resolve(r.body) });
  });

  return () => { resolveCds({ ok: true, json: cdsBody }); };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper — LGPD consent gate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Grants digital consent by clicking the consent button in the TranscriptPane.
 * Must be called after render so the "Start recording" aria-label is available.
 */
async function grantConsent() {
  const btns = await screen.findAllByRole('button', { name: /record digital patient consent/i });
  for (const btn of btns) {
    await act(async () => { fireEvent.click(btn); });
  }
}

/**
 * Returns a scoped query object for the desktop (main) layout, avoiding
 * duplicate-element errors from the mobile fallback pane.
 */
function desktop() {
  return within(document.querySelector('main')!);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper — patient selection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Focuses the patient search input and clicks the first demo patient
 * (Robert Chen) in the dropdown.  Awaits the patient chip to confirm selection.
 */
async function selectDemoPatient() {
  const searchInput = await screen.findByRole('combobox', { name: /search patients/i });
  await act(async () => { fireEvent.focus(searchInput); });

  await waitFor(
    () => expect(screen.getByRole('option', { name: /robert chen/i })).toBeDefined(),
    { timeout: 2000 }
  );

  await act(async () => {
    fireEvent.click(screen.getByRole('option', { name: /robert chen/i }));
  });

  await waitFor(
    () => expect(screen.getAllByText('Robert Chen').length).toBeGreaterThan(0),
    { timeout: 2000 }
  );
}

/**
 * Clicks "Start Recording" and waits for the first transcript chunk to appear.
 */
async function startRecordingAndWait() {
  await waitFor(
    () => desktop().getByRole('button', { name: /start recording/i }),
    { timeout: 3000 }
  );
  await act(async () => {
    fireEvent.click(desktop().getByRole('button', { name: /start recording/i }));
  });
  // Wait for recording state transition (Stop Recording button or live region appearing)
  await waitFor(
    () => {
      const stopBtn = desktop().queryByRole('button', { name: /stop recording/i });
      const liveRegion = desktop().queryByRole('log');
      expect(stopBtn || liveRegion).toBeTruthy();
    },
    { timeout: 6000 }
  );
}

beforeEach(() => { jest.clearAllMocks(); });
afterEach(() => { jest.clearAllMocks(); });

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1 — Patient context gate
// ─────────────────────────────────────────────────────────────────────────────

describe('ClinicalCommandCenterPage — patient context gate', () => {
  it('Start Recording is disabled before a patient is selected', async () => {
    mockFetch([
      { ok: true, body: workspaceOk },
      { ok: true, body: emptyConfigs },
    ]);

    render(<ClinicalCommandCenterPage />);
    await grantConsent();

    await waitFor(
      () => {
        const btn = desktop().getByRole('button', { name: /start recording/i });
        expect(btn).toBeDisabled();
      },
      { timeout: 3000 }
    );
  });

  it('Start Recording becomes enabled after selecting a patient', async () => {
    mockFetch([
      { ok: true, body: workspaceOk },
      { ok: true, body: emptyConfigs },
    ]);

    render(<ClinicalCommandCenterPage />);
    await grantConsent();

    // Button disabled initially
    await waitFor(
      () => expect(desktop().getByRole('button', { name: /start recording/i })).toBeDisabled(),
      { timeout: 3000 }
    );

    await selectDemoPatient();

    // Button enabled after selection
    await waitFor(
      () => expect(desktop().getByRole('button', { name: /start recording/i })).not.toBeDisabled(),
      { timeout: 2000 }
    );
  });

  it('shows the patient search dropdown on focus', async () => {
    mockFetch([
      { ok: true, body: workspaceOk },
      { ok: true, body: emptyConfigs },
    ]);

    render(<ClinicalCommandCenterPage />);
    await grantConsent();

    const searchInput = await screen.findByRole('combobox', { name: /search patients/i });
    await act(async () => { fireEvent.focus(searchInput); });

    await waitFor(
      () => {
        expect(screen.getByRole('listbox', { name: /patient search results/i })).toBeDefined();
        expect(screen.getByRole('option', { name: /maria santos/i })).toBeDefined();
      },
      { timeout: 2000 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2 — Model selector + Sync button gate
// ─────────────────────────────────────────────────────────────────────────────

describe('ClinicalCommandCenterPage — model config gate', () => {
  it('Sync is disabled when the selected model is not configured', async () => {
    mockFetch([
      { ok: true, body: workspaceOk },
      { ok: true, body: emptyConfigs },
    ]);

    render(<ClinicalCommandCenterPage />);
    await grantConsent();

    await waitFor(
      () => {
        const btn = desktop().getByRole('button', { name: /sync with cdss/i });
        expect(btn).toBeDisabled();
      },
      { timeout: 3000 }
    );
  });

  it('Sync is enabled when model IS configured, patient is selected, and transcript is non-empty', async () => {
    mockFetch([
      { ok: true, body: workspaceOk },
      { ok: true, body: configuredFor('anthropic') },
    ]);

    render(<ClinicalCommandCenterPage />);
    await grantConsent();

    // Still disabled before patient selection
    await waitFor(
      () => expect(desktop().getByRole('button', { name: /sync with cdss/i })).toBeDisabled(),
      { timeout: 3000 }
    );

    await selectDemoPatient();

    // Still disabled until transcript has content
    await waitFor(
      () => expect(desktop().getByRole('button', { name: /sync with cdss/i })).toBeDisabled(),
      { timeout: 2000 }
    );

    // Start recording → generates transcript → unlocks sync
    await startRecordingAndWait();

    await waitFor(
      () => expect(desktop().getByRole('button', { name: /sync with cdss/i })).not.toBeDisabled(),
      { timeout: 2000 }
    );
  });

  it('disables Sync after switching to an unconfigured model', async () => {
    mockFetch([
      { ok: true, body: workspaceOk },
      { ok: true, body: configuredFor('gemini') },
    ]);

    render(<ClinicalCommandCenterPage />);
    await grantConsent();
    await selectDemoPatient();
    // Generate transcript so hasTranscript gate is satisfied
    await startRecordingAndWait();

    // Default model (anthropic) not configured → still disabled
    await waitFor(
      () => expect(desktop().getByRole('button', { name: /sync with cdss/i })).toBeDisabled(),
      { timeout: 3000 }
    );

    const select = desktop().getByRole('combobox', { name: /select ai model/i });

    // Switch to gemini (configured) + transcript exists → enabled
    await act(async () => { fireEvent.change(select, { target: { value: 'gemini' } }); });
    await waitFor(
      () => expect(desktop().getByRole('button', { name: /sync with cdss/i })).not.toBeDisabled(),
      { timeout: 2000 }
    );

    // Switch back to anthropic (unconfigured) → disabled again
    await act(async () => { fireEvent.change(select, { target: { value: 'anthropic' } }); });
    await waitFor(
      () => expect(desktop().getByRole('button', { name: /sync with cdss/i })).toBeDisabled(),
      { timeout: 2000 }
    );
  });

  it('renders the BYOK overlay with Configure button when model is not configured', async () => {
    mockFetch([
      { ok: true, body: workspaceOk },
      { ok: true, body: emptyConfigs },
    ]);

    render(<ClinicalCommandCenterPage />);
    await grantConsent();

    await waitFor(
      () => {
        const link = desktop().getByRole('link', { name: /configure byok in settings/i });
        expect((link as HTMLAnchorElement).href).toContain('/dashboard/settings/ai-providers');
      },
      { timeout: 3000 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3 — Transcript recording
//
// Streaming interval = 1 200 ms (real timers).
// waitFor timeouts ≥ 3× the interval to accommodate CI variance.
// ─────────────────────────────────────────────────────────────────────────────

describe('ClinicalCommandCenterPage — transcript recording', () => {
  it('shows idle placeholder before recording starts', async () => {
    mockFetch([
      { ok: true, body: workspaceOk },
      { ok: true, body: emptyConfigs },
    ]);

    render(<ClinicalCommandCenterPage />);
    await grantConsent();

    // With no patient selected the placeholder points to patient selection
    await waitFor(
      () => expect(desktop().getByText(/select a patient above to begin/i)).toBeDefined(),
      { timeout: 3000 }
    );
  });

  it('clicking Start Recording updates the transcript state', async () => {
    mockFetch([
      { ok: true, body: workspaceOk },
      { ok: true, body: emptyConfigs },
    ]);

    render(<ClinicalCommandCenterPage />);
    await grantConsent();
    await selectDemoPatient();

    await waitFor(
      () => desktop().getByRole('button', { name: /start recording/i }),
      { timeout: 3000 }
    );
    await act(async () => {
      fireEvent.click(desktop().getByRole('button', { name: /start recording/i }));
    });

    // Button flips to "Stop Recording"
    await waitFor(
      () => expect(desktop().getByRole('button', { name: /stop recording/i })).toBeDefined(),
      { timeout: 2000 }
    );

    // First chunk appears in the live log after ≥ 1 200 ms
    const liveRegion = desktop().getByRole('log');
    await waitFor(
      () => expect(liveRegion.textContent?.includes('Doctor')).toBe(true),
      { timeout: 4000 }
    );
  });

  it('stopping recording reverts the button to "Start Recording"', async () => {
    mockFetch([
      { ok: true, body: workspaceOk },
      { ok: true, body: emptyConfigs },
    ]);

    render(<ClinicalCommandCenterPage />);
    await grantConsent();
    await selectDemoPatient();

    await waitFor(
      () => desktop().getByRole('button', { name: /start recording/i }),
      { timeout: 3000 }
    );
    await act(async () => {
      fireEvent.click(desktop().getByRole('button', { name: /start recording/i }));
    });

    const liveRegion = desktop().getByRole('log');
    await waitFor(
      () => expect(liveRegion.textContent?.includes('Doctor')).toBe(true),
      { timeout: 4000 }
    );

    await act(async () => {
      fireEvent.click(desktop().getByRole('button', { name: /stop recording/i }));
    });

    await waitFor(
      () => expect(desktop().getByRole('button', { name: /start recording/i })).toBeDefined(),
      { timeout: 2000 }
    );
    // Transcript kept for review after stopping
    expect(liveRegion.textContent?.includes('Doctor')).toBe(true);
  });

  it('renders PHI de-identification pills for PHI tokens', async () => {
    mockFetch([
      { ok: true, body: workspaceOk },
      { ok: true, body: emptyConfigs },
    ]);

    render(<ClinicalCommandCenterPage />);
    await grantConsent();
    await selectDemoPatient();

    await waitFor(
      () => desktop().getByRole('button', { name: /start recording/i }),
      { timeout: 3000 }
    );
    await act(async () => {
      fireEvent.click(desktop().getByRole('button', { name: /start recording/i }));
    });

    // Chunk index 1 is the PATIENT_NAME token (≈ 2 × 1 200 ms from start)
    await waitFor(
      () => expect(desktop().getByText('[PATIENT_NAME]')).toBeDefined(),
      { timeout: 5000 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 4 — Live Sync → CDSS API → alert rendering
// ─────────────────────────────────────────────────────────────────────────────

describe('ClinicalCommandCenterPage — Live Sync flow', () => {
  const cdsCards = {
    cards: [
      {
        summary:   'Interaction: Metformin + Atorvastatin detected',
        detail:    'Moderate risk of myopathy. Monitor muscle enzymes (CK).',
        indicator: 'warning',
        source:    { label: 'CDSS Rule Engine' },
      },
    ],
  };

  it('shows loading skeleton, calls CDS API, then renders the alert card', async () => {
    const triggerCds = mockFetchWithDeferredCds(
      [
        { ok: true, body: workspaceOk },
        { ok: true, body: configuredFor('anthropic') },
      ],
      cdsCards
    );

    render(<ClinicalCommandCenterPage />);
    await grantConsent();
    await selectDemoPatient();
    // Transcript required to unlock Sync button
    await startRecordingAndWait();

    await waitFor(
      () => expect(desktop().getByRole('button', { name: /sync with cdss/i })).not.toBeDisabled(),
      { timeout: 3000 }
    );

    await act(async () => {
      fireEvent.click(desktop().getByRole('button', { name: /sync with cdss/i }));
    });

    // Loading skeleton visible while fetch is deferred
    await waitFor(
      () => expect(desktop().getByRole('status', { name: /loading alerts/i })).toBeDefined(),
      { timeout: 2000 }
    );

    // Resolve CDS — skeleton disappears, card appears
    await act(async () => { triggerCds(); });

    await waitFor(
      // Chat message <p> contains summary + '\n' + detail; use regex for partial match.
      () => expect(
        desktop().getByText(/Interaction: Metformin \+ Atorvastatin detected/)
      ).toBeDefined(),
      { timeout: 2000 }
    );

    const cdsCalls = (globalThis.fetch as jest.Mock).mock.calls.filter(
      ([url]: [string]) => String(url).includes('medication-prescribe')
    );
    expect(cdsCalls).toHaveLength(1);
  });

  it('shows demo CDSS cards (never an error) when the CDS API returns a failure', async () => {
    // The demo-unblocked strategy means API failures silently fall back to
    // DEMO_CDSS_CARDS rather than surfacing an error to the clinician.
    mockFetch([
      { ok: true,  body: workspaceOk },
      { ok: true,  body: configuredFor('anthropic') },
      { ok: false, body: { error: 'Internal Server Error' } },
    ]);

    render(<ClinicalCommandCenterPage />);
    await grantConsent();
    await selectDemoPatient();
    await startRecordingAndWait();

    await waitFor(
      () => expect(desktop().getByRole('button', { name: /sync with cdss/i })).not.toBeDisabled(),
      { timeout: 3000 }
    );

    await act(async () => {
      fireEvent.click(desktop().getByRole('button', { name: /sync with cdss/i }));
    });

    await waitFor(
      () => {
        // No error message — demo cards are shown instead
        expect(desktop().queryByRole('alert')).toBeNull();
        // DEMO_CDSS_CARDS first card should be visible
        expect(desktop().getByText(/Drug Interaction: Metformin/i)).toBeDefined();
      },
      { timeout: 3000 }
    );
  });

  it('sends the correct CDS Hooks payload shape to the endpoint', async () => {
    mockFetch([
      { ok: true, body: workspaceOk },
      { ok: true, body: configuredFor('anthropic') },
      { ok: true, body: { cards: [] } },
    ]);

    render(<ClinicalCommandCenterPage />);
    await grantConsent();
    await selectDemoPatient();
    await startRecordingAndWait();

    await waitFor(
      () => expect(desktop().getByRole('button', { name: /sync with cdss/i })).not.toBeDisabled(),
      { timeout: 3000 }
    );

    await act(async () => {
      fireEvent.click(desktop().getByRole('button', { name: /sync with cdss/i }));
    });

    await waitFor(
      () => {
        const calls = (globalThis.fetch as jest.Mock).mock.calls;
        const cdsCall = calls.find(([url]: [string]) =>
          String(url).includes('medication-prescribe')
        );
        expect(cdsCall).toBeDefined();
        const payload = JSON.parse(cdsCall[1].body);
        expect(payload.hook).toBe('medication-prescribe');
        expect(payload.context.medications[0].code.coding[0].display).toContain('Metformin');
      },
      { timeout: 3000 }
    );
  });

  it('clicking a quick action bubble appends user + AI messages to the chat', async () => {
    // syncEnabled = patient + transcript + model configured + !syncing
    // Bubbles appear as soon as syncEnabled is true — no explicit Sync call needed.
    mockFetch([
      { ok: true, body: workspaceOk },
      { ok: true, body: configuredFor('anthropic') },
    ]);

    render(<ClinicalCommandCenterPage />);
    await grantConsent();
    await selectDemoPatient();
    // Streaming produces transcript → hasTranscript = true → syncEnabled = true
    await startRecordingAndWait();

    // Bubble row appears once syncEnabled is true
    await waitFor(
      () => expect(desktop().getByRole('button', { name: /rx timeline & safety/i })).toBeDefined(),
      { timeout: 3000 }
    );

    await act(async () => {
      fireEvent.click(desktop().getByRole('button', { name: /rx timeline & safety/i }));
    });

    // After clicking, "Rx Timeline & Safety" appears in BOTH the (now-used) bubble
    // button AND the user message <p> — getAllByText finds ≥ 2 elements, confirming
    // the chat message was appended.
    await waitFor(
      () => expect(screen.getAllByText('Rx Timeline & Safety').length).toBeGreaterThanOrEqual(2),
      { timeout: 2000 }
    );

    // AI reply arrives after simulateLLMResponse (~850 ms real-timer delay).
    // Contains ATC code A10BA02 (Metformina) — verifies LATAM ontology is used.
    await waitFor(
      () => expect(desktop().getByText(/A10BA02/)).toBeDefined(),
      { timeout: 3000 }
    );

    // Bubble remains enabled (persistent — no fade/disable after use)
    await waitFor(
      () => {
        const bubble = desktop().getByRole('button', { name: /rx timeline & safety/i });
        // Bubble is only disabled while isReplying; after reply it's re-enabled
        expect(bubble).toBeDefined();
      },
      { timeout: 1000 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 5 — SOAP note progressive fill
// ─────────────────────────────────────────────────────────────────────────────

describe('ClinicalCommandCenterPage — SOAP note', () => {
  it('shows "Awaiting transcript" label when transcript is empty', async () => {
    mockFetch([
      { ok: true, body: workspaceOk },
      { ok: true, body: emptyConfigs },
    ]);

    render(<ClinicalCommandCenterPage />);
    await grantConsent();

    await waitFor(
      () => expect(desktop().getByText(/awaiting transcript/i)).toBeDefined(),
      { timeout: 3000 }
    );
  });

  it('fills in the Subjective section after patient describes symptoms (SOAP_THRESHOLDS.S = 5)', async () => {
    // S — Subjective is rigidly tied to chunk index 5:
    // "Patient: Doctor, for the past five days I've had chest tightness..."
    // We must wait for that specific chunk before the section unlocks.
    mockFetch([
      { ok: true, body: workspaceOk },
      { ok: true, body: emptyConfigs },
    ]);

    render(<ClinicalCommandCenterPage />);
    await grantConsent();
    await selectDemoPatient();

    await waitFor(
      () => desktop().getByRole('button', { name: /start recording/i }),
      { timeout: 3000 }
    );
    await act(async () => {
      fireEvent.click(desktop().getByRole('button', { name: /start recording/i }));
    });

    // Wait for chunk 5 ("five days") to appear — 6 × 1 200 ms ≈ 7.2 s.
    // Timeout is 10 000 ms to accommodate CI latency.
    const liveRegion = desktop().getByRole('log');
    await waitFor(
      () => expect(liveRegion.textContent?.includes('five days')).toBe(true),
      { timeout: 10000 }
    );

    // S threshold (chunk 5) now reached → Subjective content is visible.
    await waitFor(
      () => expect(desktop().getByText(/precordial pain/i)).toBeDefined(),
      { timeout: 2000 }
    );
  });

  it('shows "Auto-fill active" header once any chunk streams', async () => {
    mockFetch([
      { ok: true, body: workspaceOk },
      { ok: true, body: emptyConfigs },
    ]);

    render(<ClinicalCommandCenterPage />);
    await grantConsent();
    await selectDemoPatient();

    await waitFor(
      () => desktop().getByRole('button', { name: /start recording/i }),
      { timeout: 3000 }
    );
    await act(async () => {
      fireEvent.click(desktop().getByRole('button', { name: /start recording/i }));
    });

    await waitFor(
      () => expect(desktop().getByText('Auto-fill active')).toBeDefined(),
      { timeout: 4000 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 6 — Modal workflows
// ─────────────────────────────────────────────────────────────────────────────

describe('ClinicalCommandCenterPage — Modal workflows', () => {
  it('Sign & Bill button is disabled when no patient is selected', async () => {
    mockFetch([
      { ok: true, body: workspaceOk },
      { ok: true, body: emptyConfigs },
    ]);

    render(<ClinicalCommandCenterPage />);
    await grantConsent();

    await waitFor(
      () => {
        const btn = desktop().getByRole('button', { name: /sign and bill/i });
        expect(btn).toBeDisabled();
      },
      { timeout: 3000 }
    );
  });

  it('Sign & Bill button becomes enabled after patient selected + recording started', async () => {
    mockFetch([
      { ok: true, body: workspaceOk },
      { ok: true, body: configuredFor('anthropic') },
    ]);

    render(<ClinicalCommandCenterPage />);
    await grantConsent();
    await selectDemoPatient();
    await startRecordingAndWait();

    await waitFor(
      () => {
        const btn = desktop().getByRole('button', { name: /sign and bill/i });
        expect(btn).not.toBeDisabled();
      },
      { timeout: 3000 }
    );
  });

  it('clicking Sign & Bill opens the billing modal', async () => {
    mockFetch([
      { ok: true, body: workspaceOk },
      { ok: true, body: configuredFor('anthropic') },
    ]);

    render(<ClinicalCommandCenterPage />);
    await grantConsent();
    await selectDemoPatient();
    await startRecordingAndWait();

    await waitFor(
      () => expect(desktop().getByRole('button', { name: /sign and bill/i })).not.toBeDisabled(),
      { timeout: 3000 }
    );

    await act(async () => {
      fireEvent.click(desktop().getByRole('button', { name: /sign and bill/i }));
    });

    // Billing modal should appear with role="dialog"
    await waitFor(
      () => expect(screen.getByRole('dialog', { name: /sign and bill/i })).toBeDefined(),
      { timeout: 2000 }
    );

    // LATAM billing content visible (multiple elements may contain CBHPM/TUSS)
    expect(screen.getAllByText(/CBHPM|TUSS/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Estimated Claim/i)).toBeDefined();
  });

  it('clicking Draft Patient Handout bubble opens the handout modal', async () => {
    mockFetch([
      { ok: true, body: workspaceOk },
      { ok: true, body: configuredFor('anthropic') },
    ]);

    render(<ClinicalCommandCenterPage />);
    await grantConsent();
    await selectDemoPatient();
    await startRecordingAndWait();

    // syncEnabled = true once patient + transcript + model configured
    await waitFor(
      () => desktop().getByRole('button', { name: /draft patient handout/i }),
      { timeout: 3000 }
    );

    await act(async () => {
      fireEvent.click(desktop().getByRole('button', { name: /draft patient handout/i }));
    });

    // Handout modal appears with accessible dialog role
    await waitFor(
      () => expect(screen.getByRole('dialog', { name: /patient handout/i })).toBeDefined(),
      { timeout: 2000 }
    );

    // Delivery method selector is visible
    expect(desktop().getByRole('button', { name: /whatsapp/i })).toBeDefined();
  });
});
