/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, tag: string) => tag }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('@heroicons/react/24/outline', () => new Proxy({}, { get: (_, k) => () => null }));
jest.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({ attributes: {}, listeners: {}, setNodeRef: jest.fn(), transform: null }),
  DndContext: ({ children }: any) => <>{children}</>,
  DragOverlay: () => null,
  useSensor: jest.fn(() => ({})),
  useSensors: jest.fn((...args: any[]) => args),
  PointerSensor: jest.fn(),
  KeyboardSensor: jest.fn(),
  closestCenter: jest.fn(),
}));
jest.mock('@dnd-kit/utilities', () => ({ CSS: { Transform: { toString: jest.fn(() => '') } } }));
jest.mock('@/components/qr/QRDisplay', () => ({ __esModule: true, default: () => <div>QRDisplay</div> }));
jest.mock('@/components/qr/QRScanner', () => ({ __esModule: true, default: () => <div>QRScanner</div> }));
jest.mock('@/lib/qr', () => ({
  createDevicePairingQR: jest.fn(() => Promise.resolve({ dataUrl: 'data:image/png;base64,abc', payload: { purpose: 'DEVICE_PAIRING', deviceId: 'dev-1' } })),
}));

import QRPairingTile from '../QRPairingTile';

beforeEach(() => jest.clearAllMocks());

describe('QRPairingTile', () => {
  it('renders Device Pairing title', () => {
    render(<QRPairingTile />);
    expect(screen.getByText('Device Pairing')).toBeInTheDocument();
  });

  it('shows 0 devices connected by default', () => {
    render(<QRPairingTile />);
    expect(screen.getByText('0 devices connected')).toBeInTheDocument();
  });

  it('renders QR mode selection buttons', () => {
    render(<QRPairingTile />);
    expect(screen.getByText('Display QR Code')).toBeInTheDocument();
    expect(screen.getByText('Scan QR Code')).toBeInTheDocument();
  });
});
