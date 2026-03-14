/** @jest-environment jsdom */
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import QuickActionsPanel from '../QuickActionsPanel';

describe('QuickActionsPanel', () => {
  it('renders title when showTitle is true', () => {
    render(<QuickActionsPanel />);
    expect(screen.getByText('Acciones Rápidas')).toBeInTheDocument();
  });

  it('hides title when showTitle is false', () => {
    render(<QuickActionsPanel showTitle={false} />);
    expect(screen.queryByText('Acciones Rápidas')).toBeNull();
  });

  it('respects maxActions limit', () => {
    render(<QuickActionsPanel maxActions={3} />);
    expect(screen.getByText('Ver todas las acciones →')).toBeInTheDocument();
  });
});
