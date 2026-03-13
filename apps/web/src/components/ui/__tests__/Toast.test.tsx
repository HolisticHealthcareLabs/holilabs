/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('lucide-react', () => ({
  X: () => <div data-testid="x-icon" />,
}));

const {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastProvider,
  ToastViewport,
} = require('../Toast');

describe('Toast', () => {
  it('renders ToastTitle with text', () => {
    render(
      <ToastProvider>
        <Toast open>
          <ToastTitle>Alert message</ToastTitle>
        </Toast>
        <ToastViewport />
      </ToastProvider>
    );
    expect(screen.getByText('Alert message')).toBeInTheDocument();
  });

  it('renders ToastDescription with text', () => {
    render(
      <ToastProvider>
        <Toast open>
          <ToastDescription>Detail text</ToastDescription>
        </Toast>
        <ToastViewport />
      </ToastProvider>
    );
    expect(screen.getByText('Detail text')).toBeInTheDocument();
  });

  it('renders destructive variant without crashing', () => {
    render(
      <ToastProvider>
        <Toast open variant="destructive">
          <ToastTitle>Error</ToastTitle>
        </Toast>
        <ToastViewport />
      </ToastProvider>
    );
    expect(screen.getByText('Error')).toBeInTheDocument();
  });
});
