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
    expect(screen.getByLabelText('Carregando dispositivos…')).toBeDefined();
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
      expect(screen.getByText(/Dispositivo único/)).toBeDefined();
    });
  });

  it('shows empty-state message when no credentials', async () => {
    mockFetch([{ ok: true, body: { credentials: [] } }]);
    render(<SegurancaSettingsPage />);
    await waitFor(() => {
      expect(screen.getByText(/Nenhum dispositivo registrado/)).toBeDefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('SegurancaSettingsPage — inline revoke confirmation', () => {
  it('clicking Revogar shows inline confirmation, NOT browser confirm()', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm');
    mockFetch([{ ok: true, body: { credentials: mockCredentials } }]);
    render(<SegurancaSettingsPage />);
    await waitFor(() => screen.getByText('MacBook Touch ID'));

    fireEvent.click(screen.getByLabelText('Revogar MacBook Touch ID'));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByText('Confirmar')).toBeDefined();
    expect(screen.getByText('Cancelar')).toBeDefined();

    // The credential name appears in both the card row AND the confirmation message.
    // Use getAllByText to handle the multiple-element case.
    const nameMatches = screen.getAllByText(/MacBook Touch ID/);
    expect(nameMatches.length).toBeGreaterThanOrEqual(2);

    confirmSpy.mockRestore();
  });

  it('Cancelar dismisses inline confirmation', async () => {
    mockFetch([{ ok: true, body: { credentials: mockCredentials } }]);
    render(<SegurancaSettingsPage />);
    await waitFor(() => screen.getByText('MacBook Touch ID'));

    fireEvent.click(screen.getByLabelText('Revogar MacBook Touch ID'));
    expect(screen.getByText('Confirmar')).toBeDefined();

    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByText('Confirmar')).toBeNull();
  });

  it('Confirmar calls DELETE and reloads credentials', async () => {
    mockFetch([
      { ok: true, body: { credentials: mockCredentials } }, // initial
      { ok: true, body: {} },                               // DELETE
      { ok: true, body: { credentials: [] } },              // reload
    ]);

    render(<SegurancaSettingsPage />);
    await waitFor(() => screen.getByText('MacBook Touch ID'));

    fireEvent.click(screen.getByLabelText('Revogar MacBook Touch ID'));
    fireEvent.click(screen.getByText('Confirmar'));

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
    await waitFor(() => screen.getByText(/Nenhum dispositivo/));

    fireEvent.change(screen.getByLabelText('Nome do dispositivo'), {
      target: { value: 'Meu MacBook' },
    });
    fireEvent.click(screen.getByText('Registrar com biometria'));

    await waitFor(() => {
      expect(screen.getByText('Dispositivo registrado com sucesso.')).toBeDefined();
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
    await waitFor(() => screen.getByText(/Nenhum dispositivo/));
    fireEvent.click(screen.getByText('Registrar com biometria'));

    await waitFor(() => {
      // Must NOT show raw error message
      expect(screen.queryByText(/not available in this context/)).toBeNull();
      // Must show clinic-friendly fallback
      expect(
        screen.getByText(
          'Não foi possível registrar o dispositivo. Tente novamente ou contate o suporte.'
        )
      ).toBeDefined();
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
    await waitFor(() => screen.getByText(/Nenhum dispositivo/));
    fireEvent.click(screen.getByText('Registrar com biometria'));

    await waitFor(() => {
      expect(screen.queryByText(/user cancelled/)).toBeNull();
      expect(
        screen.getByText('Registro cancelado. Tente novamente quando estiver pronto.')
      ).toBeDefined();
    });
  });
});
