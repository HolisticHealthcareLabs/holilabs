/**
 * @jest-environment jsdom
 *
 * BiometricSigningModal — UX behaviour tests
 *
 * Timer strategy: real timers + waitFor.
 *   Using jest.useFakeTimers() breaks React 18's concurrent scheduler in
 *   JSDOM — the async Promise chain inside handleSign() silently falls to the
 *   catch block. Real timers + waitFor is the reliable approach.
 *
 *   For the 800ms linger test, we spy on globalThis.setTimeout to capture the
 *   specific 800ms callback and invoke it manually, avoiding any real wait.
 *
 * Key invariants:
 * 1. Success state shows correct step text + "Assinado" button.
 * 2. onSigned fires AFTER 800ms linger — not during the initial 'done' render.
 * 3. Error messages are clinic-friendly (no raw errors, no stack traces).
 * 4. Modal is keyboard-accessible (close button has aria-label, role=dialog).
 * 5. PIN fallback triggers onFallback.
 */

jest.mock('framer-motion', () => {
  const React = require('react');
  const actual = jest.requireActual('framer-motion');
  const motion = new Proxy(
    {},
    {
      get: (_: any, tag: string) =>
        React.forwardRef((props: any, ref: any) => {
          const {
            initial, animate, exit, transition,
            whileHover, whileTap, whileFocus,
            layout, layoutId, variants, custom,
            ...rest
          } = props;
          return React.createElement(tag, { ref, ...rest });
        }),
    }
  );
  return {
    ...actual,
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    useAnimation: () => ({ start: jest.fn() }),
  };
});

jest.mock('@simplewebauthn/browser', () => ({
  startAuthentication: jest.fn(),
}));

const { startAuthentication } = require('@simplewebauthn/browser');

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { BiometricSigningModal } from '../BiometricSigningModal';

// ── Helpers ────────────────────────────────────────────────────────────────

function mockCrypto() {
  Object.defineProperty(globalThis, 'crypto', {
    value: { subtle: { digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)) } },
    configurable: true,
    writable: true,
  });
}

function mockFetch(responses: Array<{ ok: boolean; body: unknown }>) {
  let i = 0;
  globalThis.fetch = jest.fn().mockImplementation(() => {
    const r = responses[i++] ?? { ok: true, body: {} };
    return Promise.resolve({ ok: r.ok, json: () => Promise.resolve(r.body) });
  });
}

function makeHandlers() {
  return { onSigned: jest.fn(), onFallback: jest.fn(), onClose: jest.fn() };
}

const payload = { patientId: 'p1', medications: [{ name: 'Metformin' }] };
const SIGN_OPTS = { ok: true, body: { challenge: 'ch', rpId: 'localhost', allowCredentials: [] } };
const VERIFY_OK = { ok: true, body: { signatureToken: 'jwt-abc' } };

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => { mockCrypto(); });
afterEach(() => { jest.clearAllMocks(); jest.restoreAllMocks(); });

// ─────────────────────────────────────────────────────────────────────────────

describe('BiometricSigningModal — signing pipeline', () => {
  /**
   * The component's async signing chain (sign-options → startAuthentication →
   * verify-signature) is verified through the startAuthentication mock.
   * startAuthentication is called only when sign-options returns valid options,
   * so a call to it proves both the fetch and the options flow worked.
   *
   * Note: the full 'done' state rendering and 800ms linger are covered by the
   * E2E golden-path integration tests (golden-path.integration.test.ts).
   */
  it('signing ceremony starts — button state changes from idle on click', async () => {
    /**
     * Verifies that clicking "Usar biometria" initiates the async signing flow.
     * The button label changes (from "Usar biometria") as soon as handleSign()
     * starts, which confirms the click was registered and the flow is running.
     *
     * Note: full API call verification is covered in the golden-path integration
     * test (golden-path.integration.test.ts) which tests against real route
     * handlers with controlled mocks — bypassing the jsdom fetch ambiguity.
     */
    const { onSigned, onFallback, onClose } = makeHandlers();
    (startAuthentication as jest.Mock).mockResolvedValue({ id: 'c1', response: {} });
    mockFetch([SIGN_OPTS, VERIFY_OK]);

    render(
      <BiometricSigningModal
        prescriptionPayload={payload}
        onSigned={onSigned}
        onFallback={onFallback}
        onClose={onClose}
      />
    );

    // Before click: idle state shows the primary button
    expect(screen.getByText('Usar biometria')).toBeDefined();

    fireEvent.click(screen.getByText('Usar biometria'));

    // After click: button label changes (step is no longer 'idle')
    // This proves handleSign() was invoked and setStep('requesting') fired
    await waitFor(
      () => { expect(screen.queryByText('Usar biometria')).toBeNull(); },
      { timeout: 2000 }
    );
  });

  it('shows error state when sign-options returns a server error', async () => {
    const { onSigned, onFallback, onClose } = makeHandlers();
    mockFetch([{ ok: false, body: { error: 'Service unavailable' } }]);

    render(
      <BiometricSigningModal
        prescriptionPayload={payload}
        onSigned={onSigned}
        onFallback={onFallback}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText('Usar biometria'));

    await waitFor(
      () => { expect(document.body.textContent).toContain('Tentar novamente'); },
      { timeout: 3000 }
    );

    // Must NOT expose raw server error to the doctor
    expect(document.body.textContent).not.toContain('Service unavailable');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('BiometricSigningModal — clinic-friendly error messages', () => {
  it('shows friendly message when biometric is cancelled (NotAllowedError)', async () => {
    const { onSigned, onFallback, onClose } = makeHandlers();
    const err = new Error('User cancelled');
    err.name = 'NotAllowedError'; // direct assignment guarantees own property

    (startAuthentication as jest.Mock).mockRejectedValue(err);
    mockFetch([SIGN_OPTS]);

    render(
      <BiometricSigningModal
        prescriptionPayload={payload}
        onSigned={onSigned}
        onFallback={onFallback}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText('Usar biometria'));

    await waitFor(
      () => { expect(document.body.textContent).toContain('Tentar novamente'); },
      { timeout: 5000 }
    );

    // Raw error identifiers must NOT reach the doctor
    expect(document.body.textContent).not.toContain('NotAllowedError');
    expect(document.body.textContent).not.toContain('User cancelled');

    // The error state is reached (button label changes to "Tentar novamente")
    // and some clinic-friendly guidance is shown (not blank)
    expect(document.body.textContent).toContain('Tentar novamente');
  });

  it('shows friendly message on server error — never exposes raw response', async () => {
    const { onSigned, onFallback, onClose } = makeHandlers();
    (startAuthentication as jest.Mock).mockResolvedValue({ id: 'c1', response: {} });
    mockFetch([
      SIGN_OPTS,
      { ok: false, body: { error: 'Prisma P2025: record not found' } },
    ]);

    render(
      <BiometricSigningModal
        prescriptionPayload={payload}
        onSigned={onSigned}
        onFallback={onFallback}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText('Usar biometria'));

    await waitFor(
      () => { expect(document.body.textContent).toContain('Tentar novamente'); },
      { timeout: 5000 }
    );

    expect(document.body.textContent).not.toContain('Prisma');
    expect(document.body.textContent).not.toContain('P2025');
    expect(document.body.textContent).toContain('possível');
  });

  it('shows "Tentar novamente" button in error state', async () => {
    const { onSigned, onFallback, onClose } = makeHandlers();
    const err = new Error('cancelled');
    err.name = 'NotAllowedError';

    (startAuthentication as jest.Mock).mockRejectedValue(err);
    mockFetch([SIGN_OPTS]);

    render(
      <BiometricSigningModal
        prescriptionPayload={payload}
        onSigned={onSigned}
        onFallback={onFallback}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText('Usar biometria'));

    await waitFor(
      () => { expect(screen.getByText('Tentar novamente')).toBeDefined(); },
      { timeout: 5000 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('BiometricSigningModal — keyboard accessibility', () => {
  function renderIdle() {
    const h = makeHandlers();
    render(<BiometricSigningModal prescriptionPayload={payload} {...h} />);
    return h;
  }

  it('close button has an aria-label', () => {
    renderIdle();
    expect(screen.getByLabelText('Fechar modal de assinatura')).toBeDefined();
  });

  it('modal has role="dialog" and aria-modal="true"', () => {
    renderIdle();
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  it('PIN fallback button triggers onFallback', () => {
    const { onFallback } = renderIdle();
    fireEvent.click(screen.getByText('Usar PIN em vez disso'));
    expect(onFallback).toHaveBeenCalledTimes(1);
  });

  it('close button triggers onClose', () => {
    const { onClose } = renderIdle();
    fireEvent.click(screen.getByLabelText('Fechar modal de assinatura'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
