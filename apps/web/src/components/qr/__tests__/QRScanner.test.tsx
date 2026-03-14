/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

jest.mock('@heroicons/react/24/outline', () => new Proxy({}, { get: () => () => null }));

jest.mock('html5-qrcode', () => ({
  Html5Qrcode: jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn(),
  })),
}));

jest.mock('@/lib/qr/types', () => ({}));
jest.mock('@/lib/qr/generator', () => ({
  parseQRData: jest.fn(),
  validateQRPayload: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
}));

// Mock navigator.permissions
Object.defineProperty(global.navigator, 'permissions', {
  value: { query: jest.fn().mockResolvedValue({ state: 'denied' }) },
  writable: true,
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import QRScanner from '../QRScanner';

describe('QRScanner', () => {
  it('renders the Scan QR Code heading', () => {
    render(<QRScanner onScan={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByText('Scan QR Code')).toBeInTheDocument();
  });

  it('shows instruction text', () => {
    render(<QRScanner onScan={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByText('Position QR code within the frame')).toBeInTheDocument();
  });

  it('shows camera access required when permission is denied', async () => {
    render(<QRScanner onScan={jest.fn()} onClose={jest.fn()} />);
    // Wait for permission check to resolve
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText('Camera Access Required')).toBeInTheDocument();
  });
});
