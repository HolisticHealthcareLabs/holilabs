/** @jest-environment jsdom */
import React from 'react';
import { render, screen, act } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, tag: string) => tag }), AnimatePresence: ({ children }: any) => children }));
jest.mock('lucide-react', () => new Proxy({}, { get: (_, k) => () => null }));
jest.mock('@heroicons/react/24/outline', () => new Proxy({}, { get: (_, k) => () => null }));

import { OfflineDetector } from '../OfflineDetector';

beforeEach(() => jest.clearAllMocks());

describe('OfflineDetector', () => {
  it('renders nothing when online', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const { container } = render(<OfflineDetector />);
    expect(container.firstChild).toBeNull();
  });

  it('shows offline banner when window offline event fires', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    render(<OfflineDetector />);
    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(screen.getByText('Sin conexión a Internet')).toBeInTheDocument();
  });

  it('shows reconnected banner when back online', () => {
    jest.useFakeTimers();
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    render(<OfflineDetector />);
    act(() => { window.dispatchEvent(new Event('online')); });
    expect(screen.getByText('Conexión restaurada')).toBeInTheDocument();
    jest.useRealTimers();
  });
});
