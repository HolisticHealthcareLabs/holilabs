/**
 * @jest-environment jsdom
 *
 * SegurancaSettingsPage — UX behaviour tests
 */

jest.mock('framer-motion', () => {
  const React = require('react');
  const actual = jest.requireActual('framer-motion');
  const motion = new Proxy(
    {},
    {
      get: (_: any, tag: string) =>
        React.forwardRef((props: any, ref: any) => {
          const { initial, animate, exit, transition, whileHover, whileTap, variants, ...rest } = props;
          return React.createElement(tag, { ref, ...rest });
        }),
    }
  );
  return {
    ...actual,
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

jest.mock('@simplewebauthn/browser', () => ({
  startRegistration: jest.fn(),
}));

const { startRegistration } = require('@simplewebauthn/browser');

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import SegurancaSettingsPage from '../page';

// ─────────────────────────────────────────────────────────────────────────────

const mockCredentials = [
  {
    id: 'cred-1',
    name: 'MacBook Touch ID',
    deviceType: 'singleDevice',
    createdAt: '2026-03-01T10:00:00Z',
    lastUsedAt: '2026-03-03T14:00:00Z',
  },
];

function mockFetch(responses: Array<{ ok: boolean; body: unknown }>) {
  let i = 0;
  globalThis.fetch = jest.fn().mockImplementation(() => {
    const r = responses[i++] ?? { ok: true, body: {} };
    return Promise.resolve({ ok: r.ok, json: () => Promise.resolve(r.body) });
  });
}

beforeEach(() => { jest.clearAllMocks(); });

// ─────────────────────────────────────────────────────────────────────────────

describe('SegurancaSettingsPage — skeleton loading', () => {
  it('shows skeleton while credentials are loading', () => {
    globalThis.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
    render(<SegurancaSettingsPage />);
    expect(screen.getByLabelText(/loading devices/i)).toBeDefined();
  });

  it('renders credentials after load', async () => {
    mockFetch([{ ok: true, body: { credentials: mockCredentials } }]);
    render(<SegurancaSettingsPage />);
    await waitFor(() => {
      expect(screen.getByText('MacBook Touch ID')).toBeDefined();
    });
  });

  it('shows human-readable device type label', async () => {
    mockFetch([{ ok: true, body: { credentials: mockCredentials } }]);
    render(<SegurancaSettingsPage />);
    await waitFor(() => {
      expect(screen.getByText(/single device/i)).toBeDefined();
    });
  });

  it('shows empty-state message when no credentials', async () => {
    mockFetch([{ ok: true, body: { credentials: [] } }]);
    render(<SegurancaSettingsPage />);
    await waitFor(() => {
      expect(screen.getByText(/no devices/i)).toBeDefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('SegurancaSettingsPage — inline revoke confirmation', () => {
  it('clicking revoke shows inline confirmation, NOT browser confirm()', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm');
    mockFetch([{ ok: true, body: { credentials: mockCredentials } }]);
    render(<SegurancaSettingsPage />);
    await waitFor(() => screen.getByText('MacBook Touch ID'));

    fireEvent.click(screen.getByLabelText(/revoke MacBook Touch ID/i));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByText('confirm')).toBeDefined();
    expect(screen.getByText('cancel')).toBeDefined();

    expect(screen.getByText('MacBook Touch ID')).toBeDefined();
    expect(screen.getByText(/remove device/i)).toBeDefined();

    confirmSpy.mockRestore();
  });

  it('cancel dismisses inline confirmation', async () => {
    mockFetch([{ ok: true, body: { credentials: mockCredentials } }]);
    render(<SegurancaSettingsPage />);
    await waitFor(() => screen.getByText('MacBook Touch ID'));

    fireEvent.click(screen.getByLabelText(/revoke MacBook Touch ID/i));
    expect(screen.getByText('confirm')).toBeDefined();

    fireEvent.click(screen.getByText('cancel'));
    expect(screen.queryByText('confirm')).toBeNull();
  });

  it('confirm calls DELETE and reloads credentials', async () => {
    mockFetch([
      { ok: true, body: { credentials: mockCredentials } }, // initial
      { ok: true, body: {} },                               // DELETE
      { ok: true, body: { credentials: [] } },              // reload
    ]);

    render(<SegurancaSettingsPage />);
    await waitFor(() => screen.getByText('MacBook Touch ID'));

    fireEvent.click(screen.getByLabelText(/revoke MacBook Touch ID/i));
    fireEvent.click(screen.getByText('confirm'));

    await waitFor(() => {
      const calls = (globalThis.fetch as jest.Mock).mock.calls;
      const deletedCall = calls.find(
        (c: any[]) => c[0]?.includes('cred-1') && c[1]?.method === 'DELETE'
      );
      expect(deletedCall).toBeDefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('SegurancaSettingsPage — device registration', () => {
  it('shows success message after successful registration', async () => {
    (startRegistration as jest.Mock).mockResolvedValue({ id: 'new-cred', response: {} });
    mockFetch([
      { ok: true, body: { credentials: [] } },
      { ok: true, body: { challenge: 'ch', rp: { name: 'Holilabs', id: 'localhost' } } },
      { ok: true, body: { verified: true } },
      { ok: true, body: { credentials: mockCredentials } },
    ]);

    render(<SegurancaSettingsPage />);
    await waitFor(() => screen.getByText(/no devices/i));

    fireEvent.change(screen.getByLabelText(/device name placeholder/i), {
      target: { value: 'Meu MacBook' },
    });
    fireEvent.click(screen.getByText(/register with biometrics/i));

    await waitFor(() => {
      expect(screen.getByText(/device registered/i)).toBeDefined();
    });
  });

  it('shows clinic-friendly error when biometric hardware fails', async () => {
    const hardwareErr = new Error('authenticator not available in this context');
    (startRegistration as jest.Mock).mockRejectedValue(hardwareErr);
    mockFetch([
      { ok: true, body: { credentials: [] } },
      { ok: true, body: { challenge: 'ch', rp: { name: 'Holilabs', id: 'localhost' } } },
    ]);

    render(<SegurancaSettingsPage />);
    await waitFor(() => screen.getByText(/no devices/i));
    fireEvent.click(screen.getByText(/register with biometrics/i));

    await waitFor(() => {
      expect(screen.queryByText(/not available in this context/)).toBeNull();
      expect(screen.getByText(/registration error/i)).toBeDefined();
    });
  });

  it('shows clinic-friendly message when user cancels registration (NotAllowedError)', async () => {
    const cancelled = Object.assign(new Error('user cancelled'), { name: 'NotAllowedError' });
    (startRegistration as jest.Mock).mockRejectedValue(cancelled);
    mockFetch([
      { ok: true, body: { credentials: [] } },
      { ok: true, body: { challenge: 'ch', rp: { name: 'Holilabs', id: 'localhost' } } },
    ]);

    render(<SegurancaSettingsPage />);
    await waitFor(() => screen.getByText(/no devices/i));
    fireEvent.click(screen.getByText(/register with biometrics/i));

    await waitFor(() => {
      expect(screen.queryByText(/user cancelled/)).toBeNull();
      expect(screen.getByText(/registration cancelled/i)).toBeDefined();
    });
  });
});
