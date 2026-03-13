/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) =>
      React.forwardRef(({ children, ...rest }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<unknown>) => {
        const Tag = typeof prop === 'string' ? prop : 'div';
        return React.createElement(Tag, { ...rest, ref }, children);
      }),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock('@/styles/design-tokens', () => ({ designTokens: {} }));

const {
  EmptyState,
  NoPatientsState,
  NoAppointmentsState,
  ErrorState,
  SuccessState,
  NoResultsState,
} = require('../EmptyState');

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No results found" description="Try adjusting your search." />);
    expect(screen.getByText('No results found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search.')).toBeInTheDocument();
  });

  it('renders action button with onClick', () => {
    const handler = jest.fn();
    render(
      <EmptyState
        title="Empty"
        description="Nothing here."
        action={{ label: 'Add Item', onClick: handler }}
      />
    );
    fireEvent.click(screen.getByText('Add Item'));
    expect(handler).toHaveBeenCalled();
  });

  it('renders action as link when href provided', () => {
    render(
      <EmptyState
        title="Empty"
        description="Nothing here."
        action={{ label: 'Go to patients', href: '/dashboard/patients' }}
      />
    );
    const link = screen.getByRole('link', { name: /Go to patients/i });
    expect(link).toHaveAttribute('href', '/dashboard/patients');
  });
});

describe('NoPatientsState', () => {
  it('renders the no patients title', () => {
    render(<NoPatientsState />);
    expect(screen.getByText('No tienes pacientes registrados')).toBeInTheDocument();
  });
});

describe('NoAppointmentsState', () => {
  it('renders the no appointments title', () => {
    render(<NoAppointmentsState />);
    expect(screen.getByText('No hay citas programadas')).toBeInTheDocument();
  });
});

describe('ErrorState', () => {
  it('renders default error message', () => {
    render(<ErrorState />);
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
  });

  it('renders retry button and calls handler', () => {
    const handler = jest.fn();
    render(<ErrorState onRetry={handler} />);
    fireEvent.click(screen.getByText('Intentar de Nuevo'));
    expect(handler).toHaveBeenCalled();
  });
});

describe('SuccessState', () => {
  it('renders title and description', () => {
    render(<SuccessState title="Done!" description="Your changes were saved." />);
    expect(screen.getByText('Done!')).toBeInTheDocument();
    expect(screen.getByText('Your changes were saved.')).toBeInTheDocument();
  });
});

describe('NoResultsState', () => {
  it('renders query in title when provided', () => {
    render(<NoResultsState query="diabetes" />);
    expect(screen.getByText(/diabetes/)).toBeInTheDocument();
  });
});
