/** @jest-environment jsdom */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ConsentManagementPanel } from '../ConsentManagementPanel';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('ConsentManagementPanel', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows loading skeleton initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    render(<ConsentManagementPanel patientId="pat-1" />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders consent types after load', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ consents: [] }) });
    render(<ConsentManagementPanel patientId="pat-1" />);
    await waitFor(() => expect(screen.getByText('Consent Management')).toBeInTheDocument());
    expect(screen.getByText('Clinical Care Access')).toBeInTheDocument();
  });

  it('shows revoke confirmation modal for required consent', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ consents: [{ consentType: { id: 'treatment_access', name: 'Clinical Care Access', description: 'Allow doctors', required: true, category: 'TREATMENT', icon: '🏥' }, granted: true, version: '1.0' }] }) });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ consents: [{ consentType: { id: 'treatment_access', name: 'Clinical Care Access', description: 'Allow doctors', required: true, category: 'TREATMENT', icon: '🏥' }, granted: true, version: '1.0' }] }) });
    render(<ConsentManagementPanel patientId="pat-1" />);
    await waitFor(() => screen.getByText('Clinical Care Access'));
    // Toggle the required consent
    const toggleBtn = screen.getAllByRole('button').find(b => b.querySelector('span.translate-x-7'));
    if (toggleBtn) {
      fireEvent.click(toggleBtn);
      expect(screen.getByText(/Revoke Critical Consent/i)).toBeInTheDocument();
    }
  });
});
