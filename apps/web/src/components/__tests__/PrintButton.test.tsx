/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@heroicons/react/24/outline', () => ({
  PrinterIcon: ({ className }: { className?: string }) => (
    <svg data-testid="printer-icon" className={className} />
  ),
}));

const printMock = jest.fn();
Object.defineProperty(window, 'print', { value: printMock, writable: true });

beforeEach(() => {
  jest.useFakeTimers();
  printMock.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

const { PrintButton } = require('../PrintButton');

describe('PrintButton', () => {
  it('renders Imprimir label by default', () => {
    render(<PrintButton />);
    expect(screen.getByText('Imprimir')).toBeInTheDocument();
  });

  it('renders printer icon', () => {
    render(<PrintButton />);
    expect(screen.getByTestId('printer-icon')).toBeInTheDocument();
  });

  it('calls window.print after clicking', () => {
    render(<PrintButton />);
    fireEvent.click(screen.getByRole('button'));
    jest.runAllTimers();
    expect(printMock).toHaveBeenCalled();
  });

  it('calls onBeforePrint callback', () => {
    const before = jest.fn();
    render(<PrintButton onBeforePrint={before} />);
    fireEvent.click(screen.getByRole('button'));
    expect(before).toHaveBeenCalled();
  });

  it('hides label in icon-only variant', () => {
    render(<PrintButton variant="icon-only" />);
    expect(screen.queryByText('Imprimir')).not.toBeInTheDocument();
  });
});
