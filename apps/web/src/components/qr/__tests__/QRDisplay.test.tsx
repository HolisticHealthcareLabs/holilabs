/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

jest.mock('@heroicons/react/24/outline', () => new Proxy({}, { get: () => () => null }));
jest.mock('next/image', () => ({ __esModule: true, default: ({ alt, ...p }: any) => <img alt={alt} {...p} /> }));

jest.mock('@/lib/qr/types', () => ({}));
jest.mock('@/lib/qr/generator', () => ({
  getTimeUntilExpiry: jest.fn().mockReturnValue(300),
  refreshQRCode: jest.fn(),
  isQRExpired: jest.fn().mockReturnValue(false),
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import QRDisplay from '../QRDisplay';

const mockPayload = {
  purpose: 'DEVICE_PAIRING',
  version: '1',
  expiresAt: Date.now() + 300000,
  sessionId: 'sess-1',
  clinicId: 'clinic-1',
} as any;

describe('QRDisplay', () => {
  it('renders the title', () => {
    render(<QRDisplay qrDataUrl="data:image/png;base64,abc" payload={mockPayload} title="Pair Device" />);
    expect(screen.getByText('Pair Device')).toBeInTheDocument();
  });

  it('renders the QR image', () => {
    render(<QRDisplay qrDataUrl="data:image/png;base64,abc" payload={mockPayload} />);
    expect(screen.getByAltText('QR Code')).toBeInTheDocument();
  });

  it('shows Refresh QR Code button when not expired', () => {
    render(<QRDisplay qrDataUrl="data:image/png;base64,abc" payload={mockPayload} />);
    expect(screen.getByText('Refresh QR Code')).toBeInTheDocument();
  });
});
