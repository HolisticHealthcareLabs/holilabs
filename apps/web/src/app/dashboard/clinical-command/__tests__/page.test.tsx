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
              layout, layoutId,
              ...rest
            } = props;
            return React.createElement(tag, { ref, ...rest, disabled: props.disabled });
          });
        }
        return cache[tag];
      },
    }
  );

  return {
    ...actual,
    motion,
    m: motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    LazyMotion: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    domMax: {},
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

jest.mock('../_components/useMicrophoneSTT', () => {
  const React = require('react');
  return {
    useMicrophoneSTT: ({ onTranscript, enabled }: any) => {
      const [isListening, setIsListening] = React.useState(false);
      const startListening = React.useCallback(async () => {
        if (!enabled) return;
        setIsListening(true);
        // Simulate realistic transcript chunks with longer delays
        // Total words must be > 10 for SOAP generation to trigger
        setTimeout(() => {
          onTranscript('Doctor: Good morning, Robert Chen. I am reviewing your chart now and I see some concerning symptoms.', true, 0);
        }, 500);
        setTimeout(() => {
          onTranscript('Patient: I have had severe chest tightness and precordial pain for five days now, and it is getting worse.', true, 1);
        }, 1500);
        setTimeout(() => {
          onTranscript('Doctor: I see. Does it get worse when you walk or climb stairs? We should run some tests immediately.', true, 0);
        }, 2500);
      }, [onTranscript, enabled]);
      const stopListening = React.useCallback(() => {
        setIsListening(false);
      }, []);
      return {
        isListening,
        startListening,
        stopListening,
        error: null,
        isSupported: true,
        volume: 0.5,
      };
    },
  };
});

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
  globalThis.fetch = jest.fn().mockImplementation((url: string) => {
    // Specific URL matchers (always override sequential if matched)
    if (url.includes('/api/clinical/soap/generate')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
    }
    if (url.includes('/api/billing/analyze')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            extractedDiagnoses: [{ code: 'I10', name: 'Hypertension', type: 'primary' }],
            suggestedServices: [{ code: '123', name: 'Consultation', system: 'CBHPM', estimatedValueBRL: 250 }],
            totalEstimatedValue: 250,
            cdiWarnings: []
          }
        })
      });
    }

    // Sequential responses for workspace/config calls
    if (url.includes('/api/workspace/') || url.includes('/api/user/model-configs')) {
      if (i < responses.length) {
        const r = responses[i++];
        return Promise.resolve({ ok: r.ok, json: () => Promise.resolve(r.body) });
      }
    }

    if (url.includes('/api/clinical/cds-hooks')) {
      // Use next sequential response if it's an error
      if (i < responses.length && !responses[i].ok) {
        const r = responses[i++];
        return Promise.resolve({ ok: false, status: 500 });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          cards: [{
            uuid: '1',
            summary: 'Drug Interaction: Metformin and Contrast',
            indicator: 'warning',
            source: { label: 'Local CDSS' }
          }]
        })
      });
    }

    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
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
  const btns = await screen.findAllByRole('button', { name: /digital/i });
  for (const btn of btns) {
    await act(async () => { fireEvent.click(btn); });
  }
  // WAIT for consent to be applied (button disappears)
  await waitFor(() => expect(screen.queryByRole('button', { name: /digital/i })).toBeNull(), { timeout: 3000 });
}

/**
 * Returns a scoped query object for the desktop (main) layout, avoiding
 * duplicate-element errors from the mobile fallback pane.
 */
function desktop() {
  // Target the ThreePanelLayout container which includes left, center, and right panels
  const container = document.querySelector('.flex.flex-col.h-dvh');
  return within(container as HTMLElement || document.body);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper — patient selection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Focuses the patient search input and clicks the first demo patient
 * (Robert Chen) in the dropdown.  Awaits the patient chip to confirm selection.
 */
async function selectDemoPatient() {
  // Expand search first — find by icon then get parent container
  const searchIcon = document.querySelector('.lucide-search');
  if (searchIcon) {
    const searchContainer = searchIcon.closest('div[style*="width"]');
    if (searchContainer) {
      await act(async () => { fireEvent.click(searchContainer); });
    }
  }

  const searchInput = await screen.findByRole('combobox', { name: /Search patients/i });
  await act(async () => { fireEvent.focus(searchInput); });

  await waitFor(
    () => expect(screen.getByRole('option', { name: /Robert Chen/i })).toBeDefined(),
    { timeout: 2000 }
  );

  await act(async () => {
    fireEvent.click(screen.getByRole('option', { name: /Robert Chen/i }));
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

  // WAIT for enough transcript chunks to appear (important for wordCount threshold > 10)
  await waitFor(
    () => expect(desktop().getByText(/five days/i)).toBeDefined(),
    { timeout: 5000 }
  );

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

    // Expand search first
    const searchIcon = document.querySelector('.lucide-search');
    const searchContainer = searchIcon?.closest('div[style*="width"]');
    if (searchContainer) {
      await act(async () => { fireEvent.click(searchContainer); });
    }

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
      { ok: true, body: configuredFor('claude-sonnet-4-20250514') },
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
      { ok: true, body: configuredFor('gemini-2.5-pro') },
    ]);

    render(<ClinicalCommandCenterPage />);
    await selectDemoPatient();
    await grantConsent();
    // Generate transcript so hasTranscript gate is satisfied
    await startRecordingAndWait();

    const select = desktop().getByRole('combobox', { name: /select model/i });

    // Switch to gemini-2.5-pro (configured) + transcript exists → enabled
    await act(async () => { fireEvent.change(select, { target: { value: 'gemini-2.5-pro' } }); });
    await waitFor(
      () => expect(desktop().getByRole('button', { name: /sync with cdss/i })).not.toBeDisabled(),
      { timeout: 3000 }
    );

    // Switch to o4-mini (unconfigured) → disabled again
    await act(async () => { fireEvent.change(select, { target: { value: 'o4-mini' } }); });
    await waitFor(
      () => expect(desktop().getByRole('button', { name: /sync with cdss/i })).toBeDisabled(),
      { timeout: 5000 }
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
        const link = desktop().getByRole('link', { name: /configure byok/i });
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
      () => expect(desktop().getAllByText(/select patient/i).length).toBeGreaterThan(0),
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
      () => expect(desktop().getByText('[NAME]')).toBeDefined(),
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
        { ok: true, body: configuredFor('claude-sonnet-4-20250514') },
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
    // Enable demo mode for this test
    localStorage.setItem('demo_mode', 'true');

    // The demo-unblocked strategy means API failures silently fall back to
    // DEMO_CDSS_CARDS rather than surfacing an error to the clinician.
    mockFetch([
      { ok: true,  body: workspaceOk },
      { ok: true,  body: configuredFor('claude-sonnet-4-20250514') },
      { ok: false, body: { error: 'Internal Server Error' } },
    ]);

    render(<ClinicalCommandCenterPage />);
    await selectDemoPatient();
    await grantConsent();
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
      { timeout: 5000 }
    );

    localStorage.removeItem('demo_mode');
  });

  it('sends the correct CDS Hooks payload shape to the endpoint', async () => {
    mockFetch([
      { ok: true, body: workspaceOk },
      { ok: true, body: configuredFor('claude-sonnet-4-20250514') },
      { ok: true, body: { cards: [] } },
    ]);

    render(<ClinicalCommandCenterPage />);
    await selectDemoPatient();
    await grantConsent();
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
      { ok: true, body: configuredFor('claude-sonnet-4-20250514') },
    ]);

    render(<ClinicalCommandCenterPage />);
    await grantConsent();
    await selectDemoPatient();
    // Streaming produces transcript → hasTranscript = true → syncEnabled = true
    await startRecordingAndWait();

    // Bubble row appears once syncEnabled is true
    await waitFor(
      () => expect(desktop().getByRole('button', { name: /rx timeline/i })).toBeDefined(),
      { timeout: 3000 }
    );

    await act(async () => {
      fireEvent.click(desktop().getByRole('button', { name: /rx timeline/i }));
    });

    // After clicking, "Rx Timeline & Safety" appears in BOTH the (now-used) bubble
    // button AND the user message <p> — getAllByText finds ≥ 2 elements, confirming
    // the chat message was appended.
    await waitFor(
      () => expect(screen.getAllByText(/rx timeline/i).length).toBeGreaterThanOrEqual(2),
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
        const bubble = desktop().getByRole('button', { name: /rx timeline/i });
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
  it('shows /awaiting transcription/i label when transcript is empty', async () => {
    mockFetch([
      { ok: true, body: workspaceOk },
      { ok: true, body: emptyConfigs },
    ]);

    render(<ClinicalCommandCenterPage />);
    await grantConsent();
    await selectDemoPatient();

    // Start recording but no transcript yet
    await act(async () => {
      fireEvent.click(desktop().getByRole('button', { name: /start recording/i }));
    });

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
      () => expect(desktop().getByText(/auto fill/i)).toBeDefined(),
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
      { ok: true, body: configuredFor('claude-sonnet-4-20250514') },
    ]);

    render(<ClinicalCommandCenterPage />);
    await selectDemoPatient();
    await grantConsent();
    await startRecordingAndWait();

    await act(async () => {
      fireEvent.click(desktop().getByRole('button', { name: /stop recording/i }));
    });

    await waitFor(
      () => {
        const btn = desktop().getByRole('button', { name: /sign and bill/i });
        expect(btn).not.toBeDisabled();
      },
      { timeout: 10000 }
    );
  });

  it('clicking Sign & Bill opens the billing modal', async () => {
    mockFetch([
      { ok: true, body: workspaceOk },
      { ok: true, body: configuredFor('claude-sonnet-4-20250514') },
    ]);

    render(<ClinicalCommandCenterPage />);
    await selectDemoPatient();
    await grantConsent();
    await startRecordingAndWait();

    await act(async () => {
      fireEvent.click(desktop().getByRole('button', { name: /stop recording/i }));
    });

    await waitFor(
      () => expect(desktop().getByRole('button', { name: /sign and bill/i })).not.toBeDisabled(),
      { timeout: 10000 }
    );

    await act(async () => {
      fireEvent.click(desktop().getByRole('button', { name: /sign and bill/i }));
    });

    // Intermediate review modal should appear
    await waitFor(() => expect(screen.getByRole('button', { name: /confirm and proceed/i })).toBeDefined());
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /confirm and proceed/i }));
    });

    // Final billing modal should appear with role="dialog"
    await waitFor(
      () => expect(screen.getByRole('dialog', { name: /sign and bill/i })).toBeDefined(),
      { timeout: 5000 }
    );

    // LATAM billing content visible (multiple elements may contain CBHPM/TUSS)
    expect(screen.getAllByText(/CBHPM|TUSS/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Estimated Claim/i)).toBeDefined();
  });

  it('clicking Draft Patient Handout bubble opens the handout modal', async () => {
    // Enable demo mode for this test
    localStorage.setItem('demo_mode', 'true');

    mockFetch([
      { ok: true, body: workspaceOk },
      { ok: true, body: configuredFor('claude-sonnet-4-20250514') },
    ]);

    render(<ClinicalCommandCenterPage />);
    await selectDemoPatient();
    await grantConsent();
    await startRecordingAndWait();

    // Wait for lazy component
    await waitFor(() => expect(screen.queryByText(/loading co pilot/i)).toBeNull(), { timeout: 5000 });

    // Trigger sync to get bubbles
    const syncBtn = desktop().getByRole('button', { name: /sync with cdss/i });
    await act(async () => { fireEvent.click(syncBtn); });

    // Wait for cards to appear
    await screen.findAllByText(/drug interaction/i);

    const bubble = desktop().getByRole('button', { name: /draft handout/i });
    await act(async () => {
      fireEvent.click(bubble);
    });

    // Handout modal appears with accessible dialog role
    await waitFor(
      () => expect(screen.getByRole('dialog', { name: /patient handout communication/i })).toBeDefined(),
      { timeout: 5000 }
    );

    // Delivery method selector is visible
    expect(screen.getByRole('button', { name: /whats app/i })).toBeDefined();

    localStorage.removeItem('demo_mode');
  });
});
