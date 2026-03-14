/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_: any, tag: string) => tag }),
  AnimatePresence: ({ children }: any) => children,
}));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

const { DownloadGated } = require('../DownloadGated');

describe('DownloadGated', () => {
  it('renders the Access Restricted heading and request form', () => {
    render(<DownloadGated />);
    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Full Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Clinical Email Address')).toBeInTheDocument();
  });

  it('shows loading state while submitting the form', async () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;
    render(<DownloadGated />);
    fireEvent.change(screen.getByPlaceholderText('Full Name'), { target: { value: 'Dr. Test' } });
    fireEvent.change(screen.getByPlaceholderText('Clinical Email Address'), { target: { value: 'test@hospital.com' } });
    fireEvent.click(screen.getByRole('button', { name: /request invitation/i }));
    await waitFor(() =>
      expect(screen.getByText(/processing/i)).toBeInTheDocument()
    );
  });

  it('shows success state after a successful invite request', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ message: 'ok' }) })
    ) as jest.Mock;
    render(<DownloadGated />);
    fireEvent.change(screen.getByPlaceholderText('Full Name'), { target: { value: 'Dr. Test' } });
    fireEvent.change(screen.getByPlaceholderText('Clinical Email Address'), { target: { value: 'test@hospital.com' } });
    fireEvent.click(screen.getByRole('button', { name: /request invitation/i }));
    await waitFor(() =>
      expect(screen.getByText('Request Received')).toBeInTheDocument()
    );
  });
});
