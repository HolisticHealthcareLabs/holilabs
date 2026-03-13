/** @jest-environment jsdom */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

Object.defineProperty(navigator, 'onLine', {
  configurable: true,
  get: () => true,
});

import OfflineIndicator from '../OfflineIndicator';

describe('OfflineIndicator', () => {
  it('renders without visible offline indicator when online', () => {
    render(<OfflineIndicator />);
    expect(screen.queryByText('Sin conexión')).not.toBeInTheDocument();
  });

  it('shows offline indicator when browser goes offline', async () => {
    render(<OfflineIndicator />);
    await act(async () => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByText('Sin conexión')).toBeInTheDocument();
  });

  it('shows connection restored toast when coming back online', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    render(<OfflineIndicator />);
    await act(async () => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.getByText('Conexión restaurada')).toBeInTheDocument();
  });
});
