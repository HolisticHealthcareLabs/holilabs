/**
 * @jest-environment jsdom
 *
 * AIProvidersSettingsPage — UX behaviour tests
 *
 * CRITICAL GUARDRAIL: jest.useFakeTimers() is intentionally NOT used.
 * Fake timers interfere with act() Promise-draining in JSDOM when paired
 * with Framer Motion.  All async assertions use real timers + waitFor.
 */

jest.mock('framer-motion', () => {
  const React = require('react');
  const actual = jest.requireActual('framer-motion');

  // Cache ensures stable component types across renders (prevents remount loops)
  const cache: Record<string, React.ComponentType<any>> = {};

  const motion = new Proxy(
    {},
    {
      get: (_: any, tag: string) => {
        if (!cache[tag]) {
          cache[tag] = React.forwardRef((props: any, ref: any) => {
            const { initial, animate, exit, transition, whileHover, whileTap, variants, ...rest } = props;
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

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import AIProvidersSettingsPage from '../page';

// ─────────────────────────────────────────────────────────────────────────────

const workspaceResponse = { workspaceId: 'ws-1', role: 'ADMIN' };
const configsResponse   = {
  configs: [
    { provider: 'gemini', isConfigured: true, isActive: true, maskedKey: 'AIza***7890' },
  ],
};

function mockFetch(responses: Array<{ ok: boolean; body: unknown }>) {
  let i = 0;
  globalThis.fetch = jest.fn().mockImplementation(() => {
    const r = responses[i++] ?? { ok: true, body: {} };
    return Promise.resolve({ ok: r.ok, json: () => Promise.resolve(r.body) });
  });
}

beforeEach(() => { jest.clearAllMocks(); });
afterEach(() => { jest.clearAllMocks(); });

// ─────────────────────────────────────────────────────────────────────────────

describe('AIProvidersSettingsPage — skeleton loading', () => {
  it('renders skeleton cards while workspace is loading', () => {
    globalThis.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
    render(<AIProvidersSettingsPage />);

    const skeletons = document.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders all three provider cards after workspace + configs load', async () => {
    mockFetch([
      { ok: true, body: workspaceResponse },
      { ok: true, body: configsResponse },
    ]);

    render(<AIProvidersSettingsPage />);
    await waitFor(() => {
      expect(screen.getByText('Google Gemini')).toBeDefined();
      expect(screen.getByText('DeepSeek')).toBeDefined();
      expect(screen.getByText('OpenAI')).toBeDefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('AIProvidersSettingsPage — inline revoke confirmation', () => {
  it('clicking revoke shows inline confirmation — no browser confirm()', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm');
    mockFetch([
      { ok: true, body: { ...workspaceResponse, role: 'ADMIN' } },
      { ok: true, body: configsResponse },
    ]);

    render(<AIProvidersSettingsPage />);
    await waitFor(() => screen.getByText('Google Gemini'));

    const revokeBtn = screen.getByText(/revoke key/i);
    fireEvent.click(revokeBtn);

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/confirm revoke/i)).toBeDefined();
    expect(screen.getByText('cancel')).toBeDefined();

    confirmSpy.mockRestore();
  });

  it('cancel hides the inline confirmation', async () => {
    mockFetch([
      { ok: true, body: { ...workspaceResponse, role: 'ADMIN' } },
      { ok: true, body: configsResponse },
    ]);

    render(<AIProvidersSettingsPage />);
    await waitFor(() => screen.getByText('Google Gemini'));

    fireEvent.click(screen.getByText(/revoke key/i));
    expect(screen.getByText(/confirm revoke/i)).toBeDefined();

    fireEvent.click(screen.getByText('cancel'));
    expect(screen.queryByText(/confirm revoke/i)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('AIProvidersSettingsPage — save key feedback', () => {
  it('clears the key input after a successful save', async () => {
    mockFetch([
      { ok: true, body: workspaceResponse },
      { ok: true, body: configsResponse },
      { ok: true, body: { id: 'cfg-2', provider: 'anthropic', isActive: true, updatedAt: new Date().toISOString() } },
      { ok: true, body: configsResponse },
    ]);

    render(<AIProvidersSettingsPage />);
    await waitFor(() => screen.getByText('DeepSeek'));

    const input = screen.getByLabelText('API key for DeepSeek') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'sk-api03-validkey' } });
    expect(input.value).toBe('sk-api03-validkey');

    const allButtons = screen.getAllByRole('button');
    const enabledSaveBtn = allButtons.find(
      (btn) => btn.textContent?.trim() === 'save key btn' && !(btn as HTMLButtonElement).disabled
    );
    expect(enabledSaveBtn).toBeDefined();
    fireEvent.click(enabledSaveBtn!);

    await waitFor(
      () => {
        const currentInput = screen.queryByLabelText('API key for DeepSeek') as HTMLInputElement | null;
        expect(currentInput?.value ?? '').toBe('');
      },
      { timeout: 2000 }
    );
  });

  it('shows a clinic-friendly error on save failure — no raw server errors', async () => {
    mockFetch([
      { ok: true,  body: workspaceResponse },
      { ok: true,  body: configsResponse },
      { ok: false, body: { error: 'Prisma unique constraint failed: provider field' } },
    ]);

    render(<AIProvidersSettingsPage />);
    await waitFor(() => screen.getByText('DeepSeek'));

    const input = screen.getByLabelText('API key for DeepSeek') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'sk-api03-test' } });

    const allButtons = screen.getAllByRole('button');
    const enabledSaveBtn = allButtons.find(
      (btn) => btn.textContent?.trim() === 'save key btn' && !(btn as HTMLButtonElement).disabled
    );
    expect(enabledSaveBtn).toBeDefined();
    fireEvent.click(enabledSaveBtn!);

    await waitFor(() => {
      expect(screen.queryByText(/Prisma/)).toBeNull();
      expect(screen.queryByText(/unique constraint/)).toBeNull();
      expect(screen.getByText('Unable to save the key. Please try again.')).toBeDefined();
    }, { timeout: 2000 });
  });

  it('key input is accessible to clinician role (not admin-only)', async () => {
    mockFetch([
      { ok: true, body: { workspaceId: 'ws-1', role: 'CLINICIAN' } },
      { ok: true, body: configsResponse },
    ]);

    render(<AIProvidersSettingsPage />);
    await waitFor(() => screen.getByText('Google Gemini'));

    expect(screen.getByLabelText('API key for Google Gemini')).toBeDefined();
    expect(screen.getByLabelText('API key for DeepSeek')).toBeDefined();
    expect(screen.getByLabelText('API key for OpenAI')).toBeDefined();
  });
});
