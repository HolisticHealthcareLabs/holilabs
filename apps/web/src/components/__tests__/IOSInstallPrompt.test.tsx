/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';

jest.mock('@heroicons/react/24/outline', () => ({
  XMarkIcon: (props: any) => <svg data-testid="x-icon" {...props} />,
  ArrowUpTrayIcon: (props: any) => <svg data-testid="arrow-icon" {...props} />,
}));

const { IOSInstallPrompt } = require('../IOSInstallPrompt');

describe('IOSInstallPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      configurable: true,
    });
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  it('renders without crashing', () => {
    const { container } = render(<IOSInstallPrompt />);
    expect(container).toBeTruthy();
  });

  it('returns null on non-iOS device', () => {
    const { container } = render(<IOSInstallPrompt />);
    expect(container.innerHTML).toBe('');
  });
});
