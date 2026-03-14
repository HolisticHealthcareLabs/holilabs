/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_: any, tag: string) => tag }),
  AnimatePresence: ({ children }: any) => children,
}));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

beforeEach(() => {
  global.fetch = jest.fn((url: string) => {
    if (url.includes('sidecar/latest')) {
      return Promise.resolve({ json: () => Promise.resolve({ assets: {} }) });
    }
    if (url.includes('api-keys')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  }) as jest.Mock;
});

const { DownloadClient } = require('../DownloadClient');

describe('DownloadClient', () => {
  it('renders the Deploy the Desktop Companion heading', async () => {
    render(<DownloadClient />);
    expect(screen.getByText(/deploy the/i)).toBeInTheDocument();
    expect(screen.getByText(/desktop companion/i)).toBeInTheDocument();
  });

  it('renders macOS and Windows download sections', () => {
    render(<DownloadClient />);
    expect(screen.getByText('macOS')).toBeInTheDocument();
    expect(screen.getByText('Windows')).toBeInTheDocument();
  });

  it('shows no active tokens message when keys list is empty', async () => {
    render(<DownloadClient />);
    await waitFor(() =>
      expect(screen.getByText(/no active tokens yet/i)).toBeInTheDocument()
    );
  });
});
