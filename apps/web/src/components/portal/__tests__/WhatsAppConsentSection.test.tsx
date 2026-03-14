/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import WhatsAppConsentSection from '../WhatsAppConsentSection';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockConsentData = {
  consentGiven: false,
  consentDate: null,
  consentMethod: null,
  withdrawnAt: null,
  language: 'en',
  phoneNumber: null,
  preferences: { medicationReminders: true, appointmentReminders: true, labResultsAlerts: true, preventiveCareAlerts: true, preferredContactTimeStart: null, preferredContactTimeEnd: null, doNotDisturb: false },
};

describe('WhatsAppConsentSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ data: mockConsentData }) });
  });

  it('shows loading skeleton initially', () => {
    mockFetch.mockImplementationOnce(() => new Promise(() => {}));
    render(<WhatsAppConsentSection />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders WhatsApp heading after load', async () => {
    render(<WhatsAppConsentSection />);
    await waitFor(() => expect(screen.getByText(/WhatsApp Adherence Monitoring/i)).toBeInTheDocument());
  });

  it('shows enable button when not enrolled', async () => {
    render(<WhatsAppConsentSection />);
    await waitFor(() => expect(screen.getByText(/Enable WhatsApp Reminders/i)).toBeInTheDocument());
  });
});
