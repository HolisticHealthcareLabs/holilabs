/** @jest-environment jsdom */
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BulkActionToolbar from '../BulkActionToolbar';

const defaultProps = {
  selectedCount: 0,
  selectedIds: [],
  onClearSelection: jest.fn(),
  onBulkActivate: jest.fn().mockResolvedValue(undefined),
  onBulkDeactivate: jest.fn().mockResolvedValue(undefined),
  onBulkDelete: jest.fn().mockResolvedValue(undefined),
  onBulkExport: jest.fn().mockResolvedValue(undefined),
};

describe('BulkActionToolbar', () => {
  it('renders nothing when selectedCount is 0', () => {
    const { container } = render(<BulkActionToolbar {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows toolbar with count when items are selected', () => {
    render(<BulkActionToolbar {...defaultProps} selectedCount={3} selectedIds={['a', 'b', 'c']} />);
    expect(screen.getByText(/3 seleccionadas/i)).toBeInTheDocument();
  });

  it('shows delete confirmation modal on delete click', () => {
    render(<BulkActionToolbar {...defaultProps} selectedCount={2} selectedIds={['a', 'b']} />);
    fireEvent.click(screen.getByTitle(/Eliminar seleccionadas/i));
    expect(screen.getByText(/Confirmar Eliminación/i)).toBeInTheDocument();
  });
});
