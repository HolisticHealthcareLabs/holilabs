/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, tag: string) => tag }), AnimatePresence: ({ children }: any) => children }));
jest.mock('lucide-react', () => new Proxy({}, { get: (_, k) => () => null }));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import { CopilotDraftPanel } from '../CopilotDraftPanel';

beforeEach(() => jest.clearAllMocks());

describe('CopilotDraftPanel', () => {
  it('renders the panel header', () => {
    render(<CopilotDraftPanel />);
    expect(screen.getByText(/AI Copilot/i)).toBeInTheDocument();
  });

  it('disables Check Draft button when textarea is empty', () => {
    render(<CopilotDraftPanel />);
    const btn = screen.getByRole('button', { name: /check draft/i });
    expect(btn).toBeDisabled();
  });

  it('shows error when API returns non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Server error' }),
    });
    render(<CopilotDraftPanel />);
    fireEvent.change(screen.getByPlaceholderText(/paste clinical SOAP note/i), {
      target: { value: 'Assessment: Atrial fibrillation. Plan: Start apixaban 5mg BID.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /check draft/i }));
    await waitFor(() => expect(screen.getByText('Server error')).toBeInTheDocument());
  });
});
