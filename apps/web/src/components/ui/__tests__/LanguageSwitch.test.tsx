/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const reloadMock = jest.fn();
Object.defineProperty(window, 'location', {
  value: { reload: reloadMock },
  writable: true,
});

const { LanguageSwitch } = require('../LanguageSwitch');

beforeEach(() => {
  localStorageMock.clear();
  reloadMock.mockClear();
});

describe('LanguageSwitch', () => {
  it('renders the language button after mount', async () => {
    await act(async () => {
      render(<LanguageSwitch />);
    });
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows EN label by default', async () => {
    await act(async () => {
      render(<LanguageSwitch />);
    });
    expect(screen.getByText('EN')).toBeInTheDocument();
  });

  it('reads language from localStorage on mount', async () => {
    localStorageMock.setItem('locale', 'es');
    await act(async () => {
      render(<LanguageSwitch />);
    });
    expect(screen.getByText('ES')).toBeInTheDocument();
  });

  it('calls reload when language is toggled', async () => {
    await act(async () => {
      render(<LanguageSwitch />);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(reloadMock).toHaveBeenCalled();
  });
});
