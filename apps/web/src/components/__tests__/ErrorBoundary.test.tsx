/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}));

const { ErrorBoundary, SectionErrorFallback } = require('../ErrorBoundary');

// A component that throws on render
function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test explosion');
  return <div>Safe content</div>;
}

// Suppress React error boundary console.error noise in tests
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  (console.error as jest.Mock).mockRestore();
});

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Hello world</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders default fallback UI when child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn();
    render(
      <ErrorBoundary onError={onError}>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );
    expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.any(Object));
  });
});

describe('SectionErrorFallback', () => {
  it('renders default title', () => {
    render(<SectionErrorFallback />);
    expect(screen.getByText('Error en esta sección')).toBeInTheDocument();
  });

  it('renders custom title', () => {
    render(<SectionErrorFallback title="Custom Section Error" />);
    expect(screen.getByText('Custom Section Error')).toBeInTheDocument();
  });

  it('shows retry button when onRetry provided', () => {
    const onRetry = jest.fn();
    render(<SectionErrorFallback onRetry={onRetry} />);
    fireEvent.click(screen.getByText('Reintentar →'));
    expect(onRetry).toHaveBeenCalled();
  });
});
